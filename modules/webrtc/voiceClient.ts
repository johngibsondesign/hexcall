import { env } from '../../lib/env';
import { SupabaseSignaling, SignalMessage } from '../signaling';

export type VoiceClientOptions = {
	roomId: string;
	userId: string;
	micDeviceId?: string;
};

export class VoiceClient {
	private pc: RTCPeerConnection | null = null;
	private stream: MediaStream | null = null;
	private signaling: SupabaseSignaling;
	private remoteAudioEls: Map<string, HTMLAudioElement> = new Map();
	private analyser: AnalyserNode | null = null;
	private audioContext: AudioContext | null = null;
	private reconnectAttempts: number = 0;
	public onLevel?: (rms: number) => void;

	constructor(private opts: VoiceClientOptions) {
		this.signaling = new SupabaseSignaling(opts.roomId, opts.userId);
	}

	private get iceServers(): RTCIceServer[] {
		if (!env.METERED_TURN_URL) return [];
		return [
			{
				urls: env.METERED_TURN_URL.split(',').map(u => u.trim()),
				username: env.METERED_TURN_USERNAME || undefined,
				credential: env.METERED_TURN_CREDENTIAL || undefined,
			},
		];
	}

	async init() {
		await this.signaling.subscribe(this.onSignal);
		await this.signaling.presence();
	}

	private setupVuMeter(stream: MediaStream) {
		try {
			this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			const source = this.audioContext.createMediaStreamSource(stream);
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 256;
			source.connect(this.analyser);
			const data = new Uint8Array(this.analyser.frequencyBinCount);
			const tick = () => {
				if (!this.analyser) return;
				this.analyser.getByteTimeDomainData(data);
				let sum = 0;
				for (let i = 0; i < data.length; i++) {
					const v = (data[i] - 128) / 128;
					sum += v * v;
				}
				const rms = Math.sqrt(sum / data.length);
				this.onLevel?.(rms);
				requestAnimationFrame(tick);
			};
			tick();
		} catch {}
	}

	join = async () => {
		this.pc = new RTCPeerConnection({ iceServers: this.iceServers });
		this.pc.onicecandidate = (e) => {
			if (e.candidate) {
				this.signaling.send({ type: 'ice', from: this.opts.userId, to: '*', candidate: e.candidate.toJSON() });
			}
		};
		this.pc.onconnectionstatechange = () => {
			if (!this.pc) return;
			const st = this.pc.connectionState;
			if (st === 'failed' || st === 'disconnected') {
				this.tryReconnect();
			}
		};
		this.pc.ontrack = (e) => {
			const [track] = e.streams;
			const el = new Audio();
			el.srcObject = track;
			el.autoplay = true;
		};
		this.stream = await navigator.mediaDevices.getUserMedia({ audio: this.opts.micDeviceId ? { deviceId: this.opts.micDeviceId } : true });
		this.setupVuMeter(this.stream);
		this.stream.getAudioTracks().forEach((t) => this.pc!.addTrack(t, this.stream!));
		const offer = await this.pc.createOffer({ offerToReceiveAudio: true });
		await this.pc.setLocalDescription(offer);
		await this.signaling.send({ type: 'offer', from: this.opts.userId, to: '*', sdp: offer });
	};

	private onSignal = async (msg: SignalMessage) => {
		if (!this.pc) return;
		switch (msg.type) {
			case 'offer': {
				if (msg.from === this.opts.userId) return;
				await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
				const answer = await this.pc.createAnswer();
				await this.pc.setLocalDescription(answer);
				await this.signaling.send({ type: 'answer', from: this.opts.userId, to: msg.from, sdp: answer });
				break;
			}
			case 'answer': {
				await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
				break;
			}
			case 'ice': {
				try {
					await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
				} catch {}
				break;
			}
		}
	};

	private async tryReconnect() {
		if (this.reconnectAttempts >= 3) return;
		this.reconnectAttempts += 1;
		await this.cleanup(false);
		await this.join();
	}

	mute(muted: boolean) {
		this.stream?.getAudioTracks().forEach(t => (t.enabled = !muted));
	}

	cleanup = async (closeSignaling: boolean = true) => {
		this.stream?.getTracks().forEach(t => t.stop());
		this.pc?.close();
		this.analyser?.disconnect();
		this.audioContext?.close();
		this.analyser = null;
		this.audioContext = null;
		if (closeSignaling) await this.signaling.close();
	};
}


