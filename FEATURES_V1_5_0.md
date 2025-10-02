# HexCall v1.5.0 - Discord-Like Features Implementation

## ✅ COMPLETED FEATURES (Quick Wins)

### 1. Noise Suppression & Auto Gain ✅
**Status**: Already implemented!
- `noiseSuppression: true` and `autoGainControl: true` are already set by default in `voiceClient.ts`
- Defaults to enabled unless explicitly disabled in localStorage
- No changes needed!

### 2. Lazy Loading for Images ✅
**Files Modified**: 
- `pages/index.tsx` - Added `loading="lazy"` to participant avatars
- `pages/overlay.tsx` - Added `loading="lazy"` to overlay participant images
- `components/ChampionIcon.tsx` - Added `loading="lazy"` to champion icons and splash previews

**Impact**: Improved performance, reduced initial page load time

### 3. Overlay Position Lock ✅
**Files Modified**:
- `pages/settings.tsx` - Added toggle UI with FaLock icon
- `electron/main.ts` - Added `overlay:set-locked` IPC handler with `setMovable(!locked)`
- `electron/preload.ts` - Added `setOverlayLocked` method
- `electron/typings.d.ts` - Added TypeScript definition

**Impact**: Users can lock overlay to prevent accidental drags during intense gameplay

### 4. Overlay Size Presets ✅
**Files Modified**:
- `pages/settings.tsx` - Added 4 quick preset buttons (Small/Medium/Large/XL) above slider

**Presets**:
- Small: 0.75x
- Medium: 1.0x  
- Large: 1.25x
- XL: 1.5x

**Impact**: Faster size adjustment, better UX than slider alone

### 5. More Overlay Themes ✅
**Files Modified**:
- `lib/overlayThemes.ts` - Added 4 new themes

**New Themes**:
1. **Discord** - Classic Discord look with green speaking ring, gray icons
2. **Cyberpunk** - Vibrant pink/cyan neon with heavy blur
3. **Streamer** - Extra large, high contrast for streaming/OBS  
4. **Stealthy** - Ultra-minimal, nearly invisible

**Total Themes**: 9 (Default, Minimal, Gaming, Professional, Neon, Discord, Cyberpunk, Streamer, Stealthy)

---

## 🚧 REMAINING FEATURES TO IMPLEMENT

### 6. Push-to-Mute (PTM) - 1 hour ⏰

**Concept**: Inverse of push-to-talk - hold key to temporarily mute (Discord has this)

**Implementation Steps**:

1. **Add state to VoiceProvider.tsx**:
```typescript
const [usePushToMute, setUsePushToMute] = useState(false);
const [pushToMuteKey, setPushToMuteKey] = useState('M');
const [pushToMuteActive, setPushToMuteActive] = useState(false);
```

2. **Add electron hotkey handler in main.ts** (mirror PTT logic):
```typescript
// Add to push-to-talk section
let pushToMuteSettings = { enabled: false, key: 'M' };

function registerPushToMute() {
  if (!pushToMuteSettings.enabled) return;
  
  try {
    globalShortcut.unregister(pushToMuteSettings.key);
  } catch {}
  
  try {
    const success = globalShortcut.register(pushToMuteSettings.key, () => {
      const win = BrowserWindow.getAllWindows()[0];
      win?.webContents.send('hotkey:push-to-mute', { active: true });
    });
    
    if (success) {
      console.log(`Push-to-mute registered: ${pushToMuteSettings.key}`);
    }
  } catch (e) {
    console.warn('Failed to register push-to-mute:', e);
  }
}

// Add key-up handler
uIOhook.on('keyup', (e) => {
  // ... existing PTT logic ...
  
  // Push-to-mute release
  if (pushToMuteSettings.enabled && e.keycode === getKeycodeForKey(pushToMuteSettings.key)) {
    const win = BrowserWindow.getAllWindows()[0];
    win?.webContents.send('hotkey:push-to-mute', { active: false });
  }
});

// Add IPC handlers
ipcMain.handle('push-to-mute:update-settings', (event, { enabled, key }) => {
  pushToMuteSettings = { enabled, key };
  registerPushToMute();
  return { success: true };
});

ipcMain.handle('push-to-mute:get-settings', () => {
  return pushToMuteSettings;
});
```

