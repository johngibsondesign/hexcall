# Quick Wins - Implementation Guide

These are the **5 easiest and highest-impact improvements** you can make right now.

---

## 1. ✅ Auto Gain Control & Noise Suppression (5 minutes)

**Impact:** Dramatically better audio quality - removes background noise, keyboard clicks, fan noise.

**File:** `modules/webrtc/voiceClient.ts`

**Find this section:**
```typescript
const mediaStream = await navigator.mediaDevices.getUserMedia({
  audio: {
    deviceId: micDeviceId,
    echoCancellation: true,
  },
});
```

**Replace with:**
```typescript
const mediaStream = await navigator.mediaDevices.getUserMedia({
  audio: {
    deviceId: micDeviceId,
    echoCancellation: true,
    noiseSuppression: true,  // ← Add this
    autoGainControl: true,   // ← Add this
  },
});
```

**That's it!** Now test and you'll notice much cleaner audio.

---

## 2. 🔒 Overlay Position Lock (15 minutes)

**Impact:** Prevents accidentally dragging overlay during gameplay.

### Step 1: Add Settings State

**File:** `pages/settings.tsx`

**Add after other useState hooks:**
```typescript
const [overlayLocked, setOverlayLocked] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('hexcall-overlay-locked') === '1';
  }
  return false;
});
```

### Step 2: Add UI Toggle

**In the Overlay Settings section, add:**
```tsx
<label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={overlayLocked}
    onChange={(e) => {
      const locked = e.target.checked;
      setOverlayLocked(locked);
      localStorage.setItem('hexcall-overlay-locked', locked ? '1' : '0');
      window.hexcall?.setOverlayLocked?.(locked);
    }}
    className="rounded"
  />
  Lock overlay position (prevent dragging)
</label>
```

### Step 3: Add IPC Handler

**File:** `electron/main.ts`

**Add this handler with the other overlay handlers:**
```typescript
ipcMain.handle('overlay:set-locked', (_e, locked: boolean) => {
  if (!overlayWindow) return;
  overlayWindow.setMovable(!locked);
});
```

### Step 4: Add TypeScript Type

**File:** `ui/types/global.d.ts`

**Add to the `hexcall` interface:**
```typescript
setOverlayLocked?: (locked: boolean) => Promise<void>;
```

### Step 5: Add Preload Function

**File:** `electron/preload.ts`

**Add to the exposed API:**
```typescript
setOverlayLocked: (locked: boolean) => ipcRenderer.invoke('overlay:set-locked', locked),
```

**Done!** Now users can lock the overlay to prevent accidental drags.

---

## 3. 🎨 More Overlay Themes (30 minutes)

**Impact:** Fun customization, makes HexCall feel more personalized.

**File:** `lib/overlayThemes.ts`

**Add these new themes to the `overlayThemes` object:**

```typescript
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    colors: {
      background: 'bg-fuchsia-950/90',
      border: 'ring-fuchsia-500/50',
      accent: 'ring-cyan-400',
      speaking: 'ring-fuchsia-400 shadow-lg shadow-fuchsia-400/50',
    },
    effects: {
      blur: 'backdrop-blur-md',
      shadow: 'shadow-2xl shadow-fuchsia-500/30',
      scale: 1.15,
    },
    opacity: {
      base: 0.85,
      hover: 1,
    },
  },
  
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      background: 'bg-black/40',
      border: 'ring-white/20',
      accent: 'ring-white/40',
      speaking: 'ring-white shadow-sm shadow-white/30',
    },
    effects: {
      blur: 'backdrop-blur-sm',
      shadow: '',
      scale: 1.05,
    },
    opacity: {
      base: 0.6,
      hover: 0.9,
    },
  },
  
  discord: {
    id: 'discord',
    name: 'Discord',
    colors: {
      background: 'bg-[#2f3136]/90',
      border: 'ring-[#202225]',
      accent: 'ring-[#5865f2]',
      speaking: 'ring-[#3ba55d] shadow-md shadow-[#3ba55d]/40',
    },
    effects: {
      blur: 'backdrop-blur-lg',
      shadow: '',
      scale: 1.08,
    },
    opacity: {
      base: 0.95,
      hover: 1,
    },
  },
  
  stealth: {
    id: 'stealth',
    name: 'Stealth',
    colors: {
      background: 'bg-black/30',
      border: 'ring-neutral-900/50',
      accent: 'ring-neutral-700',
      speaking: 'ring-neutral-500 shadow-sm',
    },
    effects: {
      blur: 'backdrop-blur-sm',
      shadow: '',
      scale: 1.02,
    },
    opacity: {
      base: 0.4,
      hover: 0.7,
    },
  },
  
  streamer: {
    id: 'streamer',
    name: 'Streamer (High Contrast)',
    colors: {
      background: 'bg-black/95',
      border: 'ring-white/80',
      accent: 'ring-yellow-400',
      speaking: 'ring-green-400 shadow-xl shadow-green-400/60',
    },
    effects: {
      blur: '',
      shadow: 'shadow-2xl',
      scale: 1.2,
    },
    opacity: {
      base: 1,
      hover: 1,
    },
  },
```

