# HexCall - Comprehensive Improvement Recommendations

## 🐛 CRITICAL BUGS FIXED

### 1. **Initial State Detection** ✅ FIXED
**Problem:** When app loads while already in a game/lobby, it doesn't auto-join calls until game state changes.

**Root Cause:** VoiceProvider's `useEffect` was missing `roomId` from dependencies, preventing it from processing initial LCU state on mount.

**Fix Applied:**
- Added `roomId`, `userId`, and `updatePresence` to useEffect dependencies
- Now properly processes initial game state when app loads

**Impact:** Users can now open HexCall mid-game and it will auto-connect to voice.

---

### 2. **Overlay Not Showing Over Fullscreen Game** ✅ FIXED
**Problem:** Overlay window doesn't appear over League of Legends in fullscreen mode.

**Root Cause:** 
- Using `screen-saver` window level wasn't high enough for fullscreen games
- Fullscreen DirectX/OpenGL apps have higher priority than normal windows
- Some games reset window Z-order periodically

**Fix Applied:**
- Changed window level from `'screen-saver'` to `'pop-up-menu'` (highest level)
- Added explicit `setAlwaysOnTop(true, 'pop-up-menu', 1)` with max priority
- Added periodic re-assertion of always-on-top every 2 seconds
- Added Windows-specific flags for fullscreen game compatibility

**Impact:** Overlay now reliably shows over League in fullscreen/borderless.

---

## 🎯 HIGH PRIORITY IMPROVEMENTS

### 1. **Add Overlay Position Lock** 🔒
**Current:** Users can accidentally drag overlay during gameplay  
**Suggestion:** Add a setting to lock overlay position  
**Implementation:**
```typescript
// In pages/settings.tsx
const [overlayLocked, setOverlayLocked] = useState(false);

// In electron/main.ts
ipcMain.handle('overlay:set-locked', (_, locked: boolean) => {
  overlayWindow?.setMovable(!locked);
});
```

**Benefit:** Prevents accidental drags during intense gameplay

---

### 2. **Add Visual Connection Status Indicator** 📶
**Current:** No clear visual indicator of connection quality  
**Suggestion:** Add color-coded ring or badge to overlay icons  
**States:**
- 🟢 Green: Good connection (<100ms ping)
- 🟡 Yellow: Moderate (100-200ms)
- 🔴 Red: Poor (>200ms or packet loss)
- ⚫ Gray: Disconnected

**Implementation Location:** `pages/overlay.tsx` - add ring color based on `connectionStats`

**Benefit:** Users can quickly identify connection issues

---

### 3. **Add In-Game Notifications** 🔔
**Current:** No feedback when teammates join/leave  
**Suggestion:** Small toast notifications in overlay  
**Examples:**
- "xXxShadow joined the call"
- "Support main left the call"
- "Reconnecting..."

**Implementation:**
```typescript
// Create components/OverlayToast.tsx
// Subscribe to peer join/leave events in pages/overlay.tsx
// Auto-dismiss after 3 seconds
```

**Benefit:** Better awareness of call status without checking main window

---

### 4. **Add Push-to-Mute (PTM)** 🔇
**Current:** Only have push-to-talk  
**Suggestion:** Add inverse mode - hold key to temporarily mute  
**Use Case:** Quickly mute for IRL interruptions without toggling  

**Implementation:** Mirror push-to-talk logic but invert mute state

**Benefit:** Faster temporary muting without losing mic state

---

### 5. **Add Automatic Noise Suppression** 🎤
**Current:** Raw audio with only VAD  
**Suggestion:** Integrate browser's native noise suppression  
**Implementation:**
```typescript
// In modules/webrtc/voiceClient.ts
const mediaStream = await navigator.mediaDevices.getUserMedia({
  audio: {
    deviceId: micDeviceId,
    echoCancellation: true,
    noiseSuppression: true, // ← Add this
    autoGainControl: true    // ← Add this
  }
});
```

**Benefit:** Cleaner audio, less background noise (keyboard clicks, fan noise)

---

