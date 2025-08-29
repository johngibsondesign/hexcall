"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceProvider = VoiceProvider;
exports.useVoice = useVoice;
const react_1 = require("react");
const useVoiceRoom_1 = require("../hooks/useVoiceRoom");
const VoiceContext = (0, react_1.createContext)({ muted: false, setMuted: () => { } });
function getStableUserId() {
    if (typeof window === 'undefined')
        return 'user';
    try {
        const key = 'hexcall-user-id';
        let id = localStorage.getItem(key);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(key, id);
        }
        return id;
    }
    catch {
        return 'user';
    }
}
function deriveRoomId(update) {
    const lobby = update?.lobby;
    const members = update?.members || [];
    if (lobby?.partyId)
        return String(lobby.partyId);
    if (lobby?.lobbyId)
        return String(lobby.lobbyId);
    if (members.length) {
        return members
            .map((m) => m.puuid || m.summonerId || m.accountId || m.gameName || m.summonerName)
            .filter(Boolean)
            .sort()
            .join('-')
            .slice(0, 64);
    }
    return undefined;
}
function VoiceProvider({ children }) {
    const [muted, setMuted] = (0, react_1.useState)(false);
    const [roomId, setRoomId] = (0, react_1.useState)(undefined);
    const [micDeviceId, setMicDeviceId] = (0, react_1.useState)(undefined);
    const userId = (0, react_1.useMemo)(() => 'local-' + getStableUserId(), []);
    const { connected, join, mute } = (0, useVoiceRoom_1.useVoiceRoom)(roomId || 'idle', userId, micDeviceId);
    (0, react_1.useEffect)(() => {
        const offUpdate = window.hexcall?.onLcuUpdate?.((payload) => {
            const phase = payload?.phase;
            const newRoom = deriveRoomId(payload);
            if (!newRoom)
                return;
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
    (0, react_1.useEffect)(() => {
        mute(muted);
    }, [muted, mute]);
    (0, react_1.useEffect)(() => {
        if (roomId && !connected) {
            join();
        }
    }, [roomId, connected, join]);
    const value = (0, react_1.useMemo)(() => ({ muted, setMuted, joinedRoomId: roomId }), [muted, roomId]);
    return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}
function useVoice() {
    return (0, react_1.useContext)(VoiceContext);
}
