"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceClient = void 0;
const env_1 = require("../../lib/env");
const signaling_1 = require("../signaling");
class VoiceClient {
    constructor(opts) {
        this.opts = opts;
        this.pc = null;
        this.stream = null;
        this.remoteAudioEls = new Map();
        this.analyser = null;
        this.audioContext = null;
        this.reconnectAttempts = 0;
        this.join = async () => {
            this.pc = new RTCPeerConnection({ iceServers: this.iceServers });
            this.pc.onicecandidate = (e) => {
                if (e.candidate) {
                    this.signaling.send({ type: 'ice', from: this.opts.userId, to: '*', candidate: e.candidate.toJSON() });
                }
            };
            this.pc.onconnectionstatechange = () => {
                if (!this.pc)
                    return;
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
            this.stream.getAudioTracks().forEach((t) => this.pc.addTrack(t, this.stream));
            const offer = await this.pc.createOffer({ offerToReceiveAudio: true });
            await this.pc.setLocalDescription(offer);
            await this.signaling.send({ type: 'offer', from: this.opts.userId, to: '*', sdp: offer });
        };
        this.onSignal = async (msg) => {
            if (!this.pc)
                return;
            switch (msg.type) {
                case 'offer': {
                    if (msg.from === this.opts.userId)
                        return;
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
                    }
                    catch { }
                    break;
                }
            }
        };
        this.cleanup = async (closeSignaling = true) => {
            this.stream?.getTracks().forEach(t => t.stop());
            this.pc?.close();
            this.analyser?.disconnect();
            this.audioContext?.close();
            this.analyser = null;
            this.audioContext = null;
            if (closeSignaling)
                await this.signaling.close();
        };
        this.signaling = new signaling_1.SupabaseSignaling(opts.roomId, opts.userId);
    }
    get iceServers() {
        if (!env_1.env.METERED_TURN_URL)
            return [];
        return [
            {
                urls: env_1.env.METERED_TURN_URL.split(',').map(u => u.trim()),
                username: env_1.env.METERED_TURN_USERNAME || undefined,
                credential: env_1.env.METERED_TURN_CREDENTIAL || undefined,
            },
        ];
    }
    async init() {
        await this.signaling.subscribe(this.onSignal);
        await this.signaling.presence();
    }
    setupVuMeter(stream) {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            const data = new Uint8Array(this.analyser.frequencyBinCount);
            const tick = () => {
                if (!this.analyser)
                    return;
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
        }
        catch { }
    }
    async tryReconnect() {
        if (this.reconnectAttempts >= 3)
            return;
        this.reconnectAttempts += 1;
        await this.cleanup(false);
        await this.join();
    }
    mute(muted) {
        this.stream?.getAudioTracks().forEach(t => (t.enabled = !muted));
    }
}
exports.VoiceClient = VoiceClient;
