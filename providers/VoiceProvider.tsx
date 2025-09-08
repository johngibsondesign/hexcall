import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useVoiceRoom } from '../hooks/useVoiceRoom';
import { cacheSummonerData, getCachedSummonerData, getCachedDisplayName, getCachedFullDisplayName, getCachedIconUrl, updateGameState } from '../lib/summonerCache';

type VoiceContextValue = {
  muted: boolean;
  setMuted: (m: boolean) => void;
  joinedRoomId?: string;
  connected?: boolean;
  joinCall?: (forceAlone?: boolean) => Promise<void> | void;
  leaveCall?: () => Promise<void> | void;
  speakingUsers?: Set<string>;
  isSelfSpeaking?: boolean;
  userCode?: string;
  setUserVolume?: (userId: string, volume: number) => void;
  getUserVolume?: (userId: string) => number;
  getUserVolumes?: () => Record<string, number>;
  setPushToTalkEnabled?: (enabled: boolean) => void;
  setPushToTalkActive?: (active: boolean) => void;
  connectionStats?: import('../modules/webrtc/voiceClient').ConnectionStats | null;
  joinByCode?: (code: string) => Promise<void> | void;
  createManualCall?: () => Promise<string> | string;
  connectedPeers?: Array<{id: string, name?: string, riotId?: string, iconUrl?: string, isSelf?: boolean}>;
  isHost?: boolean;
  banUser?: (userId: string) => void;
  kickUser?: (userId: string) => void;
};

const VoiceContext = createContext<VoiceContextValue>({ muted: false, setMuted: () => {} });

async function getStableUserId(): Promise<string> {
  console.log('[VoiceProvider] getStableUserId called, window available:', typeof window !== 'undefined');
  if (typeof window === 'undefined') return 'user';
  try {
    console.log('[VoiceProvider] Getting profile from IPC...');
    // Include profile in the key for testing with multiple instances
    const profile = await window.hexcall?.getProfile?.() || '';
    console.log('[VoiceProvider] Profile received:', profile);
    const key = profile ? `hexcall-user-id-${profile}` : 'hexcall-user-id';
    console.log('[VoiceProvider] Using localStorage key:', key);
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
      console.log(`[VoiceProvider] Generated new user ID for profile '${profile}':`, id);
    } else {
      console.log(`[VoiceProvider] Using existing user ID for profile '${profile}':`, id);
    }
    return id;
  } catch (error) {
    console.error('[VoiceProvider] Error in getStableUserId:', error);
    return 'user';
  }
}

