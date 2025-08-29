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
    (0, react_1.useEffect)(() => {
        const client = new voiceClient_1.VoiceClient({ roomId, userId, micDeviceId });
        clientRef.current = client;
        client.init();
        const signaling = new signaling_1.SupabaseSignaling(roomId, userId);
        signalingRef.current = signaling;
        signaling.subscribe(() => { });
        signaling.presence((ids) => setCanJoin(ids.length >= 2));
        return () => {
            client.cleanup();
            clientRef.current = null;
            signalingRef.current?.close();
            signalingRef.current = null;
        };
    }, [roomId, userId, micDeviceId]);
    const join = (0, react_1.useCallback)(async () => {
        if (!canJoin)
            return;
        await clientRef.current?.join();
        setConnected(true);
    }, [canJoin]);
    const mute = (0, react_1.useCallback)((muted) => clientRef.current?.mute(muted), []);
    return { connected, join, mute, canJoin };
}
