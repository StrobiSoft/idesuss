
-- Idesüss admin panel / complimentary tier RBAC foundation
-- Applied to production Supabase on 2026-09-23.
-- Staff role (moderator/admin/owner) is intentionally separate from product tier.
-- complimentary_tier grants Premium benefits without granting staff/admin access.

alter table public.profiles
  add column if not exists complimentary_tier text;

alter table public.profiles
  drop constraint if exists profiles_complimentary_tier_check;

alter table public.profiles
  add constraint profiles_complimentary_tier_check
  check (complimentary_tier is null or complimentary_tier in ('premium','premium_plus'));

-- Production also contains:
-- public.get_my_admin_access()
-- public.owner_list_users()
-- public.owner_set_user_role(uuid,text)
-- public.owner_set_complimentary_tier(uuid,text)
-- Their privileged implementations live in the non-exposed private schema
-- and enforce the singleton Platform Owner before any cross-user action.
--
-- public.my_idesuss_effective_tier() evaluates in this order:
-- owner -> complimentary premium plus -> complimentary premium ->
-- paid premium plus (unexpired) -> paid premium -> registered.
--
-- public.protect_profile_server_owned_fields() preserves role, paid tier,
-- complimentary_tier and subscription expiry against normal client writes.


-- VIP status + authenticated online presence + privacy-aware online list
-- 2026-09-24

alter table public.profiles
  add column if not exists is_vip boolean not null default false;

create or replace function public.protect_profile_server_owned_fields()
returns trigger
language plpgsql
set search_path = 'public','auth'
as $function$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' then
      new.id := auth.uid();
      new.email := coalesce(auth.jwt() ->> 'email', '');
      new.role := 'user';
      new.tier := 'registered';
      new.complimentary_tier := null;
      new.subscription_expires_at := null;
      new.avatar_image_path := null;
      new.is_vip := false;
      new.created_at := coalesce(new.created_at, now());
      new.updated_at := now();

      if new.avatar_emoji = '🧑‍💻' then
        new.avatar_emoji := '🙂';
      end if;
    elsif tg_op = 'UPDATE' then
      new.id := old.id;
      new.email := old.email;
      new.role := old.role;
      new.tier := old.tier;
      new.complimentary_tier := old.complimentary_tier;
      new.subscription_expires_at := old.subscription_expires_at;
      new.avatar_image_path := old.avatar_image_path;
      new.is_vip := old.is_vip;
      new.created_at := old.created_at;

      if old.profile_completed = true then
        new.nickname := old.nickname;
        new.nickname_normalized := old.nickname_normalized;
      end if;

      if old.role in ('moderator','admin') then
        new.avatar_emoji := '🧑‍💻';
      elsif new.avatar_emoji = '🧑‍💻' then
        new.avatar_emoji := old.avatar_emoji;
      end if;

      new.updated_at := now();
    end if;
  end if;

  return new;
end;
$function$;

create table if not exists private.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now(),
  page text not null default '/'
);

revoke all on table private.user_presence from public, anon, authenticated;

create or replace function public.heartbeat_my_presence(p_page text default '/')
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into private.user_presence(user_id,last_seen,page)
  values (v_uid,now(),coalesce(nullif(trim(p_page),''),'/'))
  on conflict (user_id) do update
    set last_seen=excluded.last_seen,
        page=excluded.page;
end;
$function$;

create or replace function public.set_my_presence_offline()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  delete from private.user_presence where user_id=v_uid;
end;
$function$;

revoke all on function public.heartbeat_my_presence(text) from public;
revoke all on function public.set_my_presence_offline() from public;
grant execute on function public.heartbeat_my_presence(text) to authenticated;
grant execute on function public.set_my_presence_offline() to authenticated;

create or replace function private.owner_set_vip_status_internal(p_user_id uuid, p_is_vip boolean)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_profile public.profiles;
begin
  perform private.assert_platform_owner();

  update public.profiles
  set is_vip = coalesce(p_is_vip,false),
      updated_at = now()
  where id = p_user_id
    and role <> 'owner'
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'USER_NOT_FOUND_OR_OWNER_IMMUTABLE';
  end if;

  return v_profile;
end;
$function$;

create or replace function public.owner_set_vip_status(p_user_id uuid, p_is_vip boolean)
returns public.profiles
language sql
set search_path = ''
as $function$
  select private.owner_set_vip_status_internal(p_user_id,p_is_vip);
