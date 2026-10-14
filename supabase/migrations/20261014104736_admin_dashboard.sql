-- Private, first-party analytics and manual article editing for the PD Car Center admin.
-- No IP address, user agent, contact detail, or advertising identifier is stored.
begin;

create schema if not exists site_admin;
revoke all on schema site_admin from public;
grant usage on schema site_admin to pdcar_article_worker;

create table site_admin.analytics_events (
  event_id uuid primary key,
  session_id uuid not null,
  event_name text not null check (event_name in ('page_view','vehicle_view','gallery_swipe','phone_click','line_click')),
  path text not null check (path ~ '^/' and char_length(path) <= 240),
  car_id text check (car_id is null or (char_length(car_id) between 1 and 80 and car_id ~ '^[A-Za-z0-9_-]+$')),
  event_day date not null default ((now() at time zone 'Asia/Bangkok')::date),
  occurred_at timestamptz not null default now()
);
create index analytics_events_day_name_idx on site_admin.analytics_events (event_day desc, event_name);
create index analytics_events_vehicle_idx on site_admin.analytics_events (event_day desc, car_id) where car_id is not null;
alter table site_admin.analytics_events enable row level security;
revoke all on site_admin.analytics_events from public, anon, authenticated;
grant select on site_admin.analytics_events to pdcar_article_worker;
create policy site_worker_read on site_admin.analytics_events for select to pdcar_article_worker using (true);

create function site_admin.record_event(
  p_event_id uuid,
  p_session_id uuid,
  p_event_name text,
  p_path text,
  p_car_id text default null
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_name not in ('page_view','vehicle_view','gallery_swipe','phone_click','line_click')
     or p_path !~ '^/' or char_length(p_path) > 240
     or (p_car_id is not null and (char_length(p_car_id) not between 1 and 80 or p_car_id !~ '^[A-Za-z0-9_-]+$')) then
    return false;
  end if;
  insert into site_admin.analytics_events(event_id, session_id, event_name, path, car_id)
  values(p_event_id, p_session_id, p_event_name, p_path, p_car_id)
  on conflict(event_id) do nothing;
  return true;
end $$;
revoke all on function site_admin.record_event(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function site_admin.record_event(uuid,uuid,text,text,text) to pdcar_article_worker;

-- Generated articles retain one draft per day. Manual articles may be added at any time.
alter table article_approval.drafts add column source_type text not null default 'generated'
  check (source_type in ('generated','manual'));
alter table article_approval.drafts drop constraint if exists drafts_article_date_key;
create unique index drafts_one_generated_per_day_idx on article_approval.drafts (article_date)
  where source_type = 'generated';

create or replace function article_approval.claim_day(p_day date, p_token uuid)
returns setof article_approval.drafts language plpgsql security definer set search_path = '' as $$
begin
  return query
    insert into article_approval.drafts(article_date, slug, source_type, lease_token, lease_until)
    values(p_day, 'car-knowledge-' || p_day::text, 'generated', p_token, now() + interval '10 minutes')
    on conflict(article_date) where source_type = 'generated' do update
      set status = 'generating', attempts = drafts.attempts + 1, lease_token = p_token,
          lease_until = now() + interval '10 minutes', updated_at = now(), error_code = null
      where drafts.status in ('failed','generating') and drafts.attempts < 3
        and (drafts.lease_until is null or drafts.lease_until < now())
    returning *;
end $$;

create function article_approval.save_manual(
  p_id uuid,
  p_actor text,
  p_article_date date,
  p_slug text,
  p_content jsonb,
  p_version integer,
  p_event text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a article_approval.drafts;
  prior article_approval.decisions;
  previous_status text;
begin
  select * into prior from article_approval.decisions where event_id = p_event;
  if found then
    return jsonb_build_object('result','duplicate','id',prior.article_id);
  end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) not between 3 and 100
     or jsonb_typeof(p_content) <> 'object' then
    return jsonb_build_object('result','invalid');
  end if;

  if p_id is null then
    begin
      insert into article_approval.drafts(article_date, slug, status, content, sources, source_type)
      values(p_article_date, p_slug, 'pending', p_content, '[]'::jsonb, 'manual') returning * into a;
    exception when unique_violation then
      return jsonb_build_object('result','conflict');
    end;
    insert into article_approval.decisions(event_id, article_id, actor, action, from_status, to_status)
    values(p_event, a.id, p_actor, 'create', 'new', 'pending');
    return jsonb_build_object('result','created','id',a.id,'status',a.status,'version',a.version);
  end if;

  select * into a from article_approval.drafts where id = p_id for update;
  if not found or a.status = 'deleted' then return jsonb_build_object('result','not_found'); end if;
  if a.version <> p_version then return jsonb_build_object('result','conflict','status',a.status,'version',a.version); end if;
  previous_status := a.status;
  begin
    update article_approval.drafts set article_date = p_article_date, slug = p_slug, content = p_content,
      sources = '[]'::jsonb, status = 'pending', error_code = null, version = version + 1, updated_at = now()
      where id = p_id returning * into a;
  exception when unique_violation then
    return jsonb_build_object('result','conflict');
  end;
  insert into article_approval.decisions(event_id, article_id, actor, action, from_status, to_status)
  values(p_event, a.id, p_actor, 'edit', previous_status, 'pending');
  return jsonb_build_object('result','updated','id',a.id,'status',a.status,'version',a.version);
end $$;

revoke all on function article_approval.save_manual(uuid,text,date,text,jsonb,integer,text) from public, anon, authenticated;
grant execute on function article_approval.save_manual(uuid,text,date,text,jsonb,integer,text) to pdcar_article_worker;

commit;
