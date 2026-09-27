# Native Messages Push v1

## What is already present

Production Supabase already has:

- `device_push_tokens`
- `push_preferences`
- `register_push_device`
- `unregister_push_device`
- `get_push_preferences`
- `set_push_preferences`
- `direct_messages_enqueue_push`
- private `push_notification_outbox`

The native client PR adds Firebase Messaging registration, token refresh, preference handling and notification deep links.

## Dispatcher activation boundary

The dispatcher implementation lives at:

`supabase/functions/messaging-push-dispatch/index.ts`

The additive helper SQL lives at:

`supabase/messaging-push-dispatch.sql`

The SQL intentionally exposes only service-role-only claim/finish RPCs. The private outbox is not made client-readable.

## Required external configuration

Before production activation:

1. Finalize the Android application ID and iOS bundle ID. The Flutter project still carries `com.example.idesuss`; do not create permanent Firebase apps against that placeholder.
2. Create or select the Firebase project.
3. Register the final Android and iOS app identifiers in Firebase.
4. Enable Firebase Cloud Messaging.
5. Upload the Apple APNs authentication key to Firebase for the iOS app.
6. Configure the iOS Push Notifications capability and signing profile.
7. Add the Firebase client values to the native build as Dart defines:
   - `IDESUSS_FIREBASE_PROJECT_ID`
   - `IDESUSS_FIREBASE_MESSAGING_SENDER_ID`
   - `IDESUSS_FIREBASE_ANDROID_API_KEY`
   - `IDESUSS_FIREBASE_ANDROID_APP_ID`
   - `IDESUSS_FIREBASE_IOS_API_KEY`
   - `IDESUSS_FIREBASE_IOS_APP_ID`
   - `IDESUSS_FIREBASE_IOS_BUNDLE_ID`
8. Store `FIREBASE_SERVICE_ACCOUNT_JSON` and `PUSH_DISPATCH_SECRET` only as server-side Supabase secrets.
9. Apply the dispatch helper SQL and deploy `messaging-push-dispatch`.
10. Wire a trusted scheduler/webhook to invoke the dispatcher with `x-idesuss-push-secret`.
11. Run the common end-to-end flow: device registration → message insert → outbox enqueue → dispatch → notification tap → target conversation.

No Firebase service-account secret belongs in the Flutter application or repository.
