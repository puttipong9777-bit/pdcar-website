# Public Supabase permission boundary

Migration: `supabase/migrations/20261017083434_public_anon_boundary.sql`.
This is a separately applied database migration, not part of the website build.
Committing or pushing it does not apply it. No production SQL was run to develop it.

## Behavior and compatibility

- Remove PUBLIC and anon relation/column privileges in schema public; grant anon SELECT only on `public_vehicle_listings` and `public_approved_articles`. Remove all public-sequence privileges from PUBLIC and anon.
- Remove PUBLIC/anon EXECUTE from existing public functions. Re-grant anon EXECUTE to exactly the ten signature-gated ERP entry points named in the migration. All ten signatures and both views must exist, otherwise the transaction aborts. Other overloads remain inaccessible.
- These two deliberately owner-backed (security-definer) views expose approved public columns and published rows while their base tables remain private. Do not convert them to invoker views or grant anon base-table access. The migration does not modify view definitions, data, function bodies, RLS, owners or credentials.
- Keep explicit authenticated/service_role grants and grant options. Where those roles currently inherit PUBLIC access, materialize that same access as explicit grants before removing PUBLIC. This preserves their effective permissions without granting access to previously restricted objects.
- Remove postgres global and public-schema automatic grants to PUBLIC/anon for tables, sequences and functions. Preserve explicit trusted-role defaults and materialize their PUBLIC-derived defaults. PostgreSQL schema defaults are additive: removing the implicit global PUBLIC function EXECUTE grant necessarily changes defaults for future objects in other schemas as well. Existing objects outside public and other schema-specific grants are untouched.
- Apply the same defaults to supabase_admin **only if the applying role has membership**. The live postgres role is not a member, so this step emits a warning and skips. Platform-owned future objects remain a residual risk until an authorized platform owner hardens its defaults. Existing-object revokes still apply; current risky views are owned by postgres.
- Signed RPCs intentionally can perform privileged operations after signature verification. This boundary denies direct anonymous writes, not every possible signed operation. The production HMAC implementations are not defined in this repository and are not validated by the fixture tests. No signing secret belongs in Preview.

Before separate application, inspect current view columns/filters and signature checks; capture rollback SQL below; review anon role memberships and effective grants. An owner/member capable of changing the targeted existing objects must apply the migration. No CASCADE is used: dependent grants or inaccessible objects should be reviewed, not silently removed. Anonymous consumers of any other public view, function, table or sequence will stop working by design. Re-created functions need a deliberate grant review. Authenticated ERP behavior should remain unchanged.

The local PGlite tests execute the actual SQL twice, check effective trusted permissions, direct and column-level anonymous access, exact overloads, future-object defaults, the platform membership guard, missing-RPC atomic failure, and generated emergency rollback. They use synthetic data and stub functions, not production data or webhook requests.

## Emergency compatibility rollback

Rollback restores the insecure anonymous/PUBLIC boundary and is **only for emergency compatibility**, never the normal next step. First remove the Preview public-data configuration and rebuild the preview if rollback becomes necessary. A git revert alone does not undo database permissions.

Before applying the migration, run this read-only SQL and save its `rollback_sql` output in a restricted operational record. It emits concrete SQL restoring only the PUBLIC/anon grants and defaults that existed at capture time (including implicit PUBLIC function EXECUTE). Do not run the generator after hardening and assume it reconstructs the past. It excludes inaccessible supabase_admin defaults because the migration skips those too. No credential or row data is included.

<!-- rollback-generator -->
```sql
with object_grants as (
  select case when c.relkind = 'S' then 'sequence' else 'table' end as kind,
         format('%I.%I',n.nspname,c.relname) as target, a.*
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  cross join lateral aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 's'::"char" else 'r'::"char" end,c.relowner))) a
  where n.nspname='public' and c.relkind in ('r','p','v','m','f','S')
  union all
  select 'function', format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), a.*
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where n.nspname='public' and p.prokind<>'p'
), statements as (
  select format('GRANT %s ON %s %s TO %s%s;', privilege_type,kind,target,
    case when grantee=0 then 'PUBLIC' else 'anon' end,
    case when is_grantable then ' WITH GRANT OPTION' else '' end) as sql
  from object_grants where grantee in (0,'anon'::regrole)
  union all
  select format('GRANT %s (%I) ON TABLE %I.%I TO %s%s;',a.privilege_type,att.attname,n.nspname,c.relname,
    case when a.grantee=0 then 'PUBLIC' else 'anon' end,
    case when a.is_grantable then ' WITH GRANT OPTION' else '' end)
  from pg_attribute att join pg_class c on c.oid=att.attrelid
  join pg_namespace n on n.oid=c.relnamespace
  cross join lateral aclexplode(att.attacl) a
  where n.nspname='public' and att.attnum>0 and not att.attisdropped and a.grantee in (0,'anon'::regrole)
  union all
  select format('ALTER DEFAULT PRIVILEGES FOR ROLE %I%s GRANT %s ON %s TO %s%s;',owner_name,
    case when scope.oid=0 then '' else ' IN SCHEMA public' end,a.privilege_type,
    case kind.code when 'r' then 'TABLES' when 'S' then 'SEQUENCES' else 'FUNCTIONS' end,
    case when a.grantee=0 then 'PUBLIC' else 'anon' end,
    case when a.is_grantable then ' WITH GRANT OPTION' else '' end)
  from (values ('postgres'),('supabase_admin')) owners(owner_name)
  cross join (values (0::oid),('public'::regnamespace::oid)) scope(oid)
  cross join (values ('r'::"char"),('S'::"char"),('f'::"char")) kind(code)
  left join pg_default_acl d on d.defaclrole=to_regrole(owner_name) and d.defaclnamespace=scope.oid and d.defaclobjtype=kind.code
  cross join lateral aclexplode(coalesce(d.defaclacl,case when scope.oid=0 then acldefault(case when kind.code='S' then 's'::"char" else kind.code end,to_regrole(owner_name)) else '{}'::aclitem[] end)) a
  where a.grantee in (0,'anon'::regrole)
    and coalesce(pg_has_role(current_user,to_regrole(owner_name),'MEMBER'),false)
)
select 'BEGIN;' || E'\n' || string_agg(sql,E'\n' order by sql) || E'\nCOMMIT;' as rollback_sql
from statements;
```

For a separately approved emergency, execute the saved SQL transaction using the same authorized role, then verify the affected consumer. This restores the captured access, not the exact historical ACL representation: trusted-role grants materialized from PUBLIC are deliberately retained, since removing them could remove valid later grants. Objects created after the snapshot are not covered. Do not blindly grant ALL to anon or replay an entire schema dump.

## Preview follow-up (not performed by this migration)

After the live permission boundary is independently verified, configure only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the existing public URL and publishable/anon key for the preview build. Preserve `SITE_ENV=preview`, every disabled feature flag, and empty privileged bindings. Rebuild and check real published inventory, images, approved articles, noindex/robots, and disabled admin/write routes. Never add a service-role key, HMAC secret, database URL or ERP credential.

References: [PostgreSQL default privilege semantics](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html), [Supabase function permissions](https://supabase.com/docs/guides/database/functions).
