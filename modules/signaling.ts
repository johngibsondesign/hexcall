import { supabase } from '../lib/supabase';

export type SignalMessage =
	| { type: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
	| { type: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
	| { type: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit };

export class SupabaseSignaling {
	private channel: ReturnType<typeof supabase.channel>;
	private userId: string;

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

	async presence(onSync?: (ids: string[]) => void) {
		this.channel.on('presence', { event: 'sync' }, () => {
			const state = this.channel.presenceState<Record<string, any>>();
			const ids = Object.keys(state);
			onSync?.(ids);
		});
		await this.channel.track({ id: this.userId, ts: Date.now() });
	}

	async close() {
		await this.channel.unsubscribe();
	}
}


