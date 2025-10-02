# Migration Guide: Using New Utilities

## Quick Reference for Updated Code Patterns

### 1. Replace console.log with logger

#### Before:
```typescript
console.log('[VoiceProvider] Connected:', connected);
console.log('[VoiceProvider] Room ID:', roomId);
console.error('[VoiceProvider] Error:', error);
```

#### After:
```typescript
import { logger } from '../lib/logger';

logger.debug('[VoiceProvider] Connected:', connected);
logger.debug('[VoiceProvider] Room ID:', roomId);
logger.error('[VoiceProvider] Error:', error);
```

---

### 2. Replace Magic Numbers with Constants

#### Before:
```typescript
setTimeout(pollLCU, 5000);
if (reconnectAttempts >= 5) return;
if (age > 60000) { /* cleanup */ }
```

#### After:
```typescript
import { LCU_POLLING, VOICE, CACHE } from '../lib/constants';

setTimeout(pollLCU, LCU_POLLING.NORMAL_INTERVAL);
if (reconnectAttempts >= VOICE.MAX_RECONNECT_ATTEMPTS) return;
if (age > CACHE.PRESENCE_META_TTL) { /* cleanup */ }
```

---

### 3. Use ReconnectionManager for Retry Logic

#### Before:
```typescript
let attempts = 0;
const maxAttempts = 5;
let delay = 1000;

function retry() {
  if (attempts >= maxAttempts) {
    console.error('Max attempts reached');
    return;
  }
  
  attempts++;
  delay *= 2;
  
  setTimeout(async () => {
    try {
      await connect();
      attempts = 0;
      delay = 1000;
    } catch {
      retry();
    }
  }, delay);
}
```

#### After:
```typescript
import { ReconnectionManager } from '../lib/reconnection';
import { VOICE } from '../lib/constants';

const reconnectionManager = new ReconnectionManager({
  maxAttempts: VOICE.MAX_RECONNECT_ATTEMPTS,
  initialDelay: VOICE.RECONNECT_DELAY,
  maxDelay: VOICE.MAX_RECONNECT_DELAY,
  onReconnect: async () => {
    await connect();
  },
  onStateChange: (state) => {
    logger.info('[Connection] State:', state);
  }
});

// On connection failure:
reconnectionManager.schedule();

// On successful connection:
reconnectionManager.reset();

// On cleanup:
reconnectionManager.destroy();
```

---

### 4. Wrap Components in Error Boundaries

#### For Individual Components:
```typescript
import { ErrorBoundary } from '../components/ErrorBoundary';

export function MyComponent() {
  return (
    <ErrorBoundary fallback={<MyCustomError />}>
      <SomeComplexComponent />
    </ErrorBoundary>
  );
}
```

#### Already Done Globally:
The entire app is already wrapped in `_app.tsx`, so individual components are protected.

---

### 5. Use Constants for Game Phase Checks

#### Before:
```typescript
if (['ChampSelect', 'InProgress'].includes(phase)) {
  // Show champion icons
}

if (['Matchmaking', 'ReadyCheck', 'ChampSelect', 'InProgress', 'Lobby'].includes(phase)) {
  // Auto-join
}
```

#### After:
```typescript
import { GAME_PHASES } from '../lib/constants';

if (GAME_PHASES.CHAMPION_ICON_PHASES.includes(phase)) {
  // Show champion icons
}

if (GAME_PHASES.AUTO_JOIN_PHASES.includes(phase)) {
  // Auto-join
}
```

---

### 6. Use Role Constants for Sorting

#### Before:
```typescript
const roleOrder = ['top', 'jungle', 'mid', 'adc', 'support', 'bottom'];
const roleColors = {
  top: 'bg-blue-400',
  jungle: 'bg-green-400',
  mid: 'bg-yellow-400',
  adc: 'bg-red-400',
  support: 'bg-purple-400',
};
```

#### After:
```typescript
import { ROLE_ORDER, ROLE_COLORS } from '../lib/constants';

// Use directly:
const sortedTeam = team.sort((a, b) => {
  const aIndex = ROLE_ORDER.indexOf(a.role);
  const bIndex = ROLE_ORDER.indexOf(b.role);
  return aIndex - bIndex;
});

// Apply colors:
<div className={ROLE_COLORS[player.role] || 'bg-neutral-400'} />
```

---

## Search & Replace Patterns (VS Code)

### Find all console.log and replace with logger.debug:

**Find (Regex):**
```
console\.log\(
```

**Replace with:**
```typescript
logger.debug(
```

Don't forget to add the import at the top:
```typescript
import { logger } from '../lib/logger';
```

---

### Find hardcoded polling intervals:

**Find (Regex):**
```
setTimeout\(.+,\s*5000\)
```

**Check each instance and replace with:**
```typescript
setTimeout(..., LCU_POLLING.NORMAL_INTERVAL)
```

---

## Common Patterns Reference

### LCU Polling Interval Selection:
```typescript
import { LCU_POLLING } from '../lib/constants';

let interval = LCU_POLLING.NORMAL_INTERVAL;

// Adjust based on state:
if (needsFastPolling) {
  interval = LCU_POLLING.FAST_INTERVAL;
} else if (isIdle) {
  interval = LCU_POLLING.SLOW_INTERVAL;
}

setTimeout(poll, interval);
```

---

### Voice Configuration:
```typescript
import { VOICE } from '../lib/constants';

const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
analyser.smoothingTimeConstant = 0.8;

// Use VAD threshold:
const speaking = rms > VOICE.VAD_THRESHOLD;

// Configure constraints:
const constraints = {
  audio: VOICE.DEFAULT_CONSTRAINTS,
};
```

---

### Cache Management:
```typescript
import { CACHE } from '../lib/constants';

// Check if cache is expired:
const age = Date.now() - cachedData.timestamp;
if (age > CACHE.SUMMONER_CACHE_DURATION) {
  // Refresh cache
}

// Limit presence entries:
const recentPresence = allPresence
  .filter(p => Date.now() - p.ts < CACHE.PRESENCE_META_TTL)
  .slice(0, CACHE.MAX_PRESENCE_ENTRIES);
```

---

## Debugging Tips

### Enable Verbose Logging:
```javascript
// In browser console:
__hexcall_debug_enable()
// Then reload

// To disable:
__hexcall_debug_disable()
```

### Check localStorage Size:
```javascript
let total = 0;
for (let key in localStorage) {
  if (key.startsWith('hexcall-')) {
    const size = localStorage[key].length;
    total += size;
    console.log(key, (size / 1024).toFixed(2) + 'KB');
  }
}
console.log('Total:', (total / 1024).toFixed(2) + 'KB');
```

### Monitor Reconnection State:
```typescript
reconnectionManager.getAttempts(); // Current attempt count
```

---

## Testing Your Changes

After migrating to new utilities:

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Check for TypeScript errors:**
   ```bash
   npx tsc --noEmit
   ```

3. **Test in development:**
   ```bash
   npm run dev
   ```

4. **Verify no console spam in production build**

5. **Test reconnection logic** by simulating network drops

6. **Check localStorage** doesn't grow unbounded

---

## Rollback Plan

If you need to revert any changes:

1. **Logger:** Just change `logger.debug` back to `console.log`
2. **Constants:** Replace imports with hardcoded values
3. **Error Boundary:** Remove wrapper from `_app.tsx`
4. **ReconnectionManager:** Use old reconnection code

All original functionality is preserved - these are enhancements, not breaking changes.

---

## Questions?

Check `IMPROVEMENTS.md` for detailed documentation of all changes.
