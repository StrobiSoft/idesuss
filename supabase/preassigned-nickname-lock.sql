-- Reservation-aware, immutable preassigned nicknames.
-- Keep existing reserved_nicknames rows; allow only the matching preassigned owner
-- to finish save_my_profile. Admin preassignment is a separately authorized action.
-- Never create a second Auth user or set profile_completed early.
create or replace function public.guard_preassigned_nickname()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- A preassigned nickname is final even before the user completes their profile.
    if old.nickname_normalized is not null
       and (new.nickname is distinct from old.nickname
            or new.nickname_normalized is distinct from old.nickname_normalized) then
      raise exception 'NICKNAME_LOCKED';
    end if;

    if new.nickname_normalized is distinct from old.nickname_normalized
       and exists (
         select 1 from public.reserved_nicknames r
         where r.nickname_normalized = new.nickname_normalized
       ) then
      raise exception 'INVALID_NICKNAME:RESERVED';
    end if;
  elsif tg_op = 'INSERT' then
    -- save_my_profile uses INSERT .. ON CONFLICT DO UPDATE: BEFORE INSERT
    -- fires before the existing row can be updated. Permit only the
    -- authenticated user's *already preassigned* nickname in that case.
    if exists (
      select 1 from public.reserved_nicknames r
      where r.nickname_normalized = new.nickname_normalized
    ) and not exists (
      select 1 from public.profiles p
      where p.id = new.id
        and p.nickname_normalized = new.nickname_normalized
    ) then
      raise exception 'INVALID_NICKNAME:RESERVED';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists zz_guard_preassigned_nickname on public.profiles;
create trigger zz_guard_preassigned_nickname
  before insert or update of nickname, nickname_normalized on public.profiles
  for each row execute function public.guard_preassigned_nickname();

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
  ) and not (
    v_existing.id is not null
    and v_existing.nickname_normalized = v_normalized
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
