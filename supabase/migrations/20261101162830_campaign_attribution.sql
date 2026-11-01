-- Privacy-minimal first-party campaign attribution for the private admin dashboard.
-- Values are deliberately bounded: no referrer, raw query string, IP address,
-- user agent, contact detail, or advertising identifier is accepted or stored.
begin;

alter table site_admin.analytics_events
  add column utm_source text check (utm_source is null or utm_source in ('facebook','line')),
  add column utm_medium text check (utm_medium is null or utm_medium in ('organic_social','messaging')),
  add column utm_campaign text check (utm_campaign is null or utm_campaign in (
    'pd0025_a','pd0025_b','pd0028_a','pd0028_b','pd0002_a','pd0002_b'
  ));

create index analytics_events_campaign_idx
  on site_admin.analytics_events (event_day desc, utm_source, utm_medium, utm_campaign)
  where utm_source is not null or utm_medium is not null or utm_campaign is not null;

create function site_admin.record_event(
  p_event_id uuid,
  p_session_id uuid,
  p_event_name text,
  p_path text,
  p_car_id text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_name not in ('page_view','vehicle_view','gallery_swipe','phone_click','line_click')
     or p_path !~ '^/' or char_length(p_path) > 240
     or p_path like '%?%'
     or (p_car_id is not null and (char_length(p_car_id) not between 1 and 80 or p_car_id !~ '^[A-Za-z0-9_-]+$'))
     or (p_utm_source is not null and p_utm_source not in ('facebook','line'))
     or (p_utm_medium is not null and p_utm_medium not in ('organic_social','messaging'))
     or (p_utm_campaign is not null and p_utm_campaign not in (
       'pd0025_a','pd0025_b','pd0028_a','pd0028_b','pd0002_a','pd0002_b'
     )) then
    return false;
  end if;
  insert into site_admin.analytics_events(
    event_id, session_id, event_name, path, car_id, utm_source, utm_medium, utm_campaign
  ) values (
    p_event_id, p_session_id, p_event_name, p_path, p_car_id, p_utm_source, p_utm_medium, p_utm_campaign
  ) on conflict(event_id) do nothing;
  return true;
end $$;

revoke all on function site_admin.record_event(uuid,uuid,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function site_admin.record_event(uuid,uuid,text,text,text,text,text,text) to pdcar_article_worker;

-- The original five-argument function intentionally remains available so a
-- running older application version can record unattributed events during rollback.
commit;