**Done!** Users now have 5 new themes to choose from in the overlay context menu.

---

## 4. 📜 Call History (1 hour)

**Impact:** Users can easily rejoin recent calls.

### Step 1: Create History Types

**File:** `lib/callHistory.ts` (create new file)

```typescript
export type CallHistoryEntry = {
  id: string;
  roomId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  participants: Array<{
    id: string;
    name: string;
    iconUrl?: string;
  }>;
  isManualCall: boolean;
  userCode?: string;
};

const HISTORY_KEY = 'hexcall-call-history';
const MAX_HISTORY = 50;
const RETENTION_DAYS = 30;

export function getCallHistory(): CallHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const history: CallHistoryEntry[] = JSON.parse(raw);
    
    // Filter out old entries
    const cutoff = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    return history.filter(entry => entry.startTime > cutoff);
  } catch {
    return [];
  }
}

export function addCallToHistory(entry: Omit<CallHistoryEntry, 'id'>): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getCallHistory();
    const newEntry: CallHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    
    history.unshift(newEntry);
    
    // Keep only most recent entries
    const trimmed = history.slice(0, MAX_HISTORY);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save call history:', e);
  }
}

export function updateCallEnd(roomId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getCallHistory();
    const entry = history.find(e => e.roomId === roomId && !e.endTime);
    if (entry) {
      entry.endTime = Date.now();
      entry.duration = entry.endTime - entry.startTime;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  } catch (e) {
    console.error('Failed to update call history:', e);
  }
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
```

### Step 2: Track Calls in VoiceProvider

**File:** `providers/VoiceProvider.tsx`

**Add import:**
```typescript
import { addCallToHistory, updateCallEnd } from '../lib/callHistory';
```

**In the auto-join useEffect (where it calls `join()`), add:**
```typescript
if (auto && roomId && !connected) {
  console.log('[VoiceProvider] Auto-joining room:', roomId, 'isManualCall:', isManualCall);
  try { playSound('connect'); } catch {}
  join(true);
  
  // Track call start
  addCallToHistory({
    roomId,
    startTime: Date.now(),
    participants: connectedPeers || [],
    isManualCall,
    userCode: isManualCall ? userCode : undefined,
  });
}
```

**In the leave/cleanup logic, add:**
```typescript
const manualLeave = async (): Promise<void> => {
  if (roomId) {
    updateCallEnd(roomId);
  }
  await leave();
  setIsManualCall(false);
  setRoomId(undefined);
  setIsHost(false);
};
```

### Step 3: Create History UI Component

**File:** `components/CallHistory.tsx` (create new file)

```tsx
import { useState, useEffect } from 'react';
import { getCallHistory, formatDuration, type CallHistoryEntry } from '../lib/callHistory';
import { FaPhone, FaClock, FaUsers } from 'react-icons/fa6';

export function CallHistory({ onRejoin }: { onRejoin?: (code: string) => void }) {
  const [history, setHistory] = useState<CallHistoryEntry[]>([]);
  
  useEffect(() => {
    setHistory(getCallHistory());
  }, []);
  
  if (history.length === 0) {
    return (
      <div className="text-center text-neutral-500 py-8">
        No recent calls
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {history.map(entry => (
        <div
          key={entry.id}
          className="bg-neutral-800/50 rounded-lg p-3 flex items-center justify-between hover:bg-neutral-800/70 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FaClock className="w-3 h-3 text-neutral-400" />
              {new Date(entry.startTime).toLocaleString()}
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
              {entry.duration && (
                <span>Duration: {formatDuration(entry.duration)}</span>
              )}
              <span className="flex items-center gap-1">
                <FaUsers className="w-3 h-3" />
                {entry.participants.length}
              </span>
              {entry.isManualCall && entry.userCode && (
                <span className="font-mono bg-neutral-700/50 px-2 py-0.5 rounded">
                  {entry.userCode}
                </span>
              )}
            </div>
          </div>
          
          {entry.isManualCall && entry.userCode && onRejoin && (
            <button
              onClick={() => onRejoin(entry.userCode!)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
            >
              <FaPhone className="w-3 h-3" />
              Rejoin
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Step 4: Add to Main Page

**File:** `pages/index.tsx`

**Add import:**
```typescript
import { CallHistory } from '../components/CallHistory';
```

**Add a new section in the UI (after the join/create buttons):**
```tsx
<div className="mt-8">
  <h3 className="text-lg font-semibold mb-3">Recent Calls</h3>
  <CallHistory onRejoin={(code) => joinByCode(code)} />
