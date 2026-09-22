-- Idesüss platform-owner RBAC foundation
-- Applied to production Supabase on 2026-09-23.
-- The owner role is a singleton and cannot be assigned through the client-facing role API.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user','moderator','admin','owner'));

create unique index if not exists profiles_single_owner_uidx
  on public.profiles ((role))
  where role = 'owner';

create or replace function public.my_idesuss_effective_tier()
returns text
language sql
stable
set search_path = 'public','auth'
as $function$
  select case
    when p.role = 'owner' then 'premium_plus'
    when p.tier = 'premium_plus'
      and p.subscription_expires_at is not null
      and p.subscription_expires_at > now()
      then 'premium_plus'
    when p.tier = 'premium' then 'premium'
    else 'registered'
  end
  from public.profiles p
  where p.id = auth.uid();
$function$;

create or replace function public.get_my_idesuss_entitlements()
returns jsonb
language sql
stable
set search_path = 'public','auth'
as $function$
  with me as (
    select
      coalesce(public.my_idesuss_effective_tier(), 'registered') as tier,
      coalesce(p.role, 'user') as role
    from public.profiles p
    where p.id = auth.uid()
  )
  select jsonb_build_object(
    'tier', tier,
    'role', role,
    'can_save_radio_channels', tier in ('registered', 'premium', 'premium_plus'),
    'max_radio_presets', case
      when tier = 'premium_plus' then 8
      when tier = 'premium' then 4
      else 2
    end,
    'can_create_registered_chat_rooms', tier in ('premium', 'premium_plus'),
    'daily_chat_room_limit', case when tier in ('premium', 'premium_plus') then 5 else 0 end,
    'show_nickname_crown', tier in ('premium', 'premium_plus'),
    'can_receive_direct_messages', true,
    'can_send_direct_messages_to_friends', tier in ('premium', 'premium_plus'),
    'can_send_direct_messages_to_anyone', tier = 'premium_plus',
    'can_view_friend_coordinates', tier in ('premium', 'premium_plus'),
    'can_use_save_our_souls', tier = 'premium_plus',
    'can_manage_roles', role = 'owner',
    'can_promote_admins', role = 'owner',
    'can_demote_admins', role = 'owner',
    'can_remove_admins', role = 'owner',
    'is_platform_owner', role = 'owner'
  )
  from me;
$function$;

create or replace function public.owner_set_user_role(
  p_user_id uuid,
  p_role text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_uid and p.role = 'owner'
  ) then
    raise exception 'OWNER_REQUIRED';
  end if;

  if p_role not in ('user','moderator','admin') then
    raise exception 'INVALID_MANAGED_ROLE';
  end if;

  if p_user_id = v_uid
     or exists (select 1 from public.profiles p where p.id = p_user_id and p.role = 'owner') then
    raise exception 'OWNER_ROLE_IMMUTABLE';
  end if;

  update public.profiles
  set role = p_role, updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  return v_profile;
end;
$function$;

revoke all on function public.owner_set_user_role(uuid,text) from public;
revoke all on function public.owner_set_user_role(uuid,text) from anon;
grant execute on function public.owner_set_user_role(uuid,text) to authenticated;

create or replace function public.protect_idesuss_owner()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    raise exception 'OWNER_DELETE_BLOCKED';
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner' and new.role is distinct from 'owner' then
    raise exception 'OWNER_DEMOTION_BLOCKED';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

drop trigger if exists protect_idesuss_owner_guard on public.profiles;
create trigger protect_idesuss_owner_guard
before update or delete on public.profiles
for each row
execute function public.protect_idesuss_owner();

-- Deployment-specific assignment:
-- update public.profiles
-- set role='owner', tier='premium_plus', updated_at=now()
-- where id='<owner-user-uuid>';