$function$;

revoke all on function public.owner_set_vip_status(uuid,boolean) from public, anon;
grant execute on function public.owner_set_vip_status(uuid,boolean) to authenticated;

create or replace function public.owner_list_users_v2()
returns table(
  id uuid,
  email text,
  nickname text,
  role text,
  subscription_tier text,
  complimentary_tier text,
  effective_tier text,
  profile_completed boolean,
  is_vip boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.assert_platform_owner();

  return query
  select
    p.id,p.email,p.nickname,p.role,p.tier,p.complimentary_tier,
    case
      when p.role='owner' then 'premium_plus'
      when p.complimentary_tier='premium_plus' then 'premium_plus'
      when p.complimentary_tier='premium' then 'premium'
      when p.tier='premium_plus' and p.subscription_expires_at is not null and p.subscription_expires_at>now() then 'premium_plus'
      when p.tier='premium' then 'premium'
      else 'registered'
    end,
    p.profile_completed,p.is_vip,p.updated_at
  from public.profiles p
  order by
    case p.role when 'owner' then 0 when 'admin' then 1 when 'moderator' then 2 else 3 end,
    lower(coalesce(p.nickname,p.email));
end;
$function$;

create or replace function public.owner_search_users_v2(p_query text, p_limit integer default 50)
returns table(
  id uuid,
  email text,
  nickname text,
  role text,
  subscription_tier text,
  complimentary_tier text,
  effective_tier text,
  profile_completed boolean,
  is_vip boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_query text := lower(trim(coalesce(p_query,'')));
  v_limit integer := greatest(1,least(coalesce(p_limit,50),100));
begin
  perform private.assert_platform_owner();

  return query
  select
    p.id,p.email,p.nickname,p.role,p.tier,p.complimentary_tier,
    case
      when p.role='owner' then 'premium_plus'
      when p.complimentary_tier='premium_plus' then 'premium_plus'
      when p.complimentary_tier='premium' then 'premium'
      when p.tier='premium_plus' and p.subscription_expires_at is not null and p.subscription_expires_at>now() then 'premium_plus'
      when p.tier='premium' then 'premium'
      else 'registered'
    end,
    p.profile_completed,p.is_vip,p.updated_at
  from public.profiles p
  where v_query=''
     or lower(coalesce(p.nickname,'')) like '%'||v_query||'%'
     or lower(coalesce(p.email,'')) like '%'||v_query||'%'
  order by
    case
      when v_query<>'' and lower(coalesce(p.nickname,''))=v_query then 0
      when v_query<>'' and lower(coalesce(p.email,''))=v_query then 1
      when v_query<>'' and lower(coalesce(p.nickname,'')) like v_query||'%' then 2
      when v_query<>'' and lower(coalesce(p.email,'')) like v_query||'%' then 3
      else 4
    end,
    case p.role when 'owner' then 0 when 'admin' then 1 when 'moderator' then 2 else 3 end,
    lower(coalesce(p.nickname,p.email))
  limit v_limit;
end;
$function$;

revoke all on function public.owner_list_users_v2() from public, anon;
revoke all on function public.owner_search_users_v2(text,integer) from public, anon;
grant execute on function public.owner_list_users_v2() to authenticated;
grant execute on function public.owner_search_users_v2(text,integer) to authenticated;

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
    p.role,
    p.is_vip,
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
    case p.role when 'owner' then 0 when 'admin' then 1 when 'moderator' then 2 else 3 end,
    p.is_vip desc,
    lower(coalesce(p.nickname,p.email));
end;
$function$;

revoke all on function public.list_online_users() from public;
grant execute on function public.list_online_users() to anon, authenticated;

create or replace function public.get_user_public_badges(p_user_ids uuid[])
returns table(id uuid, role text, is_vip boolean)
language sql
stable
security definer
set search_path = ''
as $function$
  select p.id,p.role,p.is_vip
  from public.profiles p
  where p.id = any(coalesce(p_user_ids,'{}'::uuid[]));
$function$;

revoke all on function public.get_user_public_badges(uuid[]) from public, anon;
grant execute on function public.get_user_public_badges(uuid[]) to authenticated;

create or replace function public.current_eula_version()
returns text
language sql
immutable
set search_path = ''
as $function$
  select '2026-09-24-v2'::text;
$function$;