### 6. **Add Role-Based Auto-Volume** 🔊
**Current:** All users at same volume  
**Suggestion:** Auto-adjust volume based on role importance  
**Logic:**
- Support: 100% (shotcaller)
- Jungle: 95% (macro calls)
- Mid: 90%
- ADC/Top: 85%

**Toggle:** Settings option to enable/disable  
**Benefit:** Prioritize important calls during teamfights

---

### 7. **Add Call Recording** 🎬
**Current:** No way to review calls  
**Suggestion:** Optional recording with consent  
**Features:**
- Record button in main window
- Save to `Documents/HexCall/Recordings/`
- Show recording indicator in overlay (red dot)
- Auto-name: `2025-10-02_20-30_SoloQueue.webm`

**Privacy:** Require all participants to agree before recording starts

**Benefit:** Review comms for improvement, clip funny moments

---

### 8. **Add In-Game Mute Sync** 🔗
**Current:** HexCall mute is separate from League mute  
**Suggestion:** Detect when user mutes in League, sync to HexCall  
**Implementation:** Monitor LCU API for mute changes  

**Benefit:** Unified mute state across apps

---

### 9. **Add Keyboard Shortcuts Customization** ⌨️
**Current:** Hardcoded shortcuts  
**Suggestion:** Let users customize all hotkeys  
**Shortcuts to Expose:**
- Toggle mute (default: Ctrl+Shift+M)
- Toggle overlay (default: Ctrl+Shift+H)
- Push-to-talk (default: CapsLock)
- Leave call (default: none)

**UI:** Settings page with key capture input

**Benefit:** Avoid conflicts with other apps/games

---

### 10. **Add Lobby Voice Chat** 💬
**Current:** Voice only starts in Matchmaking+  
**Suggestion:** Start voice earlier in lobby  
**Implementation:** Change allowed phases to include `'Lobby'` earlier

**Note:** Already partially implemented, just need to adjust member count threshold (currently requires >=2)

**Benefit:** Coordinate champion select strategy earlier

---

## 🎨 UI/UX IMPROVEMENTS

### 11. **Add Overlay Themes** 🎨
**Current:** Single default theme  
**Status:** ✅ Already partially implemented in `lib/overlayThemes.ts`!  
**Suggestion:** Add more themes and make them more distinct  

**New Theme Ideas:**
- **Cyberpunk:** Neon pink/blue with glow effects
- **Minimal:** Tiny dots, no rings
- **Classic Discord:** Green speaking indicator, gray icons
- **Streamer Mode:** Extra large, high contrast for OBS

**Implementation:** Extend existing `overlayThemes` object

---

### 12. **Add Overlay Size Presets** 📏
**Current:** Manual slider (0.75x - 1.5x)  
**Suggestion:** Add quick preset buttons  
**Presets:**
- Small (0.75x)
- Medium (1.0x) 
- Large (1.25x)
- Extra Large (1.5x)

**UI:** Radio buttons or icon buttons in settings

**Benefit:** Faster adjustment, easier for non-technical users

---

### 13. **Add Main Window Minimize to Tray** 📍
**Current:** Closing window quits app  
**Suggestion:** Add system tray icon, minimize to tray option  
**Features:**
- Right-click tray menu:
  - Open HexCall
  - Mute/Unmute
  - Leave Call
  - Quit
- Notification badges for call status

**Implementation:** Use Electron's `Tray` API

**Benefit:** Less taskbar clutter, app feels more integrated

---

### 14. **Add Dark/Light Mode Toggle** 🌓
**Current:** Always dark mode  
**Suggestion:** Add light mode option  
**Implementation:** Use Tailwind's `dark:` classes  

**Benefit:** Accessibility for light-mode users

---

### 15. **Add Call History** 📜
**Current:** No record of past calls  
**Suggestion:** Show recent calls in main window  
**Display:**
- Date/time
- Duration
- Participants
- Quick rejoin button

**Storage:** localStorage with 30-day retention

**Benefit:** Easy reconnect with recent groups

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### 16. **Reduce LCU Polling Frequency** 🔄
**Current:** Polls every 5 seconds (1 second when missing data)  
**Suggestion:** Use WebSocket connection to LCU for real-time updates  
**Implementation:**
```typescript
// Instead of polling, subscribe to events:
ws://127.0.0.1:{port}
Subscribe to: /lol-gameflow/v1/gameflow-phase
```

