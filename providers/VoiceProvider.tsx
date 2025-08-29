import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useVoiceRoom } from '../hooks/useVoiceRoom';

type VoiceContextValue = {
  muted: boolean;
  setMuted: (m: boolean) => void;
  joinedRoomId?: string;
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

  const { connected, join, mute } = useVoiceRoom(roomId || 'idle', userId, micDeviceId);

  useEffect(() => {
    const offUpdate = window.hexcall?.onLcuUpdate?.((payload: any) => {
      const phase = payload?.phase;
      const newRoom = deriveRoomId(payload);
      if (!newRoom) return;
      // join when in lobby or in progress with teammates
      if (['Matchmaking', 'ReadyCheck', 'ChampSelect', 'InProgress', 'Lobby'].includes(phase)) {
        setRoomId(newRoom);
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
    if (roomId && !connected) {
      join();
    }
  }, [roomId, connected, join]);

  const value = useMemo(
    () => ({ muted, setMuted, joinedRoomId: roomId }),
    [muted, roomId]
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  return useContext(VoiceContext);
}


