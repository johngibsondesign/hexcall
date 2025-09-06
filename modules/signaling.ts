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
		this.channel = sb.channel(`room:${roomId}`, {
			config: { broadcast: { self: false } },
		});
	}

	async subscribe(onMessage: (msg: SignalMessage) => void) {
		if (this.disabled || !this.channel) {
			console.warn('[SupabaseSignaling] Cannot subscribe - signaling disabled');
			return true as any;
		}
		console.log('[SupabaseSignaling] Subscribing to channel');
		const status = await this.channel.subscribe((status) => {
			console.log('[SupabaseSignaling] Subscription status:', status);
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
		console.log('[SupabaseSignaling] Setting up presence tracking');
		this.channel.on('presence', { event: 'sync' }, () => {
			const state = this.channel!.presenceState<Record<string, any[]>>();
			const peers = Object.entries(state).map(([id, metas]) => ({ id, meta: metas?.[0] }));
			console.log('[SupabaseSignaling] Presence sync - peers:', peers);
			onSync?.(peers);
		});
		console.log('[SupabaseSignaling] Tracking presence with meta:', meta);
		await this.channel.track({ id: this.userId, ts: Date.now(), ...(meta || {}) });
	}

	async updatePresence(meta: Record<string, any>) {
		this.lastPresenceMeta = { ...(this.lastPresenceMeta || {}), ...meta };
		if (this.disabled || !this.channel) return;
		await this.channel.track({ id: this.userId, ts: Date.now(), ...(this.lastPresenceMeta || {}) });
	}

	async close() {
		if (this.disabled || !this.channel) return;
		await this.channel.unsubscribe();
	}
}