**Benefit:** 
- Instant updates (no 5s delay)
- Less CPU usage
- Less network traffic

---

### 17. **Lazy Load Champion Images** 🖼️
**Current:** All champion images load immediately  
**Suggestion:** Use lazy loading with placeholder  
**Implementation:**
```tsx
<img 
  src={iconUrl} 
  loading="lazy"
  onLoad={() => setLoaded(true)}
/>
```

**Benefit:** Faster initial render, less memory usage

---

### 18. **Add Audio Processing Worklet** 🎵
**Current:** Audio processing on main thread  
**Suggestion:** Move VAD and audio effects to AudioWorklet  
**Benefit:** 
- No frame drops during audio processing
- Better performance during intense gameplay
- More headroom for future audio features

---

### 19. **Debounce Presence Updates** ⏱️
**Current:** Updates on every state change  
**Suggestion:** Batch presence updates with 500ms debounce  
**Benefit:** Reduces Supabase API calls, improves battery life

---

### 20. **Add Connection Quality Adaptive Bitrate** 📊
**Current:** Fixed audio bitrate  
**Suggestion:** Dynamically adjust based on connection quality  
**Logic:**
- Good connection: 128kbps
- Moderate: 64kbps
- Poor: 32kbps

**Implementation:** Monitor RTCPeerConnection stats, adjust bitrate

**Benefit:** Maintains call quality even on poor connections

---

## 🔐 SECURITY & PRIVACY

### 21. **Add End-to-End Encryption** 🔒
**Current:** Signaling data visible to Supabase  
**Suggestion:** Encrypt presence metadata  
**Implementation:** Use WebCrypto API for AES-GCM encryption  
**Benefit:** True privacy, no third-party can see metadata

---

### 22. **Add Blocklist Management** 🚫
**Current:** Ban list is per-room only  
**Suggestion:** Global blocklist across all calls  
**Features:**
- Block by Riot ID
- Block history
- Unblock option

**UI:** Settings page with blocklist table

**Benefit:** Persistent protection from toxic users

---

### 23. **Add Privacy Mode** 👁️
**Current:** Always shows summoner name/icon  
**Suggestion:** Option to hide identity  
**Features:**
- Show as "Anonymous User 1234"
- Generic avatar
- Toggle in settings

**Use Case:** Streamers, privacy-conscious users

---

## 🎯 NEW FEATURES

### 24. **Add Screen Share** 🖥️
**Complexity:** High  
**Suggestion:** Share screen/window during calls  
**Use Case:** 
- Review replays together
- Show builds/guides
- Coaching sessions

**Implementation:** WebRTC `getDisplayMedia()` API  

---

### 25. **Add Text Chat** 💬
**Complexity:** Medium  
**Suggestion:** In-call text chat for links/quick messages  
**Features:**
- Small chat panel in main window
- Notifications in overlay
- Link/image previews

**Implementation:** Add Supabase Realtime channel for messages

---

### 26. **Add Soundboard** 🎵
**Complexity:** Medium  
**Suggestion:** Play sound effects to call  
**Features:**
- Upload custom sounds
- Default sound pack (meme sounds, effects)
- Hotkeys for quick play
- Volume control

**Use Case:** Celebrations, tilt management, fun

---

### 27. **Add Call Analytics** 📈
**Complexity:** Medium  
**Suggestion:** Track call stats over time  
**Metrics:**
- Total call time
- Average call duration
- Most common teammates
- Connection quality trends

**UI:** Dashboard page with charts

---

### 28. **Add Discord Integration** 🤝
**Complexity:** High  
**Suggestion:** Bridge HexCall with Discord voice  
**Use Case:** Some teammates prefer Discord  
**Implementation:** Discord bot that joins channel and bridges audio

---

### 29. **Add Mobile Companion App** 📱
**Complexity:** Very High  
**Suggestion:** React Native app to join calls from phone  
**Use Case:** 
- Join calls when away from PC
- Remote push-to-talk
- Monitor call status

---

