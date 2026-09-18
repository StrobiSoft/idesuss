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
