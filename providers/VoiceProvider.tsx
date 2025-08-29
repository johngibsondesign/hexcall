import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useVoiceRoom } from '../hooks/useVoiceRoom';

type VoiceContextValue = {
  muted: boolean;
  setMuted: (m: boolean) => void;
  joinedRoomId?: string;
  connected?: boolean;
  joinCall?: (forceAlone?: boolean) => Promise<void> | void;
  leaveCall?: () => Promise<void> | void;
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
  const userId = useMemo(() => 'local-' + getStableUserId(), []);

  const { connected, join, leave, mute } = useVoiceRoom(roomId || 'idle', userId, micDeviceId);

  useEffect(() => {
    const offUpdate = window.hexcall?.onLcuUpdate?.((payload: any) => {
      const phase = payload?.phase;
      const newRoom = deriveRoomId(payload);
      if (!newRoom) return;
      // join when in lobby or in progress with teammates
      if (['Matchmaking', 'ReadyCheck', 'ChampSelect', 'InProgress', 'Lobby'].includes(phase)) {
        setRoomId(newRoom);
      }
      // Leave at EndOfGame unless the room was created in lobby and still same party
      if (phase === 'EndOfGame') {
        // if we had a lobby-derived room, keep; otherwise leave
        if (!payload?.lobby?.lobbyId && !payload?.lobby?.partyId) {
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
  }, []);

  useEffect(() => {
    mute(muted);
  }, [muted, mute]);

  useEffect(() => {
    const auto = typeof window !== 'undefined' ? localStorage.getItem('hexcall-auto-join') !== '0' : true;
    if (auto && roomId && !connected) {
      // allow joining alone (will form mesh when others arrive)
      join(true);
    }
  }, [roomId, connected, join]);

  const value = useMemo(
    () => ({ muted, setMuted, joinedRoomId: roomId, connected, joinCall: join, leaveCall: leave }),
    [muted, roomId, connected, join, leave]
  );

  useEffect(() => {
    try {
      (window as any).__hexcall_join = () => join(true);
      (window as any).__hexcall_leave = () => leave();
    } catch {}
  }, [join, leave]);

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


