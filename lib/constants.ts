/**
 * Global constants for HexCall application
 * Centralizes all magic numbers and configuration values
 */

// ============================================================================
// LCU POLLING
// ============================================================================
export const LCU_POLLING = {
  /** Default polling interval when League is running normally (5 seconds) */
  NORMAL_INTERVAL: 5000,
  
  /** Fast polling when data is missing or critical phase (1 second) */
  FAST_INTERVAL: 1000,
  
  /** Slow polling when not in lobby or game (10 seconds) */
  SLOW_INTERVAL: 10000,
  
  /** Request timeout for LCU API calls */
  REQUEST_TIMEOUT: 2000,
  
  /** Max consecutive failures before switching to slow polling */
  MAX_FAILURES_BEFORE_SLOW: 3,
} as const;

// ============================================================================
// VOICE & WEBRTC
// ============================================================================
export const VOICE = {
  /** Default VAD (Voice Activity Detection) threshold */
  VAD_THRESHOLD: 0.01,
  
  /** Max reconnection attempts before giving up */
  MAX_RECONNECT_ATTEMPTS: 5,
  
  /** Initial reconnection delay in ms */
  RECONNECT_DELAY: 1000,
  
  /** Max reconnection delay (exponential backoff cap) */
  MAX_RECONNECT_DELAY: 30000,
  
  /** Interval for collecting connection stats */
  STATS_COLLECTION_INTERVAL: 1000,
  
  /** Audio buffer size for jitter reduction */
  MAX_AUDIO_BUFFER_SIZE: 10,
  
  /** Default audio constraints */
  DEFAULT_CONSTRAINTS: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
} as const;

// ============================================================================
// CACHE & STORAGE
// ============================================================================
export const CACHE = {
  /** Summoner data cache duration (7 days) */
  SUMMONER_CACHE_DURATION: 7 * 24 * 60 * 60 * 1000,
  
  /** Presence metadata TTL (1 minute) */
  PRESENCE_META_TTL: 60000,
  
  /** Max number of presence entries to keep */
  MAX_PRESENCE_ENTRIES: 20,
  
  /** Champion icon cache version */
  CHAMPION_ICON_VERSION: '14.20.1',
} as const;

// ============================================================================
// UI & UX
// ============================================================================
export const UI = {
  /** Call switch modal countdown (10 seconds) */
  CALL_SWITCH_COUNTDOWN: 10,
  
  /** Overlay hover delay before showing controls */
  OVERLAY_HOVER_DELAY: 200,
  
  /** Toast auto-dismiss duration */
  TOAST_DURATION: 5000,
  
  /** Reconnection toast duration (shorter) */
  RECONNECT_TOAST_DURATION: 3000,
  
  /** Debounce delay for volume slider */
  VOLUME_SLIDER_DEBOUNCE: 100,
  
  /** Participant card animation duration */
  PARTICIPANT_ANIMATION_DURATION: 300,
} as const;

// ============================================================================
// HOTKEYS
// ============================================================================
export const HOTKEYS = {
  /** Toggle overlay visibility */
  TOGGLE_OVERLAY: 'CommandOrControl+Shift+H',
  
  /** Quick mute toggle */
  TOGGLE_MUTE: 'CommandOrControl+Shift+M',
  
  /** Default push-to-talk key */
  DEFAULT_PTT_KEY: 'CapsLock',
} as const;

// ============================================================================
// OVERLAY
// ============================================================================
export const OVERLAY = {
  /** Default window size */
  DEFAULT_WIDTH: 44,
  DEFAULT_HEIGHT: 44,
  
  /** Position margin from screen edge */
  POSITION_MARGIN: 12,
  
  /** Default scale */
  DEFAULT_SCALE: 1.0,
  
  /** Min/max scale limits */
  MIN_SCALE: 0.75,
  MAX_SCALE: 1.5,
  
  /** Default corner position */
  DEFAULT_CORNER: 'top-right' as const,
} as const;

// ============================================================================
// NETWORK
// ============================================================================
export const NETWORK = {
  /** ICE candidate gathering timeout */
  ICE_GATHERING_TIMEOUT: 3000,
  
  /** Offer creation timeout */
  OFFER_TIMEOUT: 5000,
  
  /** Answer creation timeout */
  ANSWER_TIMEOUT: 5000,
  
  /** Connection quality check interval */
  QUALITY_CHECK_INTERVAL: 5000,
  
  /** Packet loss threshold for "poor" quality */
  POOR_QUALITY_PACKET_LOSS: 0.05, // 5%
  
  /** Latency threshold for "poor" quality */
  POOR_QUALITY_LATENCY: 200, // 200ms
} as const;

// ============================================================================
// USER CODES
// ============================================================================
export const USER_CODE = {
  /** Length of user join codes */
  LENGTH: 6,
  
  /** Valid characters for codes */
  CHARSET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
} as const;

// ============================================================================
// AUTO-UPDATE
// ============================================================================
export const AUTO_UPDATE = {
  /** Check for updates on startup */
  CHECK_ON_STARTUP: true,
  
  /** Auto-download updates (should be false) */
  AUTO_DOWNLOAD: false,
  
  /** Auto-install on app quit */
  AUTO_INSTALL_ON_QUIT: true,
  
  /** Delay before installing after download */
  INSTALL_DELAY: 1000,
} as const;

// ============================================================================
// GAME PHASES
// ============================================================================
export const GAME_PHASES = {
  /** Phases where voice auto-join should work */
  AUTO_JOIN_PHASES: ['Matchmaking', 'ReadyCheck', 'ChampSelect', 'InProgress', 'Lobby'] as const,
  
  /** Phases where champion icons should be shown */
  CHAMPION_ICON_PHASES: ['ChampSelect', 'InProgress', 'EndOfGame'] as const,
  
  /** Phases where overlay should be visible */
  OVERLAY_VISIBLE_PHASES: ['InProgress'] as const,
} as const;

// ============================================================================
// ROLE SORTING
// ============================================================================
export const ROLE_ORDER = ['top', 'jungle', 'mid', 'adc', 'support', 'bottom'] as const;

export const ROLE_COLORS = {
  top: 'bg-blue-400',
  jungle: 'bg-green-400',
  mid: 'bg-yellow-400',
  adc: 'bg-red-400',
  support: 'bg-purple-400',
} as const;
