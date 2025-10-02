/**
 * Reconnection utility with exponential backoff
 * Helper class for managing connection retry logic
 */

export interface ReconnectionConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  onReconnect: () => Promise<void>;
  onStateChange?: (state: 'connecting' | 'connected' | 'failed') => void;
}

export class ReconnectionManager {
  private attempts: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private destroyed: boolean = false;

  constructor(private config: ReconnectionConfig) {}

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  schedule(): void {
    if (this.destroyed || this.attempts >= this.config.maxAttempts) {
      if (this.attempts >= this.config.maxAttempts) {
        console.error('[ReconnectionManager] Max attempts reached');
        this.config.onStateChange?.('failed');
      }
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.attempts++;
    const delay = Math.min(
      this.config.initialDelay * Math.pow(2, this.attempts - 1),
      this.config.maxDelay
    );

    console.log(
      `[ReconnectionManager] Scheduling attempt ${this.attempts}/${this.config.maxAttempts} in ${delay}ms`
    );
    
    this.config.onStateChange?.('connecting');

    this.timer = setTimeout(async () => {
      if (this.destroyed) return;

      try {
        console.log('[ReconnectionManager] Attempting reconnection...');
        await this.config.onReconnect();
        this.reset(); // Success - reset counters
      } catch (error) {
        console.error('[ReconnectionManager] Attempt failed:', error);
        this.schedule(); // Try again
      }
    }, delay);
  }

  /**
   * Reset reconnection state after successful connection
   */
  reset(): void {
    this.attempts = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.config.onStateChange?.('connected');
  }

  /**
   * Cancel any pending reconnection attempts
   */
  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Cleanup and prevent further reconnections
   */
  destroy(): void {
    this.destroyed = true;
    this.cancel();
  }

  /**
   * Get current attempt count
   */
  getAttempts(): number {
    return this.attempts;
  }
}
