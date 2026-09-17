# Idesüss Radio — Audio Behavior Contract

Status: foundation / approved call-volume behavior

## Reference volume

The reference volume for interruption handling is always the user's radio volume immediately before the interruption cycle starts. It is not a fixed system volume and it must not be recalculated from an already ducked/muted state.

## Incoming call

1. **Incoming call starts ringing**
   - Remember the pre-call radio volume once.
   - Keep the radio playing.
   - Reduce radio volume to **25% of the remembered pre-call volume**.
   - Repeated ringing notifications must continue to use the same remembered baseline.

2. **Call connects / active call**
   - Radio audio becomes fully silent (**0% of the remembered pre-call volume**).
   - The remembered baseline remains unchanged.

3. **Call ends**
   - Restore radio volume first to **75% of the remembered pre-call volume**.
   - Then gradually fade up to **100% of the remembered pre-call volume**.
   - After restoration completes, the interruption cycle is cleared.

## User volume changes

Outside an active call-interruption cycle, changing the radio volume updates the normal resume volume.

During an active call-interruption cycle, temporary duck/mute values must not replace the remembered pre-call baseline.

## Platform boundary

The HTML5 engine exposes the audio behavior primitives (`duckForRinging`, `muteForCall`, `restoreAfterCall`) and implements the volume transitions.

Actual telephone-call state detection depends on platform capabilities. A browser may not expose reliable call-state events; native clients can wire platform-specific call/audio-focus events to the same behavior contract.

## Media controls

Where the browser supports the Media Session API, the radio engine should expose play, pause and stop actions and station metadata for lock-screen / system media controls.