3. **Add preload methods**:
```typescript
onHotkeyPushToMute: (cb: (active: boolean) => void) => {
  const listener = (_e: any, data: { active: boolean }) => cb(data.active);
  ipcRenderer.on('hotkey:push-to-mute', listener);
  return () => ipcRenderer.removeListener('hotkey:push-to-mute', listener);
},
pushToMuteUpdateSettings: (enabled: boolean, key: string) => 
  ipcRenderer.invoke('push-to-mute:update-settings', { enabled, key }),
pushToMuteGetSettings: () => 
  ipcRenderer.invoke('push-to-mute:get-settings'),
```

4. **Add VoiceProvider listener**:
```typescript
useEffect(() => {
  if (!window.hexcall?.onHotkeyPushToMute) return;
  
  const unsubscribe = window.hexcall.onHotkeyPushToMute((active) => {
    setPushToMuteActive(active);
    
    // Invert logic: when PTM key held, mute; when released, unmute
    if (active) {
      mute?.(true); // Mute when key pressed
    } else {
      mute?.(false); // Unmute when key released
    }
  });
  
  return unsubscribe;
}, [mute]);
```

5. **Add settings UI** in `pages/settings.tsx`:
```tsx
{/* Push-to-Mute Section (similar to PTT) */}
<div>
  <div className="flex items-center justify-between mb-3">
    <label className="text-sm font-medium text-neutral-300">Push-to-Mute</label>
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        checked={usePushToMute}
        onChange={e => setUsePushToMute(e.target.checked)} 
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-neutral-700 rounded-full peer-checked:bg-green-500 ..."/>
    </label>
  </div>
  
  {usePushToMute && (
    <div className="pl-4">
      <label className="text-xs text-neutral-400">Hold key to temporarily mute</label>
      <select 
        value={pushToMuteKey} 
        onChange={e => setPushToMuteKey(e.target.value)}
        className="mt-2 w-full bg-neutral-700 ...">
        <option value="M">M</option>
        <option value="N">N</option>
        <option value="Alt">Alt</option>
        {/* Add more keys */}
      </select>
    </div>
  )}
</div>
```

---

### 7. Call History - 1 hour ⏰

**Concept**: Show recent calls with quick rejoin (Discord has this in DMs)

**Implementation**:

1. **Create lib/callHistory.ts**:
```typescript
export interface CallHistoryEntry {
  id: string;
  timestamp: number;
  duration: number;
  roomId: string;
  participants: Array<{
    userId: string;
    displayName: string;
    riotId?: string;
    iconUrl?: string;
  }>;
  type: 'league' | 'manual';
}

const STORAGE_KEY = 'hexcall-call-history';
const MAX_HISTORY = 20;
const RETENTION_DAYS = 30;

export function getCallHistory(): CallHistoryEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const history: CallHistoryEntry[] = JSON.parse(data);
    const cutoff = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    return history.filter(entry => entry.timestamp > cutoff);
  } catch {
    return [];
  }
}

export function addCallToHistory(entry: Omit<CallHistoryEntry, 'id' | 'timestamp'>): void {
  try {
    const history = getCallHistory();
    const newEntry: CallHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    
    history.unshift(newEntry);
    const trimmed = history.slice(0, MAX_HISTORY);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save call history:', e);
  }
}
```

2. **Track calls in VoiceProvider.tsx**:
```typescript
// When joining call
useEffect(() => {
  if (!connected || !connectedPeers) return;
  
  callStartTime.current = Date.now();
}, [connected]);

// When leaving call
useEffect(() => {
  return () => {
    if (callStartTime.current && connectedPeers) {
      const duration = Date.now() - callStartTime.current;
      
      addCallToHistory({
        duration,
        roomId: joinedRoomId || 'unknown',
        participants: connectedPeers.map(p => ({
          userId: p.id,
          displayName: p.name || 'Unknown',
          riotId: p.riotId,
          iconUrl: p.iconUrl
        })),
        type: joinedRoomId?.startsWith('manual-') ? 'manual' : 'league'
      });
    }
  };
}, []);
```

