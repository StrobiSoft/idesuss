-- Profile privacy controls: badge visibility + public online default
-- 2026-09-29
-- User-owned preferences remain separate from server-owned role/VIP state.

alter table public.profiles
  add column if not exists badges_visible boolean not null default true;

alter table public.profiles
  alter column presence_visibility set default 'everyone';

create or replace function public.set_my_badges_visibility(p_visible boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_value boolean := coalesce(p_visible,true);
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  update public.profiles
  set badges_visible=v_value,
      updated_at=now()
  where id=v_uid;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  return v_value;
end;
$function$;

revoke all on function public.set_my_badges_visibility(boolean) from public, anon;
grant execute on function public.set_my_badges_visibility(boolean) to authenticated;

drop function if exists public.get_user_public_badges(uuid[]);

create function public.get_user_public_badges(p_user_ids uuid[])
returns table(id uuid, role text, is_vip boolean)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p.id,
    case when p.badges_visible then p.role else 'user' end as role,
    case when p.badges_visible then p.is_vip else false end as is_vip
  from public.profiles p
  where p.id = any(coalesce(p_user_ids,'{}'::uuid[]));
$function$;

revoke all on function public.get_user_public_badges(uuid[]) from public, anon;
grant execute on function public.get_user_public_badges(uuid[]) to authenticated;

create or replace function public.list_online_users()
returns table(
  id uuid,
  nickname text,
  avatar_emoji text,
  role text,
  is_vip boolean,
  last_seen timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_uid is not null then
    select p.role in ('admin','owner')
      into v_is_admin
    from public.profiles p
    where p.id=v_uid;
    v_is_admin := coalesce(v_is_admin,false);
  end if;

  return query
  select
    p.id,
    coalesce(p.nickname,''),
    p.avatar_emoji,
    case when p.badges_visible then p.role else 'user' end,
    case when p.badges_visible then p.is_vip else false end,
    up.last_seen
  from private.user_presence up
  join public.profiles p on p.id=up.user_id
  where up.last_seen >= now() - interval '45 seconds'
    and p.profile_completed = true
    and (
      v_is_admin
      or (v_uid is null and p.presence_visibility='everyone')
      or (v_uid is not null and (
        p.id=v_uid
        or p.presence_visibility='everyone'
        or (
          p.presence_visibility='friends'
          and exists (
            select 1
            from public.friendships f
            where f.status='accepted'
              and (
                (f.requester_id=v_uid and f.addressee_id=p.id)
                or
                (f.addressee_id=v_uid and f.requester_id=p.id)
              )
          )
        )
      ))
    )
  order by
    case when p.badges_visible then
      case p.role when 'owner' then 0 when 'admin' then 1 when 'moderator' then 2 else 3 end
    else 3 end,
    case when p.badges_visible then p.is_vip else false end desc,
    lower(coalesce(p.nickname,p.email));
end;
$function$;

revoke all on function public.list_online_users() from public;
grant execute on function public.list_online_users() to anon, authenticated;
