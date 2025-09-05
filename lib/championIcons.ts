const DEFAULT_DD_VER = '14.20.1';

export interface ChampionIconOptions {
  championName?: string;
  championId?: string | number;
  version?: string;
  fallbackToProfileIcon?: boolean;
  profileIconId?: string | number;
}

export class ChampionIconLoader {
  private static cache = new Map<string, string>();
  private static failedUrls = new Set<string>();

  /**
   * Get champion icon URL with multiple fallback strategies
   */
  static getChampionIconUrl(options: ChampionIconOptions): string[] {
    const {
      championName,
      championId,
      version = DEFAULT_DD_VER,
      fallbackToProfileIcon = true,
      profileIconId
    } = options;

    const urls: string[] = [];

    // Strategy 1: Direct champion name
    if (championName) {
      urls.push(`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`);
      
      // Try with different version if current fails
      if (version !== DEFAULT_DD_VER) {
        urls.push(`https://ddragon.leagueoflegends.com/cdn/${DEFAULT_DD_VER}/img/champion/${championName}.png`);
      }
      
      // Try loading screen version
      urls.push(`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championName}_0.jpg`);
      
      // Try splash art (smaller)
      urls.push(`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg`);
    }

    // Strategy 2: Champion ID (requires mapping)
    if (championId && !championName) {
      // This would need the champion mapping, but we'll add a generic fallback
      urls.push(`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/loading/Champion${championId}_0.jpg`);
    }

    // Strategy 3: Profile icon fallback
    if (fallbackToProfileIcon && profileIconId) {
      urls.push(`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`);
      if (version !== DEFAULT_DD_VER) {
        urls.push(`https://ddragon.leagueoflegends.com/cdn/${DEFAULT_DD_VER}/img/profileicon/${profileIconId}.png`);
      }
    }

    // Strategy 4: Generic fallbacks
    urls.push(`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/29.png`); // Default Riot icon
    
    // Filter out previously failed URLs
    return urls.filter(url => !this.failedUrls.has(url));
  }

  /**
   * Load champion icon with automatic fallback
   */
  static async loadChampionIcon(options: ChampionIconOptions): Promise<string | null> {
    const cacheKey = JSON.stringify(options);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const urls = this.getChampionIconUrl(options);
    
    for (const url of urls) {
      try {
        const success = await this.testImageUrl(url);
        if (success) {
          this.cache.set(cacheKey, url);
          return url;
        } else {
          this.failedUrls.add(url);
        }
      } catch {
        this.failedUrls.add(url);
        continue;
      }
    }

    return null; // All fallbacks failed
  }

  /**
   * Test if an image URL is valid
   */
  private static testImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      
      // Timeout after 3 seconds
      setTimeout(() => resolve(false), 3000);
    });
  }

  /**
   * Preload champion icons for better performance
   */
  static async preloadChampionIcons(teammates: any[]): Promise<void> {
    const loadPromises = teammates.map(async (teammate) => {
      if (teammate.championName || teammate.championId) {
        await this.loadChampionIcon({
          championName: teammate.championName,
          championId: teammate.championId,
          profileIconId: teammate.profileIconId
        });
      }
    });

    await Promise.allSettled(loadPromises);
  }

  /**
   * Clear cache (useful for memory management)
   */
  static clearCache(): void {
    this.cache.clear();
    this.failedUrls.clear();
  }

  /**
   * Get cache stats for debugging
   */
  static getCacheStats() {
    return {
      cacheSize: this.cache.size,
      failedUrlsCount: this.failedUrls.size
    };
  }
}

// Note: React hook moved to components/ChampionIcon.tsx to avoid import issues