3. **Add Call History UI** in `pages/index.tsx`:
```tsx
// Add tab or section showing history
const history = getCallHistory();

<div className="space-y-2">
  <h3 className="text-sm font-medium text-neutral-400">Recent Calls</h3>
  {history.map(call => (
    <div key={call.id} className="p-3 bg-neutral-800/50 rounded-lg flex items-center justify-between">
      <div>
        <div className="text-sm text-white">
          {call.participants.length} participants
        </div>
        <div className="text-xs text-neutral-400">
          {formatDistanceToNow(call.timestamp)} • {formatDuration(call.duration)}
        </div>
      </div>
      <button 
        onClick={() => join(call.roomId)}
        className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-sm">
        Rejoin
      </button>
    </div>
  ))}
</div>
```

---

### 8. Connection Status Indicator - 2 hours ⏰

**Concept**: Color-coded rings on avatars (Discord shows connection quality)

**Implementation**:

1. **Add connection quality helper**:
```typescript
function getConnectionQuality(stats: any): 'good' | 'moderate' | 'poor' | 'disconnected' {
  if (!stats || !stats.timestamp) return 'disconnected';
  
  const ping = stats.roundTripTime || 0;
  const packetLoss = stats.packetLossPercent || 0;
  
  if (packetLoss > 5) return 'poor';
  if (ping > 200 || packetLoss > 2) return 'moderate';
  if (ping > 100) return 'moderate';
  return 'good';
}

const qualityColors = {
  good: 'ring-green-400',
  moderate: 'ring-yellow-400',
  poor: 'ring-red-400',
  disconnected: 'ring-gray-400'
};
```

2. **Update participant cards** in `pages/index.tsx`:
```tsx
const quality = getConnectionQuality(connectionStats?.[peer.id]);
const ringColor = qualityColors[quality];

<div className={`... ${ringColor} ring-2`}>
  {/* Avatar */}
</div>
```

3. **Update overlay** in `pages/overlay.tsx`:
```tsx
// Similar logic for overlay icons
const quality = getConnectionQuality(connectionStats?.[tm.userId]);
```

---

### 9. Keyboard Shortcuts Customization - 2-3 hours ⏰

**Concept**: Settings UI to customize all hotkeys (Discord has extensive customization)

**Implementation**: This is complex and requires:
1. Key capture input component
2. Conflict detection
3. Storage of custom bindings
4. Dynamic registration in Electron main process

**Recommend**: Start with fixed shortcuts, add customization in v1.6.0

---

### 10. In-Game Join/Leave Notifications - 3 hours ⏰

**Concept**: Toast notifications in overlay (Discord shows these)

**Implementation**:

1. **Create components/OverlayToast.tsx**:
```tsx
export interface Toast {
  id: string;
  message: string;
  type: 'join' | 'leave' | 'info';
  timestamp: number;
}

export function OverlayToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="fixed top-4 right-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-lg px-4 py-2 animate-slideInRight">
      <div className="text-sm text-white">{toast.message}</div>
    </div>
  );
}
```

2. **Add toast state to pages/overlay.tsx**:
```typescript
const [toasts, setToasts] = useState<Toast[]>([]);

// Watch for peer changes
useEffect(() => {
  const prevPeerIds = prevPeersRef.current;
  const currentPeerIds = new Set(peers.map(p => p.userId));
  
  // Check for new peers (joined)
  peers.forEach(peer => {
    if (!prevPeerIds.has(peer.userId)) {
      addToast({
        message: `${peer.displayName || 'User'} joined the call`,
        type: 'join'
      });
    }
  });
  
  // Check for removed peers (left)
  prevPeerIds.forEach(userId => {
    if (!currentPeerIds.has(userId)) {
      const peer = /* find in previous state */;
      addToast({
        message: `${peer?.displayName || 'User'} left the call`,
        type: 'leave'
      });
    }
  });
  
  prevPeersRef.current = currentPeerIds;
}, [peers]);
```

---

### 11. Minimize to System Tray - 1-2 hours ⏰

**Concept**: System tray icon with menu (Discord does this)

