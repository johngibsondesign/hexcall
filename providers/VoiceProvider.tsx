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
};

const VoiceContext = createContext<VoiceContextValue>({ muted: false, setMuted: () => {} });

function getStableUserId(): string {
  if (typeof window === 'undefined') return 'user';
  try {
    const key = 'hexcall-user-id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
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
  const userId = useMemo(() => 'local-' + getStableUserId(), []);
  const [userCode, setUserCode] = useState<string>('DEMO01');

  useEffect(() => {
    // Only set the real user code on the client side to avoid hydration mismatch
    setUserCode(getUserCode());
  }, []);

  const { connected, join, leave, mute, speakingUsers, isSelfSpeaking, setUserVolume, getUserVolume, getUserVolumes, setPushToTalkEnabled, setPushToTalkActive, connectionStats, peerIds } = useVoiceRoom(roomId || 'idle', userId, micDeviceId);

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
    const callRoom = `manual-${userCode}`;
    console.log('[VoiceProvider] Creating manual call room:', callRoom);
    setIsManualCall(true);
    setRoomId(callRoom);
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
    if (!code || code.length !== 6) {
      throw new Error('Please enter a valid 6-character code');
    }
    const callRoom = `manual-${code.toUpperCase()}`;
    console.log('[VoiceProvider] Joining manual call room:', callRoom);
    setIsManualCall(true);
    setRoomId(callRoom);
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
  };

  const connectedPeers = useMemo(() => {
    const peers = [];
    
    // Add yourself first if connected
    if (connected) {
      const { name: selfName, riotId } = getCachedFullDisplayName();
      const selfIconUrl = getCachedIconUrl(currentGamePhase); // Use phase-aware icon
      
      peers.push({
        id: userId,
        name: selfName,
        riotId: riotId,
        iconUrl: selfIconUrl,
        isSelf: true
      });
    }
    
    // Add other peers
    const otherPeers = (peerIds || [])
      .filter(id => id !== userId)
      .map(id => ({ 
        id, 
        name: id.includes('local-') ? 'User' : id.slice(0, 8),
        riotId: undefined,
        isSelf: false
      }));
    
    peers.push(...otherPeers);
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
      connectedPeers
    }),
    [muted, roomId, connected, join, leave, speakingUsers, isSelfSpeaking, userCode, isManualCall, manualLeave, setUserVolume, getUserVolume, getUserVolumes, setPushToTalkEnabled, setPushToTalkActive, connectionStats, connectedPeers]
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

  // Show/hide overlay based on voice call connection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (connected) {
      window.hexcall?.showOverlay?.();
    } else {
      window.hexcall?.hideOverlay?.();
    }
  }, [connected]);

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


