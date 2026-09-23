# Idesüss Radio — Audio Behavior Contract

Status: foundation / approved call-volume behavior

The reference volume is always the user's radio volume immediately before the interruption cycle starts.

## Incoming call
- Ringing: remember pre-call volume once and reduce radio to 25%.
- Connected call: radio goes to 0%.
- Call ends: restore first to 75%, then fade to 100%.
- Repeated ringing events must not recalculate the baseline from an already ducked level.

The HTML5 engine exposes `duckForRinging`, `muteForCall`, and `restoreAfterCall`.
Native clients may wire platform call/audio-focus events to the same contract.


## Explicit Radio navigation
- Internal Radio navigation requests immediate playback with `?autoplay=1`.
- The Radio page selects the saved/default station and immediately calls `play()`.
- If the browser blocks cross-navigation autoplay, the existing Play button remains the fallback; playback is never faked or reported as active unless the media element actually starts.
