# 🎯 Action Plan - What To Do Next

## ✅ COMPLETED (Just Now)

1. **Fixed initial state detection** - App now auto-joins when loaded mid-game
2. **Fixed overlay not showing over fullscreen** - Overlay now appears reliably over League
3. **Created comprehensive improvement roadmap** - 43 recommendations with priorities

---

## 🚀 IMMEDIATE ACTIONS (Next 30 Minutes)

### Test the Fixes:

1. **Test Initial State Detection:**
   ```bash
   npm run dev
   ```
   - Open League, create a lobby with a friend
   - Close and reopen HexCall
   - ✅ Should auto-join voice within 5 seconds

2. **Test Overlay Fullscreen:**
   - Start League in fullscreen mode
   - Join a voice call
   - ✅ Overlay should appear in top-right corner
   - ✅ Right-click menu should work
   - ✅ Hover should scale it up

3. **Check Console Logs:**
   - Open DevTools (F12)
   - Look for these logs:
     - `[VoiceProvider] Auto-joining League room:`
     - `[OVERLAY] Overlay window finished loading`
     - No errors related to dependencies

---

## 🎨 QUICK WINS (Next 2 Hours)

Follow `QUICK_WINS.md` for step-by-step instructions:

1. **Noise Suppression** (5 min) - 2-line change, huge impact
2. **Position Lock** (15 min) - Prevent accidental drags
3. **New Themes** (30 min) - 5 cool new overlay themes
4. **Call History** (1 hour) - Track and rejoin recent calls
5. **Changelog** (30 min) - Show "What's New" to users

**Result:** Much better UX with minimal effort

---

## 📋 THIS WEEK

### High Priority:
- [ ] Implement the 5 Quick Wins
- [ ] Add connection status indicator (color rings: green/yellow/red)
- [ ] Add in-game notifications (X joined, Y left)
- [ ] Test thoroughly in production build

### Medium Priority:
- [ ] Add push-to-mute hotkey
- [ ] Create keyboard shortcut customization UI
- [ ] Add minimize to tray

---

## 📅 THIS MONTH

### Features:
- [ ] Text chat in calls
- [ ] Soundboard with hotkeys
- [ ] Screen share capability
- [ ] Call recording (with consent)

### Quality:
- [ ] Add unit tests (Jest)
- [ ] Integrate error tracking (Sentry)
- [ ] Create user documentation
- [ ] Make tutorial video

---

## 🎯 PRIORITIES BY IMPACT

### Must Have (P0):
1. ✅ Initial state detection fix
2. ✅ Overlay fullscreen fix
3. Noise suppression (5 min)
4. Connection status colors (2 hours)
5. Position lock (15 min)

### Should Have (P1):
6. In-game notifications (3 hours)
7. New overlay themes (30 min)
8. Push-to-mute (1 hour)
9. Call history (1 hour)
10. Hotkey customization (3 hours)

### Nice to Have (P2):
11. Text chat (1 day)
12. Soundboard (2 days)
13. Screen share (3 days)
14. Call recording (1 day)
15. Analytics dashboard (2 days)

---

## 📚 DOCUMENTATION TO READ

1. **`CRITICAL_FIXES_SUMMARY.md`** - What was just fixed
2. **`QUICK_WINS.md`** - Step-by-step for 5 easy improvements
3. **`RECOMMENDATIONS.md`** - Full list of 43 improvement ideas
4. **`IMPROVEMENTS.md`** - Previous improvements log
5. **`MIGRATION_GUIDE.md`** - How to use logger/constants

---

## 🔧 TROUBLESHOOTING

### If overlay doesn't show over game:
- Try running HexCall as administrator
- Check if League is in true fullscreen (not borderless)
- Verify overlay is enabled in settings
- Check console for `[OVERLAY]` errors

### If auto-join doesn't work:
- Make sure 2+ people are in the lobby
- Check that `hexcall-auto-join` is not set to '0' in localStorage
- Verify LCU auth is detected (console shows `[LCU] Found auth`)
- Look for `[VoiceProvider] Auto-joining room:` log

### If audio is choppy:
- Check connection stats in main window
- Verify no firewall is blocking WebRTC
- Try implementing noise suppression (Quick Win #1)
- Check if Supabase is reachable

---

## 💻 USEFUL COMMANDS

### Development:
```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run build:electron   # Create Windows installer
```

### Debug (in browser console):
```javascript
__hexcall_debug()           // Show debug info
__hexcall_debug_enable()    // Enable verbose logs
__hexcall_join()            // Force join
__hexcall_leave()           // Force leave
```

### Check localStorage:
```javascript
// See all HexCall data
Object.keys(localStorage)
  .filter(k => k.startsWith('hexcall-'))
  .forEach(k => console.log(k, localStorage[k]))
```

---

## 📊 SUCCESS CRITERIA

After implementing quick wins + testing:

### User Experience:
- ✅ App auto-joins calls when loading mid-game
- ✅ Overlay visible over fullscreen League
- ✅ Audio is clean (no background noise)
- ✅ Overlay stays in place (doesn't move accidentally)
- ✅ Users can see call history and rejoin
- ✅ Multiple theme options available

### Technical:
- ✅ No TypeScript errors
- ✅ No console errors in production
- ✅ Overlay re-asserts z-order every 2s
- ✅ useEffect dependencies are correct
- ✅ All features documented

---

## 🎯 DECISION TREE

**"What should I do first?"**

```
Is the app working correctly now?
├─ No → Test the 2 critical fixes
│  └─ Still broken? → Check Troubleshooting section
└─ Yes → Implement Quick Wins
   └─ Done? → Move to "This Week" tasks
      └─ Done? → Pick from "This Month" or "P2" list
```

**"Which improvement should I do next?"**

1. If audio quality is poor → Noise suppression (5 min)
2. If overlay moves accidentally → Position lock (15 min)
3. If users want customization → Themes (30 min)
4. If users lose call codes → Call history (1 hour)
5. If users don't know about updates → Changelog (30 min)

---

## 🚦 STATUS INDICATORS

| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| Initial state detection | ✅ Fixed | P0 | Done |
| Overlay fullscreen | ✅ Fixed | P0 | Done |
| Noise suppression | 🔄 Ready | P0 | 5 min |
| Connection status | ⏳ TODO | P0 | 2 hours |
| Position lock | ⏳ TODO | P0 | 15 min |
| New themes | ⏳ TODO | P1 | 30 min |
| Call history | ⏳ TODO | P1 | 1 hour |
| Text chat | 💡 Idea | P2 | 1 day |
| Screen share | 💡 Idea | P2 | 3 days |

---

## 📞 GET HELP

- **File Issues:** github.com/johngibsondesign/hexcall/issues
- **Check Logs:** Open DevTools (F12) → Console
- **Debug Mode:** Type `__hexcall_debug()` in console
- **Documentation:** See RECOMMENDATIONS.md for all ideas

---

## 🎉 CELEBRATE PROGRESS

You've just:
- ✅ Fixed 2 critical bugs
- ✅ Improved app architecture
- ✅ Created comprehensive roadmap
- ✅ Documented 43 improvement ideas
- ✅ Prepared implementation guides

**Next:** Test the fixes, then implement Quick Wins for maximum impact! 🚀

---

**Last Updated:** October 2, 2025  
**Next Review:** After Quick Wins implementation
