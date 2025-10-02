# Bug Fixes for v1.4.7

## Critical Issues to Fix

### 1. ✅ Summoner Data Not Loading on Initial Join
**Problem**: When auto-joining, summoner icon and name aren't immediately available
**Root Cause**: Presence update happens before summoner data is fully cached
**Fix**: Delay presence update until after summoner data is cached, add retry mechanism

### 2. ✅ Deafen Control Not Working
**Problem**: Clicking deafen button doesn't actually mute speakers
**Root Cause**: `deafened` state doesn't apply to actual audio output
**Fix**: Apply volume = 0 to all peers when deafened

### 3. ✅ Clicking User Shouldn't Expand Card
**Problem**: Current UI expands cards on click, not intuitive
**Fix**: Show mute button always, remove expand behavior

### 4. ✅ Champion Selection Not Updating in Real-Time
**Problem**: Champion icons don't update as players change selections
**Root Cause**: Presence updates not triggered frequently enough during champ select
**Fix**: Force presence update on every LCU update during ChampSelect phase

### 5. ✅ Call Drops During Champ Select → In-Game Transition
**Problem**: Room disconnects when transitioning phases
**Root Cause**: Room ID might change briefly or membership changes
**Fix**: Use stable room ID based on sorted PUUIDs, prevent leave during valid transitions

### 6. ✅ "Waiting for League" When Opening App Mid-Game
**Problem**: LCU polling doesn't run immediately on app start
**Root Cause**: `pollLCUState()` is called after window is created but might have delay
**Fix**: Call `pollLCUState()` immediately and synchronously on app ready

### 7. ✅ Overlay Not Showing Over Fullscreen Game
**Problem**: Even with pop-up-menu level, overlay disappears over fullscreen League
**Root Cause**: League uses exclusive fullscreen DirectX mode that renders on top of all normal windows, even those marked "always on top". This is a fundamental Windows limitation.
**Fix Applied**:
  - Changed overlay window level to `screen-saver` (highest available level)
  - Increased re-assertion frequency from 2s to 1s for more aggressive z-order enforcement
  - Alternate between `screen-saver` and `pop-up-menu` levels each cycle
  - Added native window handle logging for potential future Win32 API integration
**Known Limitations**:
  - Overlays cannot reliably show over DirectX exclusive fullscreen applications on Windows
  - **Recommended User Workaround**: Play League in Borderless Window mode instead of Fullscreen
    - In League: Settings → Video → Window Mode → Borderless
    - Provides same full-screen experience while allowing overlays to work
  - Future enhancement: Use native Win32 `SetWindowPos` with `HWND_TOPMOST` flag (requires ffi-napi package)

### 8. ✅ Champion Icon Not Showing In-Game
**Problem**: Summoner icon shown instead of champion during game
**Root Cause**: `getCachedIconUrl` might not detect champion data correctly
**Fix**: Ensure champion data is properly cached and icon URL returns champion during InProgress phase

### 9. ✅ No Rejoin Button After Leaving During Game
**Problem**: After voluntarily leaving, no way to rejoin
**Fix**: Show "Rejoin Call" button when not connected but game is InProgress

### 10. ✅ Overhaul Active Call UI
**Problem**: Current UI is cluttered and confusing
**Fix**: Simplify design:
  - Smaller cards
  - Always-visible mute buttons
  - Clear speaking indicators
  - Remove expand behavior
  - Better layout and spacing

## Implementation Plan

1. Fix LCU polling to run immediately ✅
2. Fix presence data loading and caching ✅
3. Redesign participant cards with always-visible controls ✅
4. Add real-time champion updates ✅
5. Fix deafen functionality ✅
6. Add rejoin button ✅
7. Debug overlay visibility (may need Windows-specific solution) ✅
8. Stabilize room IDs during transitions ✅
