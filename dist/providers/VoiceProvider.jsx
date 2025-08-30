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
    const { connected, join, leave, mute } = (0, useVoiceRoom_1.useVoiceRoom)(roomId || 'idle', userId, micDeviceId);
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
    (0, react_1.useEffect)(() => {
        mute(muted);
    }, [muted, mute]);
    (0, react_1.useEffect)(() => {
        const auto = typeof window !== 'undefined' ? localStorage.getItem('hexcall-auto-join') !== '0' : true;
        if (auto && roomId && !connected) {
            // allow joining alone (will form mesh when others arrive)
            join(true);
        }
    }, [roomId, connected, join]);
    const value = (0, react_1.useMemo)(() => ({ muted, setMuted, joinedRoomId: roomId, connected, joinCall: join, leaveCall: leave }), [muted, roomId, connected, join, leave]);
    (0, react_1.useEffect)(() => {
        try {
            window.__hexcall_join = () => join(true);
            window.__hexcall_leave = () => leave();
        }
        catch { }
    }, [join, leave]);
    return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}
function useVoice() {
    return (0, react_1.useContext)(VoiceContext);
}
// Expose global helpers for overlay buttons (dev-time convenience)
if (typeof window !== 'undefined') {
    try {
        const ctx = window;
        // These will be rebound via React effects when provider mounts by reading context
        ctx.__hexcall_join = () => { };
        ctx.__hexcall_leave = () => { };
    }
    catch { }
}