**Implementation** in `electron/main.ts`:
```typescript
import { Tray, Menu } from 'electron';

let tray: Tray | null = null;

function createTray() {
  // Use app icon or create custom tray icon
  tray = new Tray(path.join(__dirname, '../assets/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open HexCall',
      click: () => mainWindow?.show()
    },
    {
      label: 'Mute/Unmute',
      click: () => {
        // Send IPC to toggle mute
        mainWindow?.webContents.send('tray:toggle-mute');
      }
    },
    {
      label: 'Leave Call',
      click: () => {
        mainWindow?.webContents.send('tray:leave-call');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('HexCall');
  
  tray.on('click', () => {
    mainWindow?.show();
  });
}

// Call in app.whenReady()
app.whenReady().then(() => {
  createTray();
  // ... rest of setup
});

// Handle window close to minimize to tray
mainWindow.on('close', (event) => {
  if (!app.isQuitting) {
    event.preventDefault();
    mainWindow?.hide();
  }
});
```

---

### 12. Diagnostics Tool - 2 hours ⏰

**Concept**: Troubleshooting page to test mic/LCU/Supabase/network

**Implementation**: Create `pages/diagnostics.tsx`:
```tsx
export default function Diagnostics() {
  const [micTest, setMicTest] = useState<'idle' | 'testing' | 'pass' | 'fail'>('idle');
  const [lcuTest, setLcuTest] = useState<'idle' | 'testing' | 'pass' | 'fail'>('idle');
  const [supabaseTest, setSupabaseTest] = useState<'idle' | 'testing' | 'pass' | 'fail'>('idle');
  
  async function testMicrophone() {
    setMicTest('testing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicTest('pass');
    } catch {
      setMicTest('fail');
    }
  }
  
  async function testLCU() {
    setLcuTest('testing');
    // Check if window.hexcall.onLcuUpdate exists and receives data
    setTimeout(() => {
      setLcuTest(/* based on LCU data */ 'pass');
    }, 2000);
  }
  
  async function testSupabase() {
    setSupabaseTest('testing');
    try {
      const { getSupabase } = await import('../lib/signaling-supabase');
      const supabase = getSupabase();
      const channel = supabase.channel('test');
      await channel.subscribe();
      await channel.unsubscribe();
      setSupabaseTest('pass');
    } catch {
      setSupabaseTest('fail');
    }
  }
  
  return (
    <div className="p-6 space-y-4">
      <DiagnosticTest 
        name="Microphone"
        status={micTest}
        onTest={testMicrophone}
      />
      <DiagnosticTest 
        name="League Client (LCU)"
        status={lcuTest}
        onTest={testLCU}
      />
      <DiagnosticTest 
        name="Supabase Connection"
        status={supabaseTest}
        onTest={testSupabase}
      />
      
      <button onClick={exportLogs}>
        Export Logs
      </button>
    </div>
  );
}
```

---

## 📊 SUMMARY

**Completed**: 5/12 features (42%)  
**Remaining**: 7/12 features (58%)  
**Total Estimated Time Remaining**: ~12-15 hours

**Quick Wins Done** ✅:
- Noise Suppression (already there!)
- Lazy Loading Images
- Overlay Position Lock  
- Overlay Size Presets
- More Overlay Themes

**Recommended Next Steps**:
1. Push-to-Mute (1hr) - High impact, mirrors existing PTT
2. Call History (1hr) - Good UX improvement
3. Connection Status (2hrs) - Visible quality feedback
4. In-Game Notifications (3hrs) - Discord-like experience
5. Minimize to Tray (1-2hrs) - Better integration
6. Diagnostics Tool (2hrs) - Helps with support
7. Keyboard Customization (2-3hrs) - Complex, do last

---

## 🎯 TESTING CHECKLIST

After implementing remaining features:

- [ ] Test overlay position lock prevents dragging
- [ ] Test all 4 size presets work correctly
- [ ] Test all 9 overlay themes render properly
- [ ] Test push-to-mute holds to mute, releases to unmute
- [ ] Test call history saves and rejoin works
- [ ] Test connection indicators show correct colors
- [ ] Test toast notifications appear and auto-dismiss
- [ ] Test tray icon menu all options work
- [ ] Test diagnostics page all tests pass
- [ ] Test keyboard shortcuts don't conflict

---

**Good luck finishing the remaining features! You're already 42% done! 🚀**
