import { getSupabase } from '../lib/supabase';

export type SignalMessage =
	| { type: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
	| { type: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
	| { type: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit };

export class SupabaseSignaling {
	private channel: ReturnType<NonNullable<ReturnType<typeof getSupabase>>['channel']> | null = null;
	private userId: string;
	private lastPresenceMeta: Record<string, any> | undefined;
	private disabled = false;
	private roomId: string;
	private presencePollingInterval: NodeJS.Timeout | null = null;
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private lastPeerIds: string = '';
	private peers: Map<string, any> | null = null;

	constructor(roomId: string, userId: string) {
		this.roomId = roomId;
		this.userId = userId;
		const sb = getSupabase();
		if (!sb) {
			console.warn('[SupabaseSignaling] Supabase client not available - signaling disabled');
			console.warn('[SupabaseSignaling] Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
			this.disabled = true;
			return;
		}
		console.log('[SupabaseSignaling] Initializing for room:', roomId, 'user:', userId);
		console.log(`[SupabaseSignaling] Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'}`);
		console.log(`[SupabaseSignaling] Supabase Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`);
		const channelName = `room:${roomId}`;
		console.log('[SupabaseSignaling] Creating channel with name:', channelName);
		this.channel = sb.channel(channelName, {
			config: { broadcast: { self: false } },
		});
		console.log('[SupabaseSignaling] Channel created:', this.channel);
	}

	async subscribe(onMessage: (msg: SignalMessage) => void) {
		if (this.disabled || !this.channel) {
			console.warn('[SupabaseSignaling] Cannot subscribe - signaling disabled');
			return true as any;
		}
		console.log('[SupabaseSignaling] Subscribing to channel');
		const status = await this.channel.subscribe((status) => {
			console.log('[SupabaseSignaling] Subscription status:', status);
			if (status === 'SUBSCRIBED') {
				console.log('[SupabaseSignaling] Successfully subscribed to channel');
				// Try to get current presence state immediately after subscription
				setTimeout(() => {
					const currentState = this.channel!.presenceState<Record<string, any[]>>();
					console.log('[SupabaseSignaling] Immediate presence state after subscription:', currentState);
				}, 100);
			}
			return status === 'SUBSCRIBED';
		});
		this.channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
			if (!payload) return;
			console.log('[SupabaseSignaling] Received message:', payload);
			onMessage(payload as SignalMessage);
		});
		return status;
	}

	async send(message: SignalMessage) {
		if (this.disabled || !this.channel) {
			console.warn('[SupabaseSignaling] Cannot send - signaling disabled');
			return;
		}
		console.log('[SupabaseSignaling] Sending message:', message);
		await this.channel.send({ type: 'broadcast', event: 'signal', payload: message });
	}

	async presence(onSync?: (peers: { id: string; meta?: any }[]) => void, meta?: Record<string, any>) {
		this.lastPresenceMeta = meta;
		if (this.disabled || !this.channel) {
			console.warn('[SupabaseSignaling] Cannot setup presence - signaling disabled');
			onSync?.([]);
			return;
		}
		
		console.log('[SupabaseSignaling] Setting up Supabase Realtime Presence with auth');
		
		// Set up Supabase Realtime Presence (proper way)
		this.channel.on('presence', { event: 'sync' }, () => {
			console.log('[SupabaseSignaling] Presence SYNC event triggered');
			const state = this.channel!.presenceState<Record<string, any[]>>();
			console.log('[SupabaseSignaling] Raw presence state:', state);
			const peers = Object.entries(state).map(([key, metas]) => {
				const meta = metas?.[0] || {} as any;
				return { id: (meta as any).userId || key, meta };
			});
			console.log('[SupabaseSignaling] Presence sync - peers:', peers);
			onSync?.(peers);
		});

		this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
			console.log('[SupabaseSignaling] Presence JOIN event:', { key, newPresences });
		});

		this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
			console.log('[SupabaseSignaling] Presence LEAVE event:', { key, leftPresences });
		});
		
		// Track presence with proper user ID
		const trackData = { userId: this.userId, connected: true, ts: Date.now(), ...(meta || {}) };
		console.log('[SupabaseSignaling] Tracking presence with data:', trackData);
		
		try {
			const trackResult = await this.channel.track(trackData);
			console.log('[SupabaseSignaling] Track result:', trackResult);
			
			// Test if presence is working after a delay
			setTimeout(() => {
				const state = this.channel!.presenceState<Record<string, any[]>>();
				console.log('[SupabaseSignaling] Presence state after tracking:', state);
				const peers = Object.entries(state).map(([key, metas]) => {
					const meta = metas?.[0] || {} as any;
					return { id: (meta as any).userId || key, meta };
				});
				
				if (peers.length === 0) {
					console.warn('[SupabaseSignaling] Presence not working, falling back to broadcast');
					this.setupBroadcastPresence(onSync, meta);
				} else {
					console.log('[SupabaseSignaling] Presence working correctly:', peers);
					onSync?.(peers);
				}
			}, 2000);
			
		} catch (error) {
			console.error('[SupabaseSignaling] Presence tracking failed, using broadcast fallback:', error);
			this.setupBroadcastPresence(onSync, meta);
		}
	}
	
	private async setupBroadcastPresence(onSync?: (peers: { id: string; meta?: any }[]) => void, meta?: Record<string, any>) {
		console.log('[SupabaseSignaling] Setting up broadcast-based presence fallback');
		
		// Store peers in memory
		if (!this.peers) {
			this.peers = new Map();
		}
		
		// Add ourselves to the peers list
		this.peers.set(this.userId, { userId: this.userId, connected: true, ts: Date.now(), ...(meta || {}) });
		
		// Listen for peer announcements via broadcast
		this.channel!.on('broadcast', { event: 'peer-join' }, ({ payload }) => {
			if (payload && payload.userId && payload.userId !== this.userId) {
				console.log('[SupabaseSignaling] Peer joined via broadcast:', JSON.stringify(payload, null, 2));
				this.peers!.set(payload.userId, payload);
				this.syncPeers(onSync);
			}
		});
		
		this.channel!.on('broadcast', { event: 'peer-leave' }, ({ payload }) => {
			if (payload && payload.userId && payload.userId !== this.userId) {
				console.log('[SupabaseSignaling] Peer left via broadcast:', payload);
				this.peers!.delete(payload.userId);
				this.syncPeers(onSync);
			}
		});
		
		this.channel!.on('broadcast', { event: 'peer-update' }, ({ payload }) => {
			if (payload && payload.userId && payload.userId !== this.userId) {
				console.log('[SupabaseSignaling] Peer updated via broadcast:', JSON.stringify(payload, null, 2));
				this.peers!.set(payload.userId, payload);
				this.syncPeers(onSync);
			}
		});
		
		// Announce ourselves to other peers
		const broadcastPayload = { userId: this.userId, connected: true, ts: Date.now(), ...(meta || {}) };
		console.log('[SupabaseSignaling] Broadcasting peer-join with payload:', JSON.stringify(broadcastPayload, null, 2));
		await this.channel!.send({
			type: 'broadcast',
			event: 'peer-join',
			payload: broadcastPayload
		});
		
		// Initial sync
		this.syncPeers(onSync);
		
		// Heartbeat
		this.heartbeatInterval = setInterval(async () => {
			if (this.channel) {
				await this.channel.send({
					type: 'broadcast',
					event: 'peer-heartbeat',
					payload: { userId: this.userId, ts: Date.now() }
				});
			}
		}, 10000);
	}
	
	private syncPeers(onSync?: (peers: { id: string; meta?: any }[]) => void) {
		if (!this.peers || !onSync) return;
		const peers = Array.from(this.peers.entries()).map(([id, meta]) => ({ id, meta }));
		console.log('[SupabaseSignaling] Syncing peers:', peers);
		onSync(peers);
	}

	async updatePresence(meta: Record<string, any>) {
		this.lastPresenceMeta = { ...(this.lastPresenceMeta || {}), ...meta };
		if (this.disabled || !this.channel) return;
		
		// Try to update Supabase Realtime Presence
		try {
			const trackResult = await this.channel.track({ id: this.userId, ts: Date.now(), ...(this.lastPresenceMeta || {}) });
			console.log('[SupabaseSignaling] updatePresence track result:', trackResult);
		} catch (error) {
			console.warn('[SupabaseSignaling] updatePresence track failed:', error);
		}
		
		// Also update broadcast system if we're using it (when peers map exists)
		if (this.peers) {
			const broadcastPayload = { userId: this.userId, connected: true, ts: Date.now(), ...(this.lastPresenceMeta || {}) };
			console.log('[SupabaseSignaling] Updating broadcast presence with:', JSON.stringify(broadcastPayload, null, 2));
			
			// Update our own entry in the peers map
			this.peers.set(this.userId, broadcastPayload);
			
			// Broadcast the update to other peers
			try {
				await this.channel.send({
					type: 'broadcast',
					event: 'peer-update',
					payload: broadcastPayload
				});
			} catch (error) {
				console.warn('[SupabaseSignaling] Failed to broadcast presence update:', error);
			}
		}
	}

	async close() {
		// Announce that we're leaving
		if (this.channel && !this.disabled) {
			await this.channel.send({
				type: 'broadcast',
				event: 'peer-leave',
				payload: { userId: this.userId, ts: Date.now() }
			});
		}
		
		// Clean up intervals
		if (this.presencePollingInterval) {
			clearInterval(this.presencePollingInterval);
			this.presencePollingInterval = null;
		}
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
		
		// Clear peers
		this.peers = null;
		
		if (this.disabled || !this.channel) return;
		await this.channel.unsubscribe();
	}
}


