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

	constructor(roomId: string, userId: string) {
		this.userId = userId;
		const sb = getSupabase();
		if (!sb) {
			this.disabled = true;
			return;
		}
		this.channel = sb.channel(`room:${roomId}`, {
			config: { broadcast: { self: false } },
		});
	}

	async subscribe(onMessage: (msg: SignalMessage) => void) {
		if (this.disabled || !this.channel) return true as any;
		await this.channel.subscribe((status) => {
			return status === 'SUBSCRIBED';
		});
		this.channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
			if (!payload) return;
			onMessage(payload as SignalMessage);
		});
	}

	async send(message: SignalMessage) {
		if (this.disabled || !this.channel) return;
		await this.channel.send({ type: 'broadcast', event: 'signal', payload: message });
	}

	async presence(onSync?: (peers: { id: string; meta?: any }[]) => void, meta?: Record<string, any>) {
		this.lastPresenceMeta = meta;
		if (this.disabled || !this.channel) {
			onSync?.([]);
			return;
		}
		this.channel.on('presence', { event: 'sync' }, () => {
			const state = this.channel!.presenceState<Record<string, any[]>>();
			const peers = Object.entries(state).map(([id, metas]) => ({ id, meta: metas?.[0] }));
			onSync?.(peers);
		});
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


