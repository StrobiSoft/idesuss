-- Idesuss EULA acceptance gate
-- Version: 2026-09-23-v1
-- Applied through Supabase migration.

create table if not exists public.legal_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, document_type, document_version)
);

alter table public.legal_acceptances enable row level security;

drop policy if exists legal_acceptances_select_own on public.legal_acceptances;
create policy legal_acceptances_select_own
on public.legal_acceptances
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.legal_acceptances from anon;
revoke insert, update, delete on table public.legal_acceptances from authenticated;
grant select on table public.legal_acceptances to authenticated;

create or replace function public.current_eula_version()
returns text
language sql
immutable
set search_path = ''
as $function$
  select '2026-09-23-v1'::text;
$function$;

revoke all on function public.current_eula_version() from public;
grant execute on function public.current_eula_version() to anon, authenticated;

create or replace function public.get_my_eula_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_version text := public.current_eula_version();
  v_accepted_at timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object(
      'authenticated', false,
      'required_version', v_version,
      'accepted', false,
      'accepted_at', null
    );
  end if;

  select la.accepted_at
  into v_accepted_at
  from public.legal_acceptances la
  where la.user_id = v_uid
    and la.document_type = 'eula'
    and la.document_version = v_version;

  return jsonb_build_object(
    'authenticated', true,
    'required_version', v_version,
    'accepted', v_accepted_at is not null,
    'accepted_at', v_accepted_at
  );
end;
$function$;

revoke all on function public.get_my_eula_status() from public;
revoke execute on function public.get_my_eula_status() from anon;
grant execute on function public.get_my_eula_status() to authenticated;

create or replace function public.accept_current_eula()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_version text := public.current_eula_version();
  v_accepted_at timestamptz;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.legal_acceptances (
    user_id,
    document_type,
    document_version
  )
  values (
    v_uid,
    'eula',
    v_version
  )
  on conflict (user_id, document_type, document_version)
  do update set accepted_at = public.legal_acceptances.accepted_at
  returning accepted_at into v_accepted_at;

  return jsonb_build_object(
    'accepted', true,
    'version', v_version,
    'accepted_at', v_accepted_at
  );
end;
$function$;

revoke all on function public.accept_current_eula() from public;
revoke execute on function public.accept_current_eula() from anon;
grant execute on function public.accept_current_eula() to authenticated;

create or replace function public.save_my_profile(
  p_nickname text,
  p_avatar_emoji text,
  p_email_visibility text default 'hidden'
)
returns public.profiles
language plpgsql
set search_path = 'public','auth'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_normalized text;
  v_existing public.profiles;
  v_profile public.profiles;
  v_role text;
  v_effective_avatar text;
  v_eula_version text := public.current_eula_version();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.legal_acceptances la
    where la.user_id = v_uid
      and la.document_type = 'eula'
      and la.document_version = v_eula_version
  ) then
    raise exception 'EULA_ACCEPTANCE_REQUIRED:%', v_eula_version;
  end if;

  select *
  into v_existing
  from public.profiles p
  where p.id = v_uid;

  v_role := coalesce(v_existing.role, 'user');
  v_normalized := public.normalize_idesuss_nickname(coalesce(p_nickname, ''));

  if v_normalized = '' then
    raise exception 'INVALID_NICKNAME:EMPTY';
  end if;

  if v_existing.id is not null
     and v_existing.profile_completed = true
     and v_existing.nickname_normalized is not null
     and v_normalized is distinct from v_existing.nickname_normalized then
    raise exception 'NICKNAME_LOCKED';
  end if;

  if v_normalized ~ '_(hu|en|nl|ro|pl|hr|de)$' then
    raise exception 'INVALID_NICKNAME:RESERVED_SUFFIX';
  end if;

  if exists (
    select 1 from public.reserved_nicknames r
    where r.nickname_normalized = v_normalized
  ) then
    raise exception 'INVALID_NICKNAME:RESERVED';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.nickname_normalized = v_normalized
      and p.id <> v_uid
  ) then
    raise exception 'INVALID_NICKNAME:TAKEN';
  end if;

  if v_role in ('moderator','admin') then
    v_effective_avatar := '🧑‍💻';
  else
    if p_avatar_emoji = '🧑‍💻' then
      raise exception 'INVALID_PROFILE:STAFF_AVATAR_RESERVED';
    end if;
    v_effective_avatar := p_avatar_emoji;
  end if;

  if coalesce(trim(v_effective_avatar), '') = '' then
    raise exception 'INVALID_PROFILE:AVATAR_REQUIRED';
  end if;

  if p_email_visibility not in ('hidden', 'masked', 'public') then
    raise exception 'INVALID_PROFILE:EMAIL_VISIBILITY';
  end if;

  insert into public.profiles (
    id,
    email,
    nickname,
    nickname_normalized,
    avatar_emoji,
    email_visibility,
    profile_completed
  ) values (
    v_uid,
    v_email,
    trim(p_nickname),
    v_normalized,
    v_effective_avatar,
    p_email_visibility,
    true
  )
  on conflict (id) do update set
    nickname = case
      when public.profiles.profile_completed then public.profiles.nickname
      else excluded.nickname
    end,
    nickname_normalized = case
      when public.profiles.profile_completed then public.profiles.nickname_normalized
      else excluded.nickname_normalized
    end,
    avatar_emoji = v_effective_avatar,
    email_visibility = excluded.email_visibility,
    profile_completed = true
  returning * into v_profile;

  return v_profile;
end;
$function$;
