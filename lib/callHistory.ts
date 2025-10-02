/**
 * Call History Module
 * Tracks past voice calls with timestamps and participant info
 */

export interface CallHistoryEntry {
  id: string; // room ID
  type: 'league' | 'manual';
  startTime: number;
  endTime?: number;
  duration?: number; // in seconds
  participants: string[]; // user IDs
  code?: string; // for manual calls
}

const STORAGE_KEY = 'hexcall-call-history';
const MAX_HISTORY_ENTRIES = 20; // Keep last 20 calls

/**
 * Get all call history entries
 */
export function getCallHistory(): CallHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const history: CallHistoryEntry[] = JSON.parse(stored);
    return history.sort((a, b) => b.startTime - a.startTime); // Most recent first
  } catch (error) {
    console.warn('[CallHistory] Failed to load history:', error);
    return [];
  }
}

/**
 * Start tracking a new call
 */
export function startCall(roomId: string, type: 'league' | 'manual', code?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getCallHistory();
    
    // Check if call already exists (prevent duplicates)
    const existing = history.find(entry => entry.id === roomId && !entry.endTime);
    if (existing) {
      console.log('[CallHistory] Call already being tracked:', roomId);
      return;
    }
    
    const newEntry: CallHistoryEntry = {
      id: roomId,
      type,
      startTime: Date.now(),
      participants: [],
      code
    };
    
    history.unshift(newEntry);
    
    // Trim to max entries
    const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    console.log('[CallHistory] Started tracking call:', roomId, type);
  } catch (error) {
    console.warn('[CallHistory] Failed to start call:', error);
  }
}

/**
 * End tracking a call
 */
export function endCall(roomId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getCallHistory();
    
    const entry = history.find(e => e.id === roomId && !e.endTime);
    if (!entry) {
      console.log('[CallHistory] No active call to end:', roomId);
      return;
    }
    
    entry.endTime = Date.now();
    entry.duration = Math.floor((entry.endTime - entry.startTime) / 1000); // seconds
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    console.log('[CallHistory] Ended call:', roomId, `${entry.duration}s`);
  } catch (error) {
    console.warn('[CallHistory] Failed to end call:', error);
  }
}

/**
 * Update participants in current call
 */
export function updateCallParticipants(roomId: string, participants: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getCallHistory();
    
    const entry = history.find(e => e.id === roomId && !e.endTime);
    if (!entry) return;
    
    entry.participants = participants;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('[CallHistory] Failed to update participants:', error);
  }
}

/**
 * Clear all call history
 */
export function clearCallHistory(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[CallHistory] Cleared all history');
  } catch (error) {
    console.warn('[CallHistory] Failed to clear history:', error);
  }
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${secs}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours}h ${mins}m`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  // If today, show time only
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  
  // If this week, show day + time
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  
  // Otherwise show date + time
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
