/**
 * Centralized logging utility for HexCall
 * Prevents console spam in production while maintaining debug visibility in development
 */

const isDev = process.env.NODE_ENV === 'development';
const isDebugEnabled = typeof window !== 'undefined' && localStorage.getItem('hexcall-debug') === 'true';

export const logger = {
  /**
   * Debug-level logging - only shown in development or when debug mode is enabled
   */
  debug: (...args: any[]) => {
    if (isDev || isDebugEnabled) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info-level logging - shown in all environments
   */
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Warning-level logging - shown in all environments
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error-level logging - shown in all environments
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Enable/disable debug mode at runtime
   */
  setDebugMode: (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hexcall-debug', enabled ? 'true' : 'false');
      console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}. Reload to see changes.`);
    }
  }
};

// Expose debug mode toggle globally for easy access
if (typeof window !== 'undefined') {
  (window as any).__hexcall_debug_enable = () => logger.setDebugMode(true);
  (window as any).__hexcall_debug_disable = () => logger.setDebugMode(false);
}
