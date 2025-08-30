"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useVoiceRoom = useVoiceRoom;
const react_1 = require("react");
const voiceClient_1 = require("../modules/webrtc/voiceClient");
const signaling_1 = require("../modules/signaling");
function useVoiceRoom(roomId, userId, micDeviceId) {
    const clientRef = (0, react_1.useRef)(null);
    const signalingRef = (0, react_1.useRef)(null);
    const [connected, setConnected] = (0, react_1.useState)(false);
    const [canJoin, setCanJoin] = (0, react_1.useState)(false);
    const [peerIds, setPeerIds] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const client = new voiceClient_1.VoiceClient({ roomId, userId, micDeviceId });
        clientRef.current = client;
        client.init();
        const signaling = new signaling_1.SupabaseSignaling(roomId, userId);
        signalingRef.current = signaling;
        signaling.subscribe(() => { });
        signaling.presence((peers) => {
            const ids = peers.map(p => p.id);
            setPeerIds(ids);
            setCanJoin(ids.length >= 2);
            try {
                localStorage.setItem('hexcall-presence', JSON.stringify(ids));
            }
            catch { }
            try {
                localStorage.setItem('hexcall-presence-metas', JSON.stringify(peers));
            }
            catch { }
            try {
                window.dispatchEvent(new CustomEvent('hexcall:presence', { detail: ids }));
            }
            catch { }
        }, { userId });
        return () => {
            client.cleanup();
            clientRef.current = null;
            signalingRef.current?.close();
            signalingRef.current = null;
        };
    }, [roomId, userId, micDeviceId]);
    const join = (0, react_1.useCallback)(async (forceAlone = false) => {
        if (!forceAlone && !canJoin)
            return;
        await clientRef.current?.join();
        setConnected(true);
    }, [canJoin]);
    const leave = (0, react_1.useCallback)(async () => {
        await clientRef.current?.cleanup();
        setConnected(false);
    }, []);
    const mute = (0, react_1.useCallback)((muted) => clientRef.current?.mute(muted), []);
    return { connected, join, leave, mute, canJoin, peerIds, applyConstraints: (u) => clientRef.current?.applyConstraints(u), updatePresence: (meta) => signalingRef.current?.updatePresence(meta) };
}
