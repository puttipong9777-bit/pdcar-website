-- Public website reads plus explicitly approved, signature-gated ERP ingress only.
-- Apply separately after review; website builds do not apply migrations.
begin;

-- Fail atomically on a wrong target/schema rather than silently losing an ingress.
do $$
declare signature text;
begin
  if not exists (select 1 from pg_class where oid = to_regclass('public.public_vehicle_listings') and relkind = 'v')
     or not exists (select 1 from pg_class where oid = to_regclass('public.public_approved_articles') and relkind = 'v') then
    raise exception 'Both public website views must already exist';
  end if;
  foreach signature in array array[
    'public.apply_messenger_message_receipts(text,text)',
    'public.claim_crm_follow_up_alert_pushes(text,text)',
    'public.complete_crm_follow_up_alert_pushes(text,text)',
    'public.ingest_facebook_comments_webhook(text,text)',
    'public.ingest_instagram_webhook(text,text)',
    'public.ingest_line_webhook(text,text)',
    'public.ingest_messenger_webhook(text,text)',
    'public.ingest_meta_ad_daily_snapshots(text,text)',
    'public.ingest_website_chat_webhook(text,text,text)',
    'public.list_messenger_push_targets(text,text,text)'
  ] loop
    if to_regprocedure(signature) is null then
      raise exception 'Required signed RPC missing: %', signature;
    end if;
  end loop;
end $$;

-- Preserve effective authenticated/service_role access inherited from PUBLIC,
-- without broadening access to objects that were not public. Existing explicit
-- grants (including grant options) are untouched. No CASCADE is used.
do $$
declare entry record;
begin
  for entry in
    select case when c.relkind = 'S' then 'sequence' else 'table' end as kind,
           format('%I.%I', n.nspname, c.relname) as target, a.privilege_type as privilege
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(coalesce(c.relacl, acldefault(case when c.relkind = 'S' then 's'::"char" else 'r'::"char" end, c.relowner))) a
    where n.nspname = 'public' and c.relkind in ('r','p','v','m','f','S') and a.grantee = 0
    union all
    select 'function', format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), a.privilege_type
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where n.nspname = 'public' and p.prokind <> 'p' and a.grantee = 0
  loop
    execute format('grant %s on %s %s to authenticated, service_role', entry.privilege, entry.kind, entry.target);
  end loop;
  -- Column ACLs survive table-level REVOKE; preserve PUBLIC-derived access for
  -- the two trusted roles before removing those separate anonymous grants.
  for entry in
    select format('%I.%I', n.nspname, c.relname) as target, att.attname, a.privilege_type as privilege
    from pg_attribute att join pg_class c on c.oid = att.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(att.attacl) a
    where n.nspname = 'public' and att.attnum > 0 and not att.attisdropped and a.grantee = 0
  loop
    execute format('grant %s (%I) on table %s to authenticated, service_role', entry.privilege, entry.attname, entry.target);
  end loop;
end $$;

revoke all privileges on all tables in schema public from public, anon;
revoke all privileges on all sequences in schema public from public, anon;
revoke execute on all functions in schema public from public, anon;
do $$
declare entry record;
begin
  for entry in
    select distinct format('%I.%I', n.nspname, c.relname) as target, att.attname
    from pg_attribute att join pg_class c on c.oid = att.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(att.attacl) a
    where n.nspname = 'public' and att.attnum > 0 and not att.attisdropped
      and a.grantee in (0, 'anon'::regrole::oid)
  loop
    execute format('revoke all privileges (%I) on table %s from public, anon', entry.attname, entry.target);
  end loop;
end $$;

-- These deliberately owner-backed (security-definer) public views select only
-- website-safe columns and published rows. Do not switch them to invoker access:
-- anon intentionally has no access to their private underlying relations.
-- View definitions, owners, data and RLS are not changed by this migration.
grant select on public.public_vehicle_listings, public.public_approved_articles to anon;

