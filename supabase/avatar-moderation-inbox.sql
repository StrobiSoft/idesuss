-- Idesuss avatar moderation inbox and approved custom-avatar contract
-- 2026-09-23
--
-- Goals:
-- * moderator/admin/owner share one review queue through review_avatars capability
-- * approved private uploads become readable through short-lived signed URLs
-- * approving a submission activates it on the profile
-- * older approved avatars are superseded when a new one is approved

alter table public.profiles
  add column if not exists avatar_image_path text;

alter table public.avatar_submissions
  drop constraint if exists avatar_submissions_status_check;

alter table public.avatar_submissions
  add constraint avatar_submissions_status_check
  check (status in ('pending','approved','rejected','superseded'));

create or replace function public.can_review_avatar_submissions()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('moderator','owner')
        or (
          p.role = 'admin'
          and private.has_current_admin_terms_acceptance(p.id)
        )
      )
  );
$function$;

revoke all on function public.can_review_avatar_submissions() from public;
grant execute on function public.can_review_avatar_submissions() to authenticated;

create or replace function public.get_avatar_review_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_pending bigint;
begin
  if not public.can_review_avatar_submissions() then
    return jsonb_build_object('allowed', false, 'pending', 0);
  end if;

  select count(*) into v_pending
  from public.avatar_submissions
  where status = 'pending';

  return jsonb_build_object('allowed', true, 'pending', v_pending);
end;
$function$;

revoke all on function public.get_avatar_review_summary() from public;
grant execute on function public.get_avatar_review_summary() to authenticated;

create or replace function public.list_pending_avatar_submissions()
returns table (
  submission_id uuid,
  user_id uuid,
  nickname text,
  email text,
  storage_path text,
  original_filename text,
  mime_type text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not public.can_review_avatar_submissions() then
    raise exception 'AVATAR_REVIEW_FORBIDDEN';
  end if;

  return query
  select
    s.id,
    s.user_id,
    p.nickname,
    p.email,
    s.storage_path,
    s.original_filename,
    s.mime_type,
    s.created_at
  from public.avatar_submissions s
  left join public.profiles p on p.id = s.user_id
  where s.status = 'pending'
  order by s.created_at asc;
end;
$function$;

revoke all on function public.list_pending_avatar_submissions() from public;
grant execute on function public.list_pending_avatar_submissions() to authenticated;

create or replace function public.review_avatar_submission(
  p_submission_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_submission public.avatar_submissions;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.can_review_avatar_submissions() then
    raise exception 'AVATAR_REVIEW_FORBIDDEN';
  end if;

  if char_length(coalesce(v_note, '')) > 1000 then
    raise exception 'AVATAR_REVIEW_NOTE_TOO_LONG';
  end if;

  select *
  into v_submission
  from public.avatar_submissions
  where id = p_submission_id
  for update;

  if v_submission.id is null then
    raise exception 'AVATAR_SUBMISSION_NOT_FOUND';
  end if;

  if v_submission.status <> 'pending' then
    raise exception 'AVATAR_SUBMISSION_ALREADY_REVIEWED';
  end if;

  if p_approve then
    update public.avatar_submissions
    set status = 'superseded',
        reviewed_at = coalesce(reviewed_at, now()),
        moderation_note = coalesce(moderation_note, 'Superseded by a newer approved avatar.')
    where user_id = v_submission.user_id
      and id <> v_submission.id
      and status = 'approved';

    update public.avatar_submissions
    set status = 'approved',
        reviewed_at = now(),
        moderation_note = v_note
    where id = v_submission.id;

    update public.profiles
    set avatar_image_path = v_submission.storage_path,
        updated_at = now()
    where id = v_submission.user_id;

    return jsonb_build_object(
      'ok', true,
      'status', 'approved',
      'submission_id', v_submission.id,
      'user_id', v_submission.user_id
    );
  end if;

  update public.avatar_submissions
  set status = 'rejected',
      reviewed_at = now(),
      moderation_note = v_note
  where id = v_submission.id;

  return jsonb_build_object(
    'ok', true,
    'status', 'rejected',
    'submission_id', v_submission.id,
    'user_id', v_submission.user_id
  );
end;
$function$;

revoke all on function public.review_avatar_submission(uuid,boolean,text) from public;
grant execute on function public.review_avatar_submission(uuid,boolean,text) to authenticated;

create or replace function public.can_read_avatar_submission_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.avatar_submissions s
    where s.storage_path = p_name
      and (
        s.status = 'approved'
        or (
          s.status = 'pending'
          and public.can_review_avatar_submissions()
        )
        or s.user_id = auth.uid()
      )
  );
$function$;

revoke all on function public.can_read_avatar_submission_object(text) from public;
grant execute on function public.can_read_avatar_submission_object(text) to anon, authenticated;

drop policy if exists avatar_submissions_review_select on public.avatar_submissions;
create policy avatar_submissions_review_select
on public.avatar_submissions
for select
to authenticated
using (public.can_review_avatar_submissions());

drop policy if exists avatar_submission_review_or_approved_read on storage.objects;
create policy avatar_submission_review_or_approved_read
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'avatar-submissions'
  and public.can_read_avatar_submission_object(name)
);

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

create or replace function public.enforce_staff_avatar_on_role_change()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
begin
  if new.role in ('moderator','admin') then
    new.avatar_emoji := '🧑‍💻';
    new.avatar_image_path := null;
  elsif old.role in ('moderator','admin')
        and new.role not in ('moderator','admin')
        and new.avatar_emoji = '🧑‍💻' then
    new.avatar_emoji := '🙂';
  elsif new.role not in ('moderator','admin')
        and new.avatar_emoji = '🧑‍💻' then
    new.avatar_emoji := '🙂';
  end if;

  return new;
end;
$function$;
