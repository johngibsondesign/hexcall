/**
 * Cache for League of Legends summoner data
 * Stores summoner information for use in manual calls when League client isn't running
 */

export interface CachedSummonerData {
  summonerName?: string;
  gameName?: string;
  tagLine?: string;
  profileIconId?: number;
  puuid?: string;
  summonerId?: string;
  accountId?: string;
  lastUpdated: number;
  // Current game state for icon switching
  currentPhase?: string;
  championName?: string;
  championId?: number;
}

const CACHE_KEY = 'hexcall-summoner-cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Save summoner data to cache
 */
export function cacheSummonerData(data: Omit<CachedSummonerData, 'lastUpdated'>): void {
  try {
    const cachedData: CachedSummonerData = {
      ...data,
      lastUpdated: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
    console.log('[SummonerCache] Cached summoner data:', data.summonerName || data.gameName);
  } catch (error) {
    console.warn('[SummonerCache] Failed to cache summoner data:', error);
  }
}

/**
 * Get cached summoner data if available and not expired
 */
export function getCachedSummonerData(): CachedSummonerData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedSummonerData = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() - data.lastUpdated > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[SummonerCache] Failed to load cached summoner data:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Clear cached summoner data
 */
export function clearSummonerCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('[SummonerCache] Cleared summoner cache');
  } catch (error) {
    console.warn('[SummonerCache] Failed to clear summoner cache:', error);
  }
}

/**
 * Get display name from cached data
 */
export function getCachedDisplayName(): string {
  const cached = getCachedSummonerData();
  if (!cached) return 'You';
  
  return cached.summonerName || cached.gameName || 'You';
}

/**
 * Get full display name with Riot ID (name + tag)
 */
export function getCachedFullDisplayName(): { name: string; riotId?: string } {
  const cached = getCachedSummonerData();
  if (!cached) return { name: 'You' };
  
  const name = cached.summonerName || cached.gameName || 'You';
  const riotId = cached.gameName && cached.tagLine ? `${cached.gameName}#${cached.tagLine}` : undefined;
  
  return { name, riotId };
}

/**
 * Get profile icon URL from cached data
 */
export function getCachedProfileIconUrl(): string | undefined {
  const cached = getCachedSummonerData();
  if (!cached?.profileIconId) return undefined;
  
  // Use latest version for profile icons
  return `https://ddragon.leagueoflegends.com/cdn/14.20.1/img/profileicon/${cached.profileIconId}.png`;
}

/**
 * Get champion icon URL from cached data
 */
export function getCachedChampionIconUrl(): string | undefined {
  const cached = getCachedSummonerData();
  if (!cached?.championName) return undefined;
  
  // Use latest version for champion icons
  return `https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/${cached.championName}.png`;
}

/**
 * Get the appropriate icon URL based on current game phase
 * Returns summoner icon unless game is InProgress, then returns champion icon
 */
export function getCachedIconUrl(currentPhase?: string): string | undefined {
  const cached = getCachedSummonerData();
  if (!cached) return undefined;
  
  // Use champion icon if in game and we have champion data
  if (currentPhase === 'InProgress' && cached.championName) {
    return getCachedChampionIconUrl();
  }
  
  // Otherwise use summoner icon
  return getCachedProfileIconUrl();
}

/**
 * Update the current game phase and champion info in cache
 */
export function updateGameState(phase: string, championName?: string, championId?: number): void {
  const cached = getCachedSummonerData();
  if (!cached) return;
  
  try {
    const updatedData: CachedSummonerData = {
      ...cached,
      currentPhase: phase,
      championName: championName || cached.championName,
      championId: championId || cached.championId,
      lastUpdated: Date.now()
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(updatedData));
    console.log('[SummonerCache] Updated game state:', phase, championName);
  } catch (error) {
    console.warn('[SummonerCache] Failed to update game state:', error);
  }
}
