-- Idesüss admin-only user activity view
-- Admin / Platform Owner only, with current admin-terms enforcement for admins.

create or replace function public.admin_list_online_users()
returns table(
  id uuid,
  email text,
  nickname text,
  role text,
  is_vip boolean,
  last_seen timestamptz,
  page text
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.assert_admin_or_owner();

  return query
  select
    u.id,
    coalesce(p.email, u.email::text, ''),
    coalesce(p.nickname, ''),
    coalesce(p.role, 'user'),
    coalesce(p.is_vip, false),
    up.last_seen,
    up.page
  from private.user_presence up
  join auth.users u on u.id = up.user_id
  left join public.profiles p on p.id = u.id
  where up.last_seen >= now() - interval '45 seconds'
  order by up.last_seen desc, lower(coalesce(p.nickname, p.email, u.email::text, ''));
end;
$function$;

create or replace function public.admin_list_recent_logins(p_limit integer default 10)
returns table(
  id uuid,
  email text,
  nickname text,
  role text,
  is_vip boolean,
  last_sign_in_at timestamptz,
  is_online boolean,
  last_seen timestamptz,
  page text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 50));
begin
  perform private.assert_admin_or_owner();

  return query
  select
    u.id,
    coalesce(p.email, u.email::text, ''),
    coalesce(p.nickname, ''),
    coalesce(p.role, 'user'),
    coalesce(p.is_vip, false),
    u.last_sign_in_at,
    coalesce(up.last_seen >= now() - interval '45 seconds', false),
    up.last_seen,
    up.page
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join private.user_presence up on up.user_id = u.id
  where u.last_sign_in_at is not null
  order by u.last_sign_in_at desc
  limit v_limit;
end;
$function$;

revoke all on function public.admin_list_online_users() from public, anon;
revoke all on function public.admin_list_recent_logins(integer) from public, anon;
grant execute on function public.admin_list_online_users() to authenticated;
grant execute on function public.admin_list_recent_logins(integer) to authenticated;
