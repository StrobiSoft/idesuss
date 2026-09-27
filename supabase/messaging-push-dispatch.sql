-- Idesüss Messages Push v1
-- Additive service-role-only helpers used by messaging-push-dispatch.
-- Production application through Supabase MCP is intentionally deferred until
-- the external Firebase/APNs credentials are present and the full dispatch path
-- can be verified end to end.

create or replace function public.claim_push_notification_jobs(p_limit integer default 20)
returns table (
  job_id bigint,
  message_id bigint,
  recipient_id uuid,
  sender_id uuid,
  message_type text,
  message_body text,
  sender_nickname text,
  sender_avatar_emoji text,
  preview_enabled boolean,
  devices jsonb
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;

  return query
  with picked as (
    select o.id
    from private.push_notification_outbox o
    where (
        o.status = 'pending'
        or (
          o.status = 'processing'
          and o.processed_at is null
          and o.available_at <= now() - interval '5 minutes'
        )
      )
      and o.available_at <= now()
    order by o.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  ),
  claimed as (
    update private.push_notification_outbox o
    set status = 'processing',
        attempt_count = o.attempt_count + 1,
        last_error = null,
        available_at = now()
    from picked
    where o.id = picked.id
    returning o.*
  )
  select
    c.id,
    c.message_id,
    c.recipient_id,
    c.sender_id,
    c.message_type,
    dm.body,
    coalesce(nullif(p.nickname, ''), 'Idesüss') as sender_nickname,
    coalesce(nullif(p.avatar_emoji, ''), '🙂') as sender_avatar_emoji,
    coalesce(pp.message_preview_enabled, true) as preview_enabled,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'platform', d.platform,
            'device_id', d.device_id,
            'push_token', d.push_token
          )
          order by d.id
        )
        from public.device_push_tokens d
        where d.user_id = c.recipient_id
          and d.enabled = true
      ),
      '[]'::jsonb
    ) as devices
  from claimed c
  join public.direct_messages dm on dm.id = c.message_id
  left join public.profiles p on p.id = c.sender_id
  left join public.push_preferences pp on pp.user_id = c.recipient_id;
end;
$$;

revoke all on function public.claim_push_notification_jobs(integer)
from public, anon, authenticated;
grant execute on function public.claim_push_notification_jobs(integer)
to service_role;

create or replace function public.finish_push_notification_job(
  p_job_id bigint,
  p_status text,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_updated boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;

  if p_status not in ('sent','partial','failed','suppressed') then
    raise exception 'INVALID_PUSH_JOB_STATUS';
  end if;

  update private.push_notification_outbox
  set status = p_status,
      last_error = nullif(left(coalesce(p_error, ''), 1000), ''),
      processed_at = now()
  where id = p_job_id
    and status = 'processing';

  v_updated := found;
  return v_updated;
end;
$$;

revoke all on function public.finish_push_notification_job(bigint,text,text)
from public, anon, authenticated;
grant execute on function public.finish_push_notification_job(bigint,text,text)
to service_role;
