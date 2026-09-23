# Idesüss social messaging core

Status: implementation branch `feat/social-messaging-core`.

## Product decisions

- Friendship requests are available to signed-in users.
- Incoming requests support three decisions: **Igen / Nem / Talán**.
- `Talán` is stored as `later`; the request remains resolvable later.
- Friendship requests also appear as **system-style messages** in the private inbox.
- Private user-to-user messaging keeps the existing entitlement model:
  - Premium can message accepted friends.
  - Premium Plus can message any registered user.
  - All registered users can receive messages.
- Social user search is by nickname only. E-mail addresses are deliberately not searchable on the social surface.
- The hamburger menu shows **Üzenetek** only while signed in, with an unread badge.
- The first implementation uses persisted Postgres rows as the source of truth and Realtime only for UI refresh.

## Database additions

- `friendships.status`: adds `later`.
- `direct_messages.message_type`: `user | friend_request | system`.
- `direct_messages.friendship_id`: optional link to the friendship request.
- Realtime publication includes `direct_messages` and `friendships`.

## Public RPC surface

- `search_social_users(text, integer)`
- `request_friendship(uuid)`
- `respond_friendship(uuid, text)`
- `accept_friendship(uuid)`
- `remove_friendship(uuid)`
- `list_my_friendships()`
- `send_direct_message(uuid, text)`
- `mark_direct_messages_read(uuid)`
- `list_message_threads()`
- `list_direct_conversation(uuid, integer)`
- `get_social_summary()`

Privileged implementations live in the private schema and validate `auth.uid()`.
