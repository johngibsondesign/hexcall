import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceClient } from '../modules/webrtc/voiceClient';
import { SupabaseSignaling } from '../modules/signaling';

export function useVoiceRoom(roomId: string, userId: string, micDeviceId?: string) {
	const clientRef = useRef<VoiceClient | null>(null);
	const signalingRef = useRef<SupabaseSignaling | null>(null);
	const [connected, setConnected] = useState(false);
	const [canJoin, setCanJoin] = useState(false);
	const [peerIds, setPeerIds] = useState<string[]>([]);

	useEffect(() => {
		const client = new VoiceClient({ roomId, userId, micDeviceId });
		clientRef.current = client;
		client.init();
		const signaling = new SupabaseSignaling(roomId, userId);
		signalingRef.current = signaling;
		signaling.subscribe(() => {});
		signaling.presence((peers) => {
			const ids = peers.map(p => p.id);
			setPeerIds(ids);
			setCanJoin(ids.length >= 2);
			try { localStorage.setItem('hexcall-presence', JSON.stringify(ids)); } catch {}
			try { localStorage.setItem('hexcall-presence-metas', JSON.stringify(peers)); } catch {}
			try { window.dispatchEvent(new CustomEvent('hexcall:presence', { detail: ids } as any)); } catch {}
		}, { userId });
		return () => {
			client.cleanup();
			clientRef.current = null;
			signalingRef.current?.close();
			signalingRef.current = null;
		};
	}, [roomId, userId, micDeviceId]);

	const join = useCallback(async (forceAlone: boolean = false) => {
		if (!forceAlone && !canJoin) return;
		await clientRef.current?.join();
		setConnected(true);
	}, [canJoin]);

	const leave = useCallback(async () => {
		await clientRef.current?.cleanup();
		setConnected(false);
	}, []);

	const mute = useCallback((muted: boolean) => clientRef.current?.mute(muted), []);

	return { connected, join, leave, mute, canJoin, peerIds, applyConstraints: (u: any) => clientRef.current?.applyConstraints(u), updatePresence: (meta: any) => signalingRef.current?.updatePresence(meta) };
}