-- Exact signatures only: each existing body must validate its HMAC/signature
-- before privileged work. Public keys alone must not authorize those writes.
-- No other overload is allowed; this migration does not redefine the functions.
grant execute on function
  public.apply_messenger_message_receipts(text,text),
  public.claim_crm_follow_up_alert_pushes(text,text),
  public.complete_crm_follow_up_alert_pushes(text,text),
  public.ingest_facebook_comments_webhook(text,text),
  public.ingest_instagram_webhook(text,text),
  public.ingest_line_webhook(text,text),
  public.ingest_messenger_webhook(text,text),
  public.ingest_meta_ad_daily_snapshots(text,text),
  public.ingest_website_chat_webhook(text,text,text),
  public.list_messenger_push_targets(text,text,text)
  to anon;

-- Schema defaults are additive: a schema-only REVOKE cannot remove the global
-- built-in PUBLIC EXECUTE default (or any explicit global anon grant). Remove
-- both global and public-schema defaults. Global changes affect future objects
-- in other schemas too; their existing objects and schema-specific ACLs remain.
do $$
declare owner_name text; entry record;
begin
  foreach owner_name in array array['postgres', 'supabase_admin'] loop
    if owner_name = 'supabase_admin' and not coalesce(pg_has_role(current_user, to_regrole(owner_name), 'MEMBER'), false) then
      raise warning 'Skipping supabase_admin defaults: current user is not a member; platform-owned future objects require separate review';
      continue;
    end if;
    -- Keep trusted roles' effective PUBLIC-derived defaults, including the
    -- implicit global function EXECUTE default when no default ACL row exists.
    for entry in
      select case when scope.oid = 0 then '' else ' in schema public' end as scope_sql,
             case kind.code when 'r' then 'tables' when 'S' then 'sequences' else 'functions' end as kind,
             a.privilege_type as privilege
      from (values (0::oid), ('public'::regnamespace::oid)) scope(oid)
      cross join (values ('r'::"char"), ('S'::"char"), ('f'::"char")) kind(code)
      left join pg_default_acl d on d.defaclrole = to_regrole(owner_name) and d.defaclnamespace = scope.oid and d.defaclobjtype = kind.code
      cross join lateral aclexplode(coalesce(d.defaclacl, case when scope.oid = 0 then acldefault(case when kind.code = 'S' then 's'::"char" else kind.code end, to_regrole(owner_name)) else '{}'::aclitem[] end)) a
      where a.grantee = 0
    loop
      execute format('alter default privileges for role %I%s grant %s on %s to authenticated, service_role', owner_name, entry.scope_sql, entry.privilege, entry.kind);
    end loop;
    execute format('alter default privileges for role %I revoke all on tables from public, anon', owner_name);
    execute format('alter default privileges for role %I revoke all on sequences from public, anon', owner_name);
    execute format('alter default privileges for role %I revoke execute on functions from public, anon', owner_name);
    execute format('alter default privileges for role %I in schema public revoke all on tables from public, anon', owner_name);
    execute format('alter default privileges for role %I in schema public revoke all on sequences from public, anon', owner_name);
    execute format('alter default privileges for role %I in schema public revoke execute on functions from public, anon', owner_name);
  end loop;
end $$;

-- Unexpected inherited/owner permissions must not turn a successful migration
-- into a false assurance. Do not alter role memberships; abort for review.
do $$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p','v','m','f')
      and (has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or has_any_column_privilege('anon', c.oid, 'INSERT,UPDATE,REFERENCES')
        or (c.oid not in ('public.public_vehicle_listings'::regclass, 'public.public_approved_articles'::regclass)
          and (has_table_privilege('anon', c.oid, 'SELECT') or has_any_column_privilege('anon', c.oid, 'SELECT'))))
  ) or exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'S'
      and case when c.relkind = 'S' then has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE') else false end
  ) or exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind <> 'p'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (select 1 from aclexplode(p.proacl) a
        where a.grantee = 'anon'::regrole and a.privilege_type = 'EXECUTE')
  ) then
    raise exception 'Unexpected inherited anon privileges remain; review role memberships/ownership';
  end if;
end $$;

commit;