function generateUserCode(): string {
  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getUserCode(): string {
  if (typeof window === 'undefined') return 'DEMO01';
  try {
    const key = 'hexcall-user-code';
    let code = localStorage.getItem(key);
    if (!code) {
      code = generateUserCode();
      localStorage.setItem(key, code);
    }
    return code;
  } catch {
    return 'DEMO01';
  }
}

function deriveRoomId(update: any): string | undefined {
  const lobby = update?.lobby;
  const members: any[] = update?.members || [];
  if (lobby?.partyId) return String(lobby.partyId);
  if (lobby?.lobbyId) return String(lobby.lobbyId);
  if (members.length) {
    return members
      .map((m: any) => m.puuid || m.summonerId || m.accountId || m.gameName || m.summonerName)
      .filter(Boolean)
      .sort()
      .join('-')
      .slice(0, 64);
  }
  return undefined;
}

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [micDeviceId, setMicDeviceId] = useState<string | undefined>(undefined);
  const [isManualCall, setIsManualCall] = useState(false);
  const [currentGamePhase, setCurrentGamePhase] = useState<string>('Unknown');
  const [userId, setUserId] = useState<string>('local-loading');
  const [userIdReady, setUserIdReady] = useState(false);
  const [userCode, setUserCode] = useState<string>('DEMO01');
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    // Initialize user ID asynchronously
    console.log('[VoiceProvider] Starting async user ID initialization...');
    getStableUserId().then(id => {
      const fullUserId = 'local-' + id;
      console.log('[VoiceProvider] Async user ID resolved:', fullUserId);
      setUserId(fullUserId);
      setUserIdReady(true);
    }).catch(error => {
      console.error('[VoiceProvider] Error getting user ID:', error);
      const fallbackId = 'local-fallback-' + Math.random().toString(36).substr(2, 9);
      console.log('[VoiceProvider] Using fallback user ID:', fallbackId);
      setUserId(fallbackId);
      setUserIdReady(true);
    });
    
    // Only set the real user code on the client side to avoid hydration mismatch
    setUserCode(getUserCode());
  }, []);

  const { connected, join, leave, mute, speakingUsers, isSelfSpeaking, setUserVolume, getUserVolume, getUserVolumes, setPushToTalkEnabled, setPushToTalkActive, connectionStats, peerIds, updatePresence } = useVoiceRoom(roomId || 'idle', userId, micDeviceId);


  useEffect(() => {
    const offUpdate = window.hexcall?.onLcuUpdate?.((payload: any) => {
      const phase = payload?.phase || 'Unknown';
      setCurrentGamePhase(phase);
      
      // Find current player's champion data from session
      let playerChampionName: string | undefined;
      let playerChampionId: number | undefined;
      
      if (payload?.session?.gameData?.playerChampionSelections && payload?.self?.puuid) {
        const playerSelection = payload.session.gameData.playerChampionSelections.find(
          (p: any) => p.puuid === payload.self.puuid
        );
        if (playerSelection) {
          playerChampionName = playerSelection.championName;
          playerChampionId = playerSelection.championId;
        }
      }

      // Cache summoner data when available
      if (payload?.self && (payload.self.summonerName || payload.self.gameName)) {
        cacheSummonerData({
          summonerName: payload.self.summonerName,
          gameName: payload.self.gameName,
          tagLine: payload.self.tagLine,
          profileIconId: payload.self.profileIconId,
          puuid: payload.self.puuid,
          summonerId: payload.self.summonerId,
          accountId: payload.self.accountId
        });
      }

      // Update game state in cache (for icon switching)
      updateGameState(phase, playerChampionName, playerChampionId);

      // Don't interfere with manual calls
      if (isManualCall) return;

      const members: any[] = Array.isArray(payload?.members) ? payload.members : [];
      const newRoom = deriveRoomId(payload);

      const allowedPhases = ['Matchmaking', 'ReadyCheck', 'ChampSelect', 'InProgress', 'Lobby'];

      // Only auto-set room when we actually have a party (>=2) and phase allows it
      if (newRoom && allowedPhases.includes(phase) && members.length >= 2) {
        if (newRoom !== roomId) {
          console.log('[VoiceProvider] Auto-joining League room:', newRoom);
          setRoomId(newRoom);
          setIsManualCall(false);
        }
      } else if (phase === 'EndOfGame' || phase === 'NotFound' || !allowedPhases.includes(phase) || members.length < 2) {
        // Only leave auto rooms, not manual ones
        if (roomId && !isManualCall) {
          console.log('[VoiceProvider] Leaving auto room due to phase/member change');
          leave();
          setMuted(false);
          setRoomId(undefined);
        }
      }
    });
    const offHotkey = window.hexcall?.onHotkeyToggleMute?.(() => {
      setMuted((m) => !m);
    });
    return () => {
      offUpdate && offUpdate();
      offHotkey && offHotkey();
    };
  }, [isManualCall, leave]);

  useEffect(() => {
    mute(muted);
  }, [muted, mute]);

  useEffect(() => {
    const auto = typeof window !== 'undefined' ? localStorage.getItem('hexcall-auto-join') !== '0' : true;
    if (auto && roomId && !connected) {
      console.log('[VoiceProvider] Auto-joining room:', roomId, 'isManualCall:', isManualCall);
      // Auto-join for League rooms or manual calls
      // For League rooms, always force join even if alone initially
      join(true);
    }
  }, [roomId, connected, join, isManualCall]);

  // Manual call functions
  const createManualCall = async (): Promise<string> => {
    if (!userIdReady) {
      console.log('[VoiceProvider] Waiting for user ID to be ready before creating call...');
      // Wait for user ID to be ready
      while (!userIdReady) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const callRoom = `manual-${userCode}`;
    console.log('[VoiceProvider] Creating manual call room:', callRoom);
    setIsManualCall(true);
    setRoomId(callRoom);
    try { localStorage.setItem(`hexcall-host-${callRoom}`, userId); } catch {}
    setIsHost(true);
    // Small delay to ensure the new VoiceClient is initialized before auto-join
    setTimeout(() => {
      if (!connected) {
        console.log('[VoiceProvider] Manual call auto-join trigger');
        join(true);
      }
    }, 100);
    return userCode;
  };

  const joinByCode = async (code: string): Promise<void> => {
    if (!userIdReady) {
      console.log('[VoiceProvider] Waiting for user ID to be ready before joining...');
      // Wait for user ID to be ready
      while (!userIdReady) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (!code || code.length !== 6) {
      throw new Error('Please enter a valid 6-character code');
    }
    const callRoom = `manual-${code.toUpperCase()}`;
    console.log('[VoiceProvider] Joining manual call room:', callRoom);
    setIsManualCall(true);
    setRoomId(callRoom);
    try { setIsHost(localStorage.getItem(`hexcall-host-${callRoom}`) === userId); } catch {}
    // Small delay to ensure the new VoiceClient is initialized before auto-join
    setTimeout(() => {
      if (!connected) {
        console.log('[VoiceProvider] Join by code auto-join trigger');
        join(true);
      }
    }, 100);
  };

  const manualLeave = async (): Promise<void> => {
    await leave();
    setIsManualCall(false);
    setRoomId(undefined);
    setIsHost(false);
  };

  // Push our display meta to presence (only when room/user/phase/host changes)
  useEffect(() => {
    if (!roomId || !userId || !updatePresence) return;
    
    // Get fresh metadata
    let displayName = 'User';
    let riotId = '';
    let iconUrl = '';
    
    try {
      const { name, riotId: rId } = getCachedFullDisplayName();
      const iUrl = getCachedIconUrl(currentGamePhase);
      displayName = name || 'User';
      riotId = rId || '';
      iconUrl = iUrl || '';
    } catch {}
    
    const meta: any = { 
      userId, 
      displayName,
      riotId,
      iconUrl,
      connected: true,
      ts: Date.now()
    };
    if (isHost) meta.hostId = userId;
    console.log('[VoiceProvider] Updating presence with user meta:', JSON.stringify(meta, null, 2));
    try { updatePresence?.(meta); } catch {}
  }, [roomId, userId, currentGamePhase, isHost]);

  const banUser = (targetId: string) => {
    if (!roomId || !isHost) return;
    const key = `hexcall-banlist-${roomId}`;
    let list: string[] = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    if (!list.includes(targetId)) list.push(targetId);
    try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
    try { updatePresence?.({ bannedIds: list, hostId: userId }); } catch {}
  };

  const kickUser = (targetId: string) => {
    banUser(targetId);
  };

  const connectedPeers = useMemo(() => {
    const peers = [];
    
    // Debug logging
    console.log('[VoiceProvider] Building connectedPeers:', {
      connected,
      userId,
      peerIds,
      currentGamePhase
    });
    
    // Add yourself first if connected
    if (connected) {
      let selfName = 'User';
      let selfRiotId = '';
      let selfIconUrl = '';
      
      try {
        const { name, riotId } = getCachedFullDisplayName();
        const iconUrl = getCachedIconUrl(currentGamePhase);
        selfName = name || 'User';
        selfRiotId = riotId || '';
        selfIconUrl = iconUrl || '';
      } catch {}
      
      peers.push({
        id: userId,
        name: selfName,
        riotId: selfRiotId,
        iconUrl: selfIconUrl,
        isSelf: true
      });
    }
    
    // Load presence metas to enrich other peers
    let metaMap: Record<string, any> = {};
    try {
      const metasRaw = localStorage.getItem('hexcall-presence-metas') || '[]';
      console.log('[VoiceProvider] Raw presence metas from localStorage:', metasRaw);
      const metas = JSON.parse(metasRaw);
      console.log('[VoiceProvider] Parsed presence metas:', metas);
      metaMap = (metas || []).reduce((acc: any, p: any) => { 
        console.log('[VoiceProvider] Processing meta for peer:', p);
        // Handle both nested meta structure and direct structure
        const peerMeta = p.meta || p;
        acc[p.id] = peerMeta; 
        return acc; 
      }, {});
      console.log('[VoiceProvider] Final metaMap:', metaMap);
    } catch (e) {
      console.error('[VoiceProvider] Error loading presence metas:', e);
    }

    // Add other peers
    const otherPeers = (peerIds || [])
      .filter(id => id !== userId)
      .map(id => {
        console.log(`[VoiceProvider] Building peer ${id}:`, {
          metaExists: !!metaMap[id],
          meta: metaMap[id],
          metaKeys: metaMap[id] ? Object.keys(metaMap[id]) : [],
          displayName: metaMap[id]?.displayName,
          riotId: metaMap[id]?.riotId,
          iconUrl: metaMap[id]?.iconUrl
        });
        return { 
          id,
          name: (metaMap[id]?.displayName) || (id.includes('local-') ? 'User' : id.slice(0, 8)),
          riotId: metaMap[id]?.riotId,
          iconUrl: metaMap[id]?.iconUrl,
          isSelf: false
        };
      });
    
    peers.push(...otherPeers);
    
    console.log('[VoiceProvider] Final connectedPeers:', peers);
    return peers;
  }, [peerIds, userId, connected, currentGamePhase]);

  const value = useMemo(
    () => ({ 
      muted, 
      setMuted, 
      joinedRoomId: roomId, 
      connected, 
      joinCall: join, 
      leaveCall: isManualCall ? manualLeave : leave, 
      speakingUsers, 
      isSelfSpeaking,
      userCode,
      joinByCode,
      createManualCall,
      setUserVolume,
      getUserVolume,
      getUserVolumes,
      setPushToTalkEnabled,
      setPushToTalkActive,
      connectionStats,
      connectedPeers,
      isHost,
      banUser,
      kickUser
    }),
    [muted, roomId, connected, join, leave, speakingUsers, isSelfSpeaking, userCode, isManualCall, manualLeave, setUserVolume, getUserVolume, getUserVolumes, setPushToTalkEnabled, setPushToTalkActive, connectionStats, connectedPeers, isHost]
  );

  useEffect(() => {
    try {
      (window as any).__hexcall_join = () => join(true);
      (window as any).__hexcall_leave = () => (isManualCall ? manualLeave : leave)();
      
      // Debug function for troubleshooting
      (window as any).__hexcall_debug = () => {
        console.log('=== HexCall Debug Info ===');
        console.log('Room ID:', roomId);
        console.log('User Code:', userCode);
        console.log('Connected:', connected);
        console.log('Is Manual Call:', isManualCall);
        console.log('Muted:', muted);
        console.log('Environment Check:');
        console.log('- Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing');
        console.log('- Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
        console.log('- TURN URL:', process.env.NEXT_PUBLIC_METERED_TURN_URL ? '✓ Set' : '✗ Not set (optional)');
        console.log('========================');
      };
    } catch {}
  }, [join, leave, isManualCall, manualLeave, roomId, userCode, connected, muted]);

  // Set up push-to-talk hotkey listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const off = window.hexcall?.onHotkeyPushToTalk?.((active: boolean) => {
      setPushToTalkActive?.(active);
    });

    return () => off?.();
  }, [setPushToTalkActive]);

  // Show/hide overlay based on voice call connection or game state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Show overlay if connected to voice OR if game is in progress
    const shouldShowOverlay = connected || currentGamePhase === 'InProgress';
    
    if (shouldShowOverlay) {
      window.hexcall?.showOverlay?.();
    } else {
      window.hexcall?.hideOverlay?.();
    }
  }, [connected, currentGamePhase]);

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  return useContext(VoiceContext);
}

// Expose global helpers for overlay buttons (dev-time convenience)
if (typeof window !== 'undefined') {
  try {
    const ctx = (window as any);
    // These will be rebound via React effects when provider mounts by reading context
    ctx.__hexcall_join = () => {};
    ctx.__hexcall_leave = () => {};
  } catch {}
}


