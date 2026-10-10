-- Additive: no ERP tables, triggers, policies, functions or webhooks are changed.
begin;
create schema article_approval;
revoke all on schema article_approval from public;
create role pdcar_article_worker nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
grant usage on schema article_approval to pdcar_article_worker;

create table article_approval.drafts (
  id uuid primary key default gen_random_uuid(),
  article_date date not null unique,
  slug text not null unique,
  status text not null default 'generating' check (status in ('generating','failed','pending','published','rejected','unpublished','deleted')),
  content jsonb,
  content_hash text unique,
  sources jsonb not null default '[]',
  version integer not null default 1,
  attempts integer not null default 1,
  lease_token uuid,
  lease_until timestamptz,
  error_code text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('pending','published','rejected','unpublished') or content is not null),
  check (status <> 'published' or published_at is not null)
);
create table article_approval.deliveries (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references article_approval.drafts(id),
  recipient text not null,
  payload jsonb not null,
  retry_key uuid not null default gen_random_uuid(),
  first_attempt_at timestamptz,
  sent_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  error_code text,
  unique(article_id, recipient)
);
create table article_approval.decisions (
  event_id text primary key,
  article_id uuid not null references article_approval.drafts(id),
  actor text not null,
  action text not null,
  from_status text not null,
  to_status text not null,
  created_at timestamptz not null default now()
);
create index on article_approval.drafts (published_at desc) where status = 'published';
alter table article_approval.drafts enable row level security;
alter table article_approval.deliveries enable row level security;
alter table article_approval.decisions enable row level security;
revoke all on all tables in schema article_approval from public, anon, authenticated;
-- Worker can inspect ONLY this schema. All mutations go through the functions below.
grant select on all tables in schema article_approval to pdcar_article_worker;
create policy article_worker_read on article_approval.drafts for select to pdcar_article_worker using (true);
create policy article_worker_read on article_approval.deliveries for select to pdcar_article_worker using (true);
create policy article_worker_read on article_approval.decisions for select to pdcar_article_worker using (true);

-- Owner-backed, filtered view exposes no drafts, LINE identities or delivery metadata.
create view public.public_approved_articles with (security_barrier = true) as
  select id, article_date, slug, content, sources, published_at, updated_at
  from article_approval.drafts where status = 'published';
revoke all on public.public_approved_articles from public, anon, authenticated;
grant select on public.public_approved_articles to anon, authenticated;

create function article_approval.claim_day(p_day date, p_token uuid)
returns setof article_approval.drafts language plpgsql security definer set search_path = '' as $$
begin
  return query
    insert into article_approval.drafts(article_date, slug, lease_token, lease_until)
    values(p_day, 'car-knowledge-' || p_day::text, p_token, now() + interval '10 minutes')
    on conflict(article_date) do update
      set status = 'generating', attempts = drafts.attempts + 1, lease_token = p_token,
          lease_until = now() + interval '10 minutes', updated_at = now(), error_code = null
      where drafts.status in ('failed','generating') and drafts.attempts < 3
        and (drafts.lease_until is null or drafts.lease_until < now())
    returning *;
end $$;

create function article_approval.save_draft(p_id uuid, p_token uuid, p_content jsonb, p_sources jsonb, p_hash text, p_deliveries jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update article_approval.drafts set content = p_content, sources = p_sources, content_hash = p_hash,
    status = 'pending', lease_token = null, lease_until = null, updated_at = now()
    where id = p_id and status = 'generating' and lease_token = p_token and lease_until > now();
  if not found then return false; end if;
  insert into article_approval.deliveries(article_id, recipient, payload)
    select p_id, x->>'recipient', x->'payload' from jsonb_array_elements(p_deliveries) x;
  return true;
end $$;

create function article_approval.fail_draft(p_id uuid, p_token uuid, p_code text)
returns void language sql security definer set search_path = '' as $$
  update article_approval.drafts set status = 'failed', error_code = p_code, lease_token = null, lease_until = null, updated_at = now()
    where id = p_id and status = 'generating' and lease_token = p_token;
$$;

create function article_approval.claim_delivery(p_id uuid, p_token uuid)
returns setof article_approval.deliveries language sql security definer set search_path = '' as $$
  update article_approval.deliveries d set lease_token = p_token, lease_until = now() + interval '2 minutes',
    first_attempt_at = coalesce(first_attempt_at, now()), attempts = attempts + 1
  where d.id = p_id and sent_at is null and (lease_until is null or lease_until < now())
    -- LINE retry keys last 24 hours. Never blindly resend an ambiguous request after that window.
    and (first_attempt_at is null or first_attempt_at > now() - interval '23 hours')
    and exists(select 1 from article_approval.drafts a where a.id = d.article_id and a.status = 'pending')
  returning d.*;
$$;

create function article_approval.finish_delivery(p_id uuid, p_token uuid, p_success boolean, p_code text)
returns void language sql security definer set search_path = '' as $$
  update article_approval.deliveries set sent_at = case when p_success then now() else sent_at end,
    error_code = p_code, lease_token = null, lease_until = null
  where id = p_id and lease_token = p_token;
$$;

create function article_approval.decide(p_id uuid, p_actor text, p_action text, p_version integer, p_event text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a article_approval.drafts; e article_approval.decisions; next_status text;
begin
  select * into a from article_approval.drafts where id = p_id for update;
  if not found then return jsonb_build_object('result','not_found'); end if;
  select * into e from article_approval.decisions where event_id = p_event;
  if found then
    if e.article_id <> p_id or e.actor <> p_actor or e.action <> p_action then
      return jsonb_build_object('result','conflict');
    end if;
    return jsonb_build_object('result','duplicate','status',a.status,'version',a.version);
  end if;
  if a.version <> p_version then return jsonb_build_object('result','conflict','status',a.status,'version',a.version); end if;
  next_status := case
    when p_action = 'approve' and a.status = 'pending' then 'published'
    when p_action = 'reject' and a.status = 'pending' then 'rejected'
    when p_action = 'unpublish' and a.status = 'published' then 'unpublished'
    when p_action = 'republish' and a.status = 'unpublished' then 'published'
    when p_action = 'delete' and a.status in ('pending','published','rejected','unpublished','failed') then 'deleted'
    else null end;
  if next_status is null then return jsonb_build_object('result','conflict','status',a.status,'version',a.version); end if;
  insert into article_approval.decisions(event_id, article_id, actor, action, from_status, to_status)
    values(p_event,p_id,p_actor,p_action,a.status,next_status);
  update article_approval.drafts set status = next_status, version = version + 1, updated_at = now(),
    published_at = case when next_status = 'published' then coalesce(published_at, now()) else published_at end
    where id = p_id;
  return jsonb_build_object('result','applied','status',next_status,'version',a.version + 1);
end $$;

revoke all on all functions in schema article_approval from public, anon, authenticated;
grant execute on all functions in schema article_approval to pdcar_article_worker;
-- Provision a dedicated LOGIN member of pdcar_article_worker separately, with a password outside Git.
-- Do not use postgres, authenticator, service_role, or the ERP database login in the website.
commit;
