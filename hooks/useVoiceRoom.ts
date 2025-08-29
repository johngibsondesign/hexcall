import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceClient } from '../modules/webrtc/voiceClient';
import { SupabaseSignaling } from '../modules/signaling';

export function useVoiceRoom(roomId: string, userId: string, micDeviceId?: string) {
	const clientRef = useRef<VoiceClient | null>(null);
	const signalingRef = useRef<SupabaseSignaling | null>(null);
	const [connected, setConnected] = useState(false);
	const [canJoin, setCanJoin] = useState(false);

	useEffect(() => {
		const client = new VoiceClient({ roomId, userId, micDeviceId });
		clientRef.current = client;
		client.init();
		const signaling = new SupabaseSignaling(roomId, userId);
		signalingRef.current = signaling;
		signaling.subscribe(() => {});
		signaling.presence((ids) => setCanJoin(ids.length >= 2));
		return () => {
			client.cleanup();
			clientRef.current = null;
			signalingRef.current?.close();
			signalingRef.current = null;
		};
	}, [roomId, userId, micDeviceId]);

	const join = useCallback(async () => {
		if (!canJoin) return;
		await clientRef.current?.join();
		setConnected(true);
	}, [canJoin]);

	const mute = useCallback((muted: boolean) => clientRef.current?.mute(muted), []);

	return { connected, join, mute, canJoin };
}