</div>
```

**Done!** Now users can see and rejoin recent calls.

---

## 5. 📜 In-App Changelog (30 minutes)

**Impact:** Better communication with users about new features.

### Step 1: Create Changelog Component

**File:** `components/Changelog.tsx` (create new file)

```tsx
import { useState, useEffect } from 'react';
import { FaX } from 'react-icons/fa6';

type Release = {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
};

export function Changelog({ onClose }: { onClose: () => void }) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('https://api.github.com/repos/johngibsondesign/hexcall/releases')
      .then(r => r.json())
      .then(data => {
        setReleases(data.slice(0, 5)); // Show last 5 releases
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-xl font-bold">What's New</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <FaX className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-neutral-500 py-8">
              Loading changelog...
            </div>
          ) : releases.length === 0 ? (
            <div className="text-center text-neutral-500 py-8">
              No releases found
            </div>
          ) : (
            releases.map(release => (
              <div key={release.tag_name} className="border-l-2 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{release.name}</h3>
                  <span className="text-xs text-neutral-500">
                    {new Date(release.published_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-neutral-300 whitespace-pre-wrap">
                  {release.body}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Add to Main Layout

**File:** `pages/_app.tsx`

**Add state:**
```typescript
const [showChangelog, setShowChangelog] = useState(false);
```

**Add import:**
```typescript
import { Changelog } from '../components/Changelog';
```

**Add button to open changelog (in the main layout, maybe in a help menu):**
```tsx
<button
  onClick={() => setShowChangelog(true)}
  className="text-sm text-neutral-400 hover:text-white transition-colors"
>
  What's New
</button>
```

**Add modal at the end of the component:**
```tsx
{showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
```

### Step 3: Auto-Show on First Launch After Update

**Add this effect in `_app.tsx`:**
```typescript
useEffect(() => {
  const lastSeenVersion = localStorage.getItem('hexcall-last-seen-version');
  const currentVersion = '1.4.3'; // Get from package.json in real implementation
  
  if (lastSeenVersion !== currentVersion) {
    // New version! Show changelog
    setTimeout(() => setShowChangelog(true), 1000);
    localStorage.setItem('hexcall-last-seen-version', currentVersion);
  }
}, []);
```

**Done!** Users will now see what's new after updates.

---

## 🚀 Testing Your Changes

After implementing these quick wins:

1. **Test Noise Suppression:**
   - Join a call
   - Type on keyboard while talking
   - Noise should be much quieter

2. **Test Position Lock:**
   - Enable in settings
   - Try to drag overlay
   - Should not move

3. **Test New Themes:**
   - Right-click overlay
   - Try each new theme
   - Verify colors and effects

4. **Test Call History:**
   - Join a call
   - Leave the call
   - Check history on main page
   - Try rejoining

5. **Test Changelog:**
   - Click "What's New"
   - Verify GitHub releases load
   - Close modal

---

## 📈 Expected Impact

After these 5 changes:
- ✅ Better audio quality (noise suppression)
- ✅ Better UX (no accidental drags)
- ✅ More personalization (themes)
- ✅ Easier reconnection (history)
- ✅ Better communication (changelog)

**Total time:** ~2 hours
**User satisfaction:** 📈📈📈

---

## 🎯 Next Steps

After completing these quick wins, consider:
1. Connection status indicator (colors)
2. Push-to-mute
3. In-game notifications
4. Keyboard shortcut customization

See `RECOMMENDATIONS.md` for the full list!
