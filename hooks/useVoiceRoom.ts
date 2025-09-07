import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceClient, ConnectionStats } from '../modules/webrtc/voiceClient';

export function useVoiceRoom(roomId: string, userId: string, micDeviceId?: string) {
	const clientRef = useRef<VoiceClient | null>(null);
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

		// When peer map changes (connections established/removed), update peerIds for UI
		client.onPeersChanged = (ids: string[]) => {
			console.log('[useVoiceRoom] onPeersChanged ->', ids);
			// Ensure self is included for display consistency
			const unique = Array.from(new Set([userId, ...ids]));
			setPeerIds(unique);
			try { localStorage.setItem('hexcall-presence', JSON.stringify(unique)); } catch {}
			try { window.dispatchEvent(new CustomEvent('hexcall:presence', { detail: unique } as any)); } catch {}
		};
		
		// Set up presence callback to get the signaling instance from the client
		client.onPresenceUpdate = (peers: { id: string; meta?: any }[]) => {
			console.log('[useVoiceRoom] Presence update for room:', roomId, 'userId:', userId, 'peers:', peers);
			
			const ids = peers.map(p => p.id);
			console.log('[useVoiceRoom] Setting peerIds to:', ids);
			setPeerIds(ids);
			// Allow joining even if alone; mesh forms when others join
			setCanJoin(true);
			
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
		};
		
		// Initialize the client (this will set up signaling and presence)
		client.init();
		
		return () => {
			client.cleanup();
			clientRef.current = null;
		};
	}, [roomId, userId, micDeviceId]);

	const join = useCallback(async (forceAlone: boolean = false) => {
		if (!forceAlone && !canJoin) {
			console.log('[useVoiceRoom] Cannot join - canJoin:', canJoin, 'forceAlone:', forceAlone);
			return;
		}
		if (connected) {
			console.log('[useVoiceRoom] Already connected');
			return;
		}
		
		console.log('[useVoiceRoom] Attempting to join room with forceAlone:', forceAlone);
		try {
			await clientRef.current?.join();
			setConnected(true);
			console.log('[useVoiceRoom] Successfully joined room');
		} catch (error) {
			console.error('[useVoiceRoom] Join failed:', error);
			setConnected(false);
		}
	}, [canJoin, connected]);

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
		updatePresence: (meta: any) => clientRef.current?.updatePresence(meta),
		setVadThreshold,
		setUserVolume,
		getUserVolume,
		getUserVolumes,
		setPushToTalkEnabled,
		setPushToTalkActive,
		connectionStats
	};
}


