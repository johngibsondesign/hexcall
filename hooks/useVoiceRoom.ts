import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceClient, ConnectionStats } from '../modules/webrtc/voiceClient';
import { SupabaseSignaling } from '../modules/signaling';

export function useVoiceRoom(roomId: string, userId: string, micDeviceId?: string) {
	const clientRef = useRef<VoiceClient | null>(null);
	const signalingRef = useRef<SupabaseSignaling | null>(null);
	const [connected, setConnected] = useState(false);
	const [canJoin, setCanJoin] = useState(false);
	const [peerIds, setPeerIds] = useState<string[]>([]);
	const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
	const [isSelfSpeaking, setIsSelfSpeaking] = useState(false);
	const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);

	useEffect(() => {
		const client = new VoiceClient({ roomId, userId, micDeviceId });
		clientRef.current = client;
		
		// Set up speaking detection callbacks
		client.onSpeakingChange = (speaking: boolean) => {
			setIsSelfSpeaking(speaking);
		};
		
		client.onRemoteSpeaking = (remoteUserId: string, speaking: boolean) => {
			setSpeakingUsers(prev => {
				const newSet = new Set(prev);
				if (speaking) {
					newSet.add(remoteUserId);
				} else {
					newSet.delete(remoteUserId);
				}
				return newSet;
			});
		};

		// Set up connection stats callback
		client.onConnectionStats = (stats: ConnectionStats) => {
			setConnectionStats(stats);
		};
		
		client.init();
		const signaling = new SupabaseSignaling(roomId, userId);
		signalingRef.current = signaling;
		signaling.subscribe(() => {});
		signaling.presence((peers) => {
			const ids = peers.map(p => p.id);
			setPeerIds(ids);
			setCanJoin(ids.length >= 2);
			
			// Update speaking users based on presence metadata
			const newSpeakingUsers = new Set<string>();
			peers.forEach(peer => {
				if (peer.meta?.speaking && peer.id !== userId) {
					newSpeakingUsers.add(peer.id);
				}
			});
			setSpeakingUsers(newSpeakingUsers);
			
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

	const setVadThreshold = useCallback((threshold: number) => {
		clientRef.current?.setVadThreshold(threshold);
	}, []);

	const setUserVolume = useCallback((userId: string, volume: number) => {
		clientRef.current?.setUserVolume(userId, volume);
	}, []);

	const getUserVolume = useCallback((userId: string) => {
		return clientRef.current?.getUserVolume(userId) ?? 1.0;
	}, []);

	const getUserVolumes = useCallback(() => {
		return clientRef.current?.getUserVolumes() ?? {};
	}, []);

	const setPushToTalkEnabled = useCallback((enabled: boolean) => {
		clientRef.current?.setPushToTalkEnabled(enabled);
	}, []);

	const setPushToTalkActive = useCallback((active: boolean) => {
		clientRef.current?.setPushToTalkActive(active);
	}, []);

	return { 
		connected, 
		join, 
		leave, 
		mute, 
		canJoin, 
		peerIds, 
		speakingUsers,
		isSelfSpeaking,
		applyConstraints: (u: any) => clientRef.current?.applyConstraints(u), 
		updatePresence: (meta: any) => signalingRef.current?.updatePresence(meta),
		setVadThreshold,
		setUserVolume,
		getUserVolume,
		getUserVolumes,
		setPushToTalkEnabled,
		setPushToTalkActive,
		connectionStats
	};
}


