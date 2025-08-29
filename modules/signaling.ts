import { supabase } from '../lib/supabase';

export type SignalMessage =
	| { type: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
	| { type: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
	| { type: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit };

export class SupabaseSignaling {
	private channel: ReturnType<typeof supabase.channel>;
	private userId: string;
	private lastPresenceMeta: Record<string, any> | undefined;

	constructor(roomId: string, userId: string) {
		this.userId = userId;
		this.channel = supabase.channel(`room:${roomId}`, {
			config: { broadcast: { self: false } },
		});
	}

	async subscribe(onMessage: (msg: SignalMessage) => void) {
		await this.channel.subscribe((status) => {
			return status === 'SUBSCRIBED';
		});
		this.channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
			if (!payload) return;
			onMessage(payload as SignalMessage);
		});
	}

	async send(message: SignalMessage) {
		await this.channel.send({ type: 'broadcast', event: 'signal', payload: message });
	}

	async presence(onSync?: (peers: { id: string; meta?: any }[]) => void, meta?: Record<string, any>) {
		this.lastPresenceMeta = meta;
		this.channel.on('presence', { event: 'sync' }, () => {
			const state = this.channel.presenceState<Record<string, any[]>>();
			const peers = Object.entries(state).map(([id, metas]) => ({ id, meta: metas?.[0] }));
			onSync?.(peers);
		});
		await this.channel.track({ id: this.userId, ts: Date.now(), ...(meta || {}) });
	}

	async updatePresence(meta: Record<string, any>) {
		this.lastPresenceMeta = { ...(this.lastPresenceMeta || {}), ...meta };
		await this.channel.track({ id: this.userId, ts: Date.now(), ...(this.lastPresenceMeta || {}) });
	}

	async close() {
		await this.channel.unsubscribe();
	}
}