### 30. **Add AI Voice Assistant** 🤖
**Complexity:** Very High  
**Suggestion:** Optional AI that provides tips during game  
**Features:**
- Objective timers
- Build suggestions
- Summoner spell tracking
- Ward placement reminders

**Privacy:** Opt-in only, runs locally

---

## 🛠️ CODE QUALITY IMPROVEMENTS

### 31. **Add Unit Tests** ✅
**Current:** No tests  
**Suggestion:** Add Jest + React Testing Library  
**Priority Tests:**
- VoiceProvider logic
- LCU auth detection
- Presence cleanup
- Room derivation

**Benefit:** Catch regressions, safer refactoring

---

### 32. **Add E2E Tests** 🔍
**Current:** Manual testing only  
**Suggestion:** Add Playwright for E2E tests  
**Test Scenarios:**
- Create manual call
- Join by code
- LCU detection
- Overlay visibility
- Settings persistence

---

### 33. **Add Error Logging Service** 📊
**Current:** Errors only in console  
**Suggestion:** Integrate Sentry or LogRocket  
**Benefit:** 
- Track production errors
- User session replay
- Better bug reports

**Note:** Already has TODO comment in ErrorBoundary.tsx

---

### 34. **Add TypeScript Strict Mode** 🔒
**Current:** Some type assertions, any types  
**Suggestion:** Enable full strict mode, remove all `any`  
**Benefit:** Fewer runtime errors, better autocomplete

---

### 35. **Refactor Service Files** 📁
**Current:** `electron/services/lcu.ts` and `ptt.ts` are empty  
**Suggestion:** Either implement or remove  
**If Implementing:**
- Move LCU functions from `electron/lcu.ts` to service
- Implement proper push-to-talk service (native keylogger)

---

## 📦 DISTRIBUTION IMPROVEMENTS

### 36. **Add Auto-Update Notifications** 🔔
**Current:** Updates check silently  
**Status:** ✅ Already implemented in main.ts  
**Suggestion:** Add more visible notifications  
**Enhancement:**
- Toast notification in main window
- Changelog preview
- "What's new" modal on first launch after update

---

### 37. **Add Crash Reporting** 💥
**Current:** No crash reports  
**Suggestion:** Use Electron's `crashReporter` module  
**Configuration:**
```typescript
import { crashReporter } from 'electron';
crashReporter.start({
  productName: 'HexCall',
  submitURL: 'https://your-crash-server.com/upload',
  uploadToServer: true
});
```

---

### 38. **Add Diagnostics Tool** 🔧
**Current:** No built-in diagnostics  
**Suggestion:** Add troubleshooting page  
**Features:**
- Test microphone
- Test network connectivity
- Check LCU connection
- Check Supabase connection
- Export logs for support

**UI:** Settings → Diagnostics tab

---

### 39. **Add Telemetry (Opt-in)** 📈
**Current:** No usage analytics  
**Suggestion:** Optional anonymous telemetry  
**Metrics:**
- Feature usage
- Average call duration
- Most common issues
- Performance stats

**Privacy:** Fully opt-in, clearly explained

---

### 40. **Add Installer Customization** 📦
**Current:** Basic NSIS installer  
**Suggestion:** Add more installer options  
**Features:**
- Custom install path
- Desktop shortcut option
- Auto-start on boot option
- Install VC++ redistributables if needed

---

## 🎓 DOCUMENTATION IMPROVEMENTS

### 41. **Add User Guide** 📚
**Current:** Only README for developers  
**Suggestion:** Create user-facing documentation  
**Sections:**
- Getting started
- How to create/join calls
- Overlay customization
- Keyboard shortcuts
- Troubleshooting
- FAQ

**Host:** GitHub Pages or docs.hexcall.app

---

### 42. **Add Video Tutorials** 🎥
**Suggestion:** Create short tutorial videos  
**Topics:**
- First-time setup
- Creating manual calls
- Overlay customization
- Troubleshooting common issues

**Platform:** YouTube, embedded in app

---

### 43. **Add In-App Changelog** 📜
**Current:** No changelog visible to users  
**Suggestion:** Show changelog in app  
**UI:** Help menu → "What's New"  
**Source:** Parse CHANGELOG.md or GitHub releases

---

## 🏁 QUICK WINS (Easy Implementations)

