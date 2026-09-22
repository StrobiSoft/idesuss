# Membership / VIP preview model

Status: **preview only — do not deploy to production yet**

## Product layers

- Registered user
- Premium
- Premium Plus
- VIP supporter status

VIP is not an administrative role. It is a supporter/status layer available only on top of effective Premium Plus.

## VIP sources

- `paid`: user has Premium Plus and additionally pays for VIP supporter status.
- `granted`: Platform Owner grants VIP status directly.

The visible result can be identical for both sources. Billing/audit logic retains the source internally.

## Staff remains separate

- user
- moderator
- admin
- owner

A VIP user remains a normal user unless separately assigned a staff role.

## Planned visual behavior

VIP identity rendering:
- gold/yellow display name
- visible VIP label/badge
- no extra service functionality required for first release

## Preview gate

The membership cards in `index.html` are hidden by default and only reveal when:

1. the site is opened on a private/local host, and
2. the query string includes `?membership-preview=1`.

This prevents the unfinished offer from appearing on the public production site even if the branch is tested locally.

## Pricing shown in preview

The current €3 / +€2 / +€1 and annual €30 / +€20 / +€10 values are **illustrative test values only**, not approved pricing.
