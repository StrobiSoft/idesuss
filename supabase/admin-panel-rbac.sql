
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