### Top 5 Easiest & Highest Impact:

1. **Auto Gain Control & Noise Suppression** (5 min)
   - Add 2 lines to getUserMedia constraints
   - Instant audio quality improvement

2. **Overlay Position Lock** (15 min)
   - Add one setting + IPC handler
   - Prevents accidental drags

3. **More Overlay Themes** (30 min)
   - Extend existing theme system
   - Fun customization option

4. **Call History** (1 hour)
   - localStorage-based
   - Useful feature, simple implementation

5. **In-App Changelog** (30 min)
   - Parse GitHub releases API
   - Better user communication

---

## 🎯 PRIORITY RANKING

### Must Have (Next Release):
1. ✅ Initial state detection fix
2. ✅ Overlay fullscreen fix
3. Overlay position lock
4. Noise suppression
5. Connection status indicator

### Should Have (v1.5.0):
6. Push-to-mute
7. In-game notifications
8. More overlay themes
9. Keyboard shortcut customization
10. Call history

### Nice to Have (v2.0.0):
11. Text chat
12. Soundboard
13. Screen share
14. Call recording
15. Analytics dashboard

### Future (v3.0.0+):
16. Mobile app
17. Discord integration
18. AI assistant
19. End-to-end encryption
20. WebSocket LCU connection

---

## 📊 ESTIMATED EFFORT

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| Noise suppression | 5 min | High | P0 |
| Position lock | 15 min | High | P0 |
| Connection indicator | 2 hours | High | P0 |
| Push-to-mute | 1 hour | Medium | P1 |
| More themes | 30 min | Medium | P1 |
| In-game notifications | 3 hours | Medium | P1 |
| Call history | 1 hour | Medium | P1 |
| Text chat | 1 day | High | P2 |
| Soundboard | 2 days | Medium | P2 |
| Screen share | 3 days | Medium | P2 |
| Mobile app | 2 weeks | Low | P3 |
| AI assistant | 4 weeks | Low | P3 |

---

## 🚀 IMPLEMENTATION ROADMAP

### Immediate (This Week):
- ✅ Fix initial state detection
- ✅ Fix overlay fullscreen
- Add noise suppression
- Add overlay position lock
- Add connection status colors

### Short Term (This Month):
- Implement push-to-mute
- Add in-game join/leave notifications
- Create 3-5 new overlay themes
- Build keyboard shortcut customization UI
- Add call history feature

### Medium Term (Next Quarter):
- Implement text chat
- Build soundboard system
- Add screen share capability
- Create analytics dashboard
- Add call recording

### Long Term (6+ Months):
- Mobile companion app
- Discord bridge integration
- AI voice assistant
- End-to-end encryption
- WebSocket-based LCU connection

---

## 🎨 MOCKUPS NEEDED

Would be helpful to design mockups for:
1. Connection status indicator (color rings)
2. In-game notification toasts
3. Text chat panel
4. Call history page
5. Analytics dashboard
6. Diagnostics page

---

## 💡 FINAL THOUGHTS

**Strengths of Current Implementation:**
- ✅ Clean architecture (providers, hooks, services)
- ✅ Good separation of concerns
- ✅ WebRTC P2P is solid
- ✅ Overlay system works well
- ✅ Recent improvements (logger, constants, error boundary)

**Areas for Improvement:**
- ⚠️ User feedback/notifications (silent failures)
- ⚠️ Connection quality visibility
- ⚠️ Testing coverage
- ⚠️ Documentation for users

**Biggest Opportunities:**
- 🌟 Audio quality (noise suppression)
- 🌟 UX polish (notifications, status indicators)
- 🌟 Feature completeness (text chat, recording)
- 🌟 Mobile support

**Competitive Advantages:**
- 🏆 Native League integration (auto-detect lobby)
- 🏆 Lightweight (no bloated features)
- 🏆 Privacy-focused (P2P, no servers)
- 🏆 Overlay designed for gaming

---

**Next Steps:**
1. Implement the 5 Quick Wins
2. Get user feedback on priorities
3. Build roadmap based on feedback
4. Create mockups for new features
5. Start with high-impact, low-effort items

Good luck! 🚀
