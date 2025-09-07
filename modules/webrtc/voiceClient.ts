import { env } from '../../lib/env';
import { SupabaseSignaling, SignalMessage } from '../signaling';

export interface ConnectionStats {
	latency: number;
	jitter: number;
	packetLoss: number;
	bitrate: number;
	audioLevel: number;
	connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
}

export type VoiceClientOptions = {
	roomId: string;
	userId: string;
	micDeviceId?: string;
	constraints?: {
		echoCancellation?: boolean;
		noiseSuppression?: boolean;
		autoGainControl?: boolean;
	};
};

export class VoiceClient {
	private pc: RTCPeerConnection | null = null;
	private peerConnections: Map<string, RTCPeerConnection> = new Map();
	private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map(); // Queue ICE candidates
	private stream: MediaStream | null = null;
	private signaling: SupabaseSignaling;
	private remoteAudioEls: Map<string, HTMLAudioElement> = new Map();
	private remoteAnalysers: Map<string, { analyser: AnalyserNode; context: AudioContext }> = new Map();
	private userVolumes: Map<string, number> = new Map(); // Store per-user volumes
	private analyser: AnalyserNode | null = null;
	private audioContext: AudioContext | null = null;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 1000; // Start with 1 second
	private vadThreshold: number = 0.01;
	private pushToTalkEnabled: boolean = false;
	private pushToTalkActive: boolean = false;
	private statsInterval: NodeJS.Timeout | null = null;
	private lastStatsTime: number = 0;
	private lastBytesSent: number = 0;
	private lastBytesReceived: number = 0;
	private audioBuffer: Float32Array[] = [];
	private maxBufferSize: number = 10; // Buffer up to 10 frames
	private audioWorklet: AudioWorkletNode | null = null;
	public onPeersChanged?: (ids: string[]) => void;

	public setVadThreshold(threshold: number) {
		this.vadThreshold = Math.max(0.001, Math.min(0.1, threshold));
	}

	/**
	 * Set volume for a specific user (0.0 to 1.0)
	 */
	public setUserVolume(userId: string, volume: number): void {
		const clampedVolume = Math.max(0, Math.min(1, volume));
		this.userVolumes.set(userId, clampedVolume);
		
		// Apply volume to existing audio element
		const audioEl = this.remoteAudioEls.get(userId);
		if (audioEl) {
			audioEl.volume = clampedVolume;
		}
		
		// Save to localStorage
		if (typeof window !== 'undefined') {
			try {
				const savedVolumes = this.getUserVolumes();
				savedVolumes[userId] = clampedVolume;
				localStorage.setItem('hexcall-user-volumes', JSON.stringify(savedVolumes));
			} catch (e) {
				console.warn('Failed to save user volume:', e);
			}
		}
	}

	/**
	 * Get volume for a specific user
	 */
	public getUserVolume(userId: string): number {
		return this.userVolumes.get(userId) ?? 1.0;
	}

	/**
	 * Get all user volumes
	 */
	public getUserVolumes(): Record<string, number> {
		const volumes: Record<string, number> = {};
		this.userVolumes.forEach((volume, userId) => {
			volumes[userId] = volume;
		});
		return volumes;
	}

	/**
	 * Load saved user volumes from localStorage
	 */
	private loadUserVolumes(): void {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem('hexcall-user-volumes');
				if (saved) {
					const volumes = JSON.parse(saved) as Record<string, number>;
					Object.entries(volumes).forEach(([userId, volume]) => {
						this.userVolumes.set(userId, volume);
					});
				}
			} catch (e) {
				console.warn('Failed to load user volumes:', e);
			}
		}
	}

	/**
	 * Enable/disable push-to-talk mode
	 */
	public setPushToTalkEnabled(enabled: boolean): void {
		this.pushToTalkEnabled = enabled;
		
		// If disabling push-to-talk, ensure mic is unmuted
		if (!enabled && this.stream) {
			this.unmuteMicrophone();
		}
		// If enabling push-to-talk, mute mic initially
		else if (enabled && this.stream) {
			this.muteMicrophone();
		}
	}

	/**
	 * Set push-to-talk active state (called by hotkey)
	 */
	public setPushToTalkActive(active: boolean): void {
		if (!this.pushToTalkEnabled) return;
		
		this.pushToTalkActive = active;
		
		if (this.stream) {
			if (active) {
				this.unmuteMicrophone();
			} else {
				this.muteMicrophone();
			}
		}
	}

	/**
	 * Check if microphone should be active based on push-to-talk state
	 */
	private shouldMicrophoneBeActive(): boolean {
		if (this.pushToTalkEnabled) {
			return this.pushToTalkActive;
		}
		return true; // Default: always active when not in push-to-talk mode
	}

	/**
	 * Mute microphone
	 */
	private muteMicrophone(): void {
		if (this.stream) {
			this.stream.getAudioTracks().forEach(track => {
				track.enabled = false;
			});
		}
	}

	/**
	 * Unmute microphone
	 */
	private unmuteMicrophone(): void {
		if (this.stream) {
			this.stream.getAudioTracks().forEach(track => {
				track.enabled = true;
			});
		}
	}

	/**
	 * Start monitoring connection statistics
	 */
	private startStatsMonitoring(): void {
		if (this.statsInterval) {
			clearInterval(this.statsInterval);
		}

		// Reduce sampling frequency to ease CPU usage
		this.statsInterval = setInterval(async () => {
			await this.collectConnectionStats();
		}, 2000);
	}

	/**
	 * Stop monitoring connection statistics
	 */
	private stopStatsMonitoring(): void {
		if (this.statsInterval) {
			clearInterval(this.statsInterval);
			this.statsInterval = null;
		}
	}

	/**
	 * Collect and analyze connection statistics
	 */
	private async collectConnectionStats(): Promise<void> {
		if (!this.pc || this.pc.connectionState !== 'connected') {
			this.onConnectionStats?.({
				latency: 0,
				jitter: 0,
				packetLoss: 0,
				bitrate: 0,
				audioLevel: 0,
				connectionQuality: 'disconnected'
			});
			return;
		}

		try {
			const stats = await this.pc.getStats();
			const now = Date.now();

			let latency = 0;
			let jitter = 0;
			let packetLoss = 0;
			let bitrate = 0;
			let audioLevel = 0;

			stats.forEach((report) => {
				if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') {
					// Calculate latency from round-trip time
					if (report.roundTripTime) {
						latency = Math.round(report.roundTripTime * 1000); // Convert to ms
					}
					
					// Calculate jitter
					if (report.jitter) {
						jitter = Math.round(report.jitter * 1000); // Convert to ms
					}

					// Calculate packet loss percentage
					if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
						const totalPackets = report.packetsLost + report.packetsReceived;
						packetLoss = totalPackets > 0 ? Math.round((report.packetsLost / totalPackets) * 100) : 0;
					}
				}

				if (report.type === 'outbound-rtp' && report.kind === 'audio') {
					// Calculate bitrate
					if (this.lastStatsTime > 0 && report.bytesSent !== undefined) {
						const timeDiff = (now - this.lastStatsTime) / 1000;
						const bytesDiff = report.bytesSent - this.lastBytesSent;
						bitrate = Math.round((bytesDiff * 8) / timeDiff); // bits per second
						this.lastBytesSent = report.bytesSent;
					}

					// Get audio level
					if (report.audioLevel !== undefined) {
						audioLevel = Math.round(report.audioLevel * 100);
					}
				}
			});

			this.lastStatsTime = now;

			// Determine connection quality based on metrics
			const connectionQuality = this.calculateConnectionQuality(latency, jitter, packetLoss);

			const connectionStats: ConnectionStats = {
				latency,
				jitter,
				packetLoss,
				bitrate,
				audioLevel,
				connectionQuality
			};

			this.onConnectionStats?.(connectionStats);
		} catch (error) {
			console.warn('[VoiceClient] Failed to collect stats:', error);
		}
	}

	/**
	 * Calculate overall connection quality based on metrics
	 */
	private calculateConnectionQuality(latency: number, jitter: number, packetLoss: number): ConnectionStats['connectionQuality'] {
		// Excellent: Low latency, minimal jitter, no packet loss
		if (latency < 50 && jitter < 10 && packetLoss === 0) {
			return 'excellent';
		}
		
		// Good: Reasonable latency, low jitter, minimal packet loss
		if (latency < 100 && jitter < 20 && packetLoss < 1) {
			return 'good';
		}
		
		// Fair: Higher latency or jitter, some packet loss
		if (latency < 200 && jitter < 50 && packetLoss < 5) {
			return 'fair';
		}
		
		// Poor: High latency, jitter, or packet loss
		return 'poor';
	}

	/**
	 * Calculate smoothed RMS from audio buffer for better stability
	 */
	private calculateSmoothedRMS(): number {
		if (this.audioBuffer.length === 0) return 0;
		
		let totalSum = 0;
		let totalSamples = 0;
		
		// Weight recent samples more heavily
		for (let i = 0; i < this.audioBuffer.length; i++) {
			const weight = (i + 1) / this.audioBuffer.length; // Linear weighting
			const buffer = this.audioBuffer[i];
			
			let sum = 0;
			for (let j = 0; j < buffer.length; j++) {
				sum += buffer[j] * buffer[j];
			}
			
			totalSum += (sum / buffer.length) * weight;
			totalSamples += weight;
		}
		
		return totalSamples > 0 ? Math.sqrt(totalSum / totalSamples) : 0;
	}

	/**
	 * Get resource usage statistics for monitoring
	 */
	public getResourceStats() {
		return {
			audioBufferLength: this.audioBuffer.length,
			maxBufferSize: this.maxBufferSize,
			activeAnalysers: this.remoteAnalysers.size,
			activeAudioElements: this.remoteAudioEls.size,
			connectionState: this.connectionState,
			audioContextState: this.audioContext?.state || 'none'
		};
	}

	/**
	 * Optimize performance by adjusting buffer sizes based on system performance
	 */
	public optimizePerformance(cpuUsage?: number) {
		// Adjust buffer size based on system performance
		if (cpuUsage !== undefined) {
			if (cpuUsage > 80) {
				// High CPU usage - reduce buffer size and processing frequency
				this.maxBufferSize = Math.max(3, Math.floor(this.maxBufferSize * 0.7));
			} else if (cpuUsage < 30) {
				// Low CPU usage - can afford larger buffers for better quality
				this.maxBufferSize = Math.min(15, Math.floor(this.maxBufferSize * 1.2));
			}
		}

		// Trim audio buffer if it's grown too large
		if (this.audioBuffer.length > this.maxBufferSize) {
			this.audioBuffer = this.audioBuffer.slice(-this.maxBufferSize);
		}
	}
	private isSpeaking: boolean = false;
	private connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed' = 'disconnected';
	private reconnectTimer: NodeJS.Timeout | null = null;
	private isDestroyed: boolean = false;
	
	public onLevel?: (rms: number) => void;
	public onSpeakingChange?: (speaking: boolean) => void;
	public onRemoteSpeaking?: (userId: string, speaking: boolean) => void;
	public onConnectionStateChange?: (state: string) => void;
	public onError?: (error: Error) => void;
	public onConnectionStats?: (stats: ConnectionStats) => void;
	public onPresenceUpdate?: (peers: { id: string; meta?: any }[]) => void;

	constructor(private opts: VoiceClientOptions) {
		this.signaling = new SupabaseSignaling(opts.roomId, opts.userId);
		
		// Load VAD threshold from localStorage
		if (typeof window !== 'undefined') {
			try {
				const savedThreshold = localStorage.getItem('hexcall-vad-threshold');
				if (savedThreshold) {
					this.vadThreshold = Number(savedThreshold);
				}
			} catch {}
		}
		
		// Load saved user volumes
		this.loadUserVolumes();
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

	private async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
		const pc = new RTCPeerConnection({ 
			iceServers: this.iceServers,
			iceCandidatePoolSize: 10,
			bundlePolicy: 'balanced',
			rtcpMuxPolicy: 'require'
		});

		// Set up event handlers for this peer connection
		pc.onicecandidate = (e) => {
			if (e.candidate && !this.isDestroyed) {
				this.signaling.send({ 
					type: 'ice', 
					from: this.opts.userId, 
					to: peerId, 
					candidate: e.candidate.toJSON() 
				}).catch(err => this.handleError(new Error(`Failed to send ICE candidate to ${peerId}: ${err}`)));
			}
		};

		pc.onconnectionstatechange = () => {
			if (!pc || this.isDestroyed) return;
			
			const state = pc.connectionState;
			console.log(`[VoiceClient] Connection state with ${peerId} changed to: ${state}`);
			
			// Update overall connection state based on any connected peer
			const hasConnectedPeer = Array.from(this.peerConnections.values())
				.some(peerPc => peerPc.connectionState === 'connected');
			
			if (hasConnectedPeer) {
				this.updateConnectionState('connected');
				this.reconnectAttempts = 0;
				this.reconnectDelay = 1000;
				this.startStatsMonitoring();
			} else if (state === 'failed' || state === 'disconnected') {
				// Clean up failed connection
				this.peerConnections.delete(peerId);
				this.remoteAudioEls.get(peerId)?.remove();
				this.remoteAudioEls.delete(peerId);
				this.remoteAnalysers.delete(peerId);
				const currentPeers = Array.from(this.peerConnections.keys());
				console.log('[VoiceClient] Peer connection failed/disconnected, current peers:', currentPeers);
				this.onPeersChanged?.(currentPeers);
				
				// If no peers left, update connection state
				if (this.peerConnections.size === 0) {
					this.updateConnectionState('disconnected');
				}
			}
		};

		pc.ontrack = (e) => {
			if (this.isDestroyed) return;
			console.log(`[VoiceClient] Received remote track from ${peerId}:`, e.track.kind);
			
			const [stream] = e.streams;
			if (stream && e.track.kind === 'audio') {
				// Create audio element for remote stream
				const audio = new Audio();
				audio.srcObject = stream;
				audio.autoplay = true;
				audio.volume = this.userVolumes.get(peerId) || 0.8;
				
				// Store reference for cleanup
				this.remoteAudioEls.set(peerId, audio);
				
				// Set up remote audio analysis
				this.setupRemoteAudioAnalysis(peerId, stream);
			}
		};

		// Add local stream to this peer connection
		if (this.stream) {
			this.stream.getTracks().forEach(track => {
				pc.addTrack(track, this.stream!);
			});
		}

		return pc;
	}

	private async processPendingIceCandidates(peerId: string) {
		const pc = this.peerConnections.get(peerId);
		const pendingCandidates = this.pendingIceCandidates.get(peerId);
		
		if (pc && pc.remoteDescription && pendingCandidates) {
			console.log(`[VoiceClient] Processing ${pendingCandidates.length} pending ICE candidates for ${peerId}`);
			
			for (const candidate of pendingCandidates) {
				try {
					await pc.addIceCandidate(new RTCIceCandidate(candidate));
				} catch (error) {
					console.warn(`[VoiceClient] Failed to add pending ICE candidate for ${peerId}:`, error);
				}
			}
			
			// Clear pending candidates
			this.pendingIceCandidates.delete(peerId);
		}
	}

	private async handleNewPeer(peerId: string) {
		if (this.peerConnections.has(peerId) || peerId === this.opts.userId) return;
		
		console.log(`[VoiceClient] Handling new peer: ${peerId}`);
		
		try {
			const pc = await this.createPeerConnection(peerId);
			this.peerConnections.set(peerId, pc);
			this.onPeersChanged?.(Array.from(this.peerConnections.keys()));
			
			// Create and send offer to new peer
			const offer = await pc.createOffer({ offerToReceiveAudio: true });
			await pc.setLocalDescription(offer);
			await this.signaling.send({ type: 'offer', from: this.opts.userId, to: peerId, sdp: offer });
			
			console.log(`[VoiceClient] Sent offer to ${peerId}`);
		} catch (error) {
			console.error(`[VoiceClient] Failed to handle new peer ${peerId}:`, error);
		}
	}

	async init() {
		try {
			console.log('[VoiceClient] Initializing signaling for room:', this.opts.roomId);
			await this.signaling.subscribe(this.onSignal);
			await this.signaling.presence((peers) => {
				console.log('[VoiceClient] Presence update received:', peers);
				this.onPresenceUpdate?.(peers);
				
				// Handle new peers - create connections to peers that joined after us
				console.log('[VoiceClient] Processing peers for connections:', peers.map(p => p.id));
				peers.forEach(peer => {
					const shouldConnect = peer.id !== this.opts.userId && peer.id > this.opts.userId;
					console.log(`[VoiceClient] Checking peer ${peer.id} vs ${this.opts.userId}: ${shouldConnect ? 'WILL CONNECT' : 'SKIP'}`);
					if (shouldConnect) {
						// Only initiate connection if our ID is lexicographically smaller (prevents duplicate connections)
						console.log(`[VoiceClient] Initiating connection to peer: ${peer.id}`);
						this.handleNewPeer(peer.id);
					}
				});
			}, { userId: this.opts.userId, connected: true });
			console.log('[VoiceClient] Signaling initialized successfully');
		} catch (error) {
			console.error('[VoiceClient] Failed to initialize signaling:', error);
			this.handleError(new Error(`Failed to initialize signaling: ${error}`));
		}
	}

	private updateConnectionState(state: 'disconnected' | 'connecting' | 'connected' | 'failed') {
		if (this.connectionState !== state) {
			this.connectionState = state;
			this.onConnectionStateChange?.(state);
		}
	}

	private handleError(error: Error) {
		console.error('[VoiceClient]', error);
		this.onError?.(error);
	}

	private clearReconnectTimer() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}

	private setupVuMeter(stream: MediaStream) {
		try {
			this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			const source = this.audioContext.createMediaStreamSource(stream);
			this.analyser = this.audioContext.createAnalyser();
			
			// Optimize analyser settings for performance
			this.analyser.fftSize = 128; // Reduced from 256 for better performance
			this.analyser.smoothingTimeConstant = 0.8; // Smooth out rapid changes
			
			source.connect(this.analyser);
			
			// Use Float32Array for better precision and performance
			const dataArray = new Float32Array(this.analyser.frequencyBinCount);
			
			// Optimized tick function with buffering
			let frameCount = 0;
			const tick = () => {
				if (!this.analyser) return;
				
				// Only process every 3rd frame to reduce CPU usage
				frameCount++;
				if (frameCount % 3 !== 0) {
					requestAnimationFrame(tick);
					return;
				}
				
				this.analyser.getFloatTimeDomainData(dataArray);
				
				// Optimized RMS calculation with buffering
				let sum = 0;
				const bufferLength = dataArray.length;
				for (let i = 0; i < bufferLength; i++) {
					sum += dataArray[i] * dataArray[i];
				}
				const rms = Math.sqrt(sum / bufferLength);
				
				// Add to circular buffer for smoothing
				this.audioBuffer.push(new Float32Array(dataArray));
				if (this.audioBuffer.length > this.maxBufferSize) {
					this.audioBuffer.shift();
				}
				
				// Calculate smoothed RMS from buffer
				const smoothedRms = this.calculateSmoothedRMS();
				this.onLevel?.(smoothedRms);
				
				// Voice Activity Detection with hysteresis to prevent rapid switching
				const speaking = smoothedRms > this.vadThreshold;
				if (speaking !== this.isSpeaking) {
					this.isSpeaking = speaking;
					this.onSpeakingChange?.(speaking);
					// Broadcast speaking state to other peers
					this.signaling.updatePresence({ speaking, level: rms });
				}
				
				requestAnimationFrame(tick);
			};
			tick();
		} catch {}
	}

	private setupRemoteAudioAnalysis(userId: string, stream: MediaStream) {
		try {
			const context = new (window.AudioContext || (window as any).webkitAudioContext)();
			const source = context.createMediaStreamSource(stream);
			const analyser = context.createAnalyser();
			
			// Optimize for performance - use smaller FFT size and higher smoothing
			analyser.fftSize = 64; // Reduced from 256 for better performance
			analyser.smoothingTimeConstant = 0.85; // Higher smoothing for stability
			
			source.connect(analyser);
			
			this.remoteAnalysers.set(userId, { analyser, context });
			
			// Use Float32Array for better performance
			const dataArray = new Float32Array(analyser.frequencyBinCount);
			let lastSpeaking = false;
			let frameSkipCounter = 0;
			let speakingHistory: boolean[] = []; // For hysteresis
			const maxHistoryLength = 5;
			
			const tick = () => {
				if (!this.remoteAnalysers.has(userId)) return;
				
				// Skip frames to reduce CPU usage (process every 4th frame)
				frameSkipCounter++;
				if (frameSkipCounter % 4 !== 0) {
					requestAnimationFrame(tick);
					return;
				}
				
				analyser.getFloatTimeDomainData(dataArray);
				
				// Optimized RMS calculation
				let sum = 0;
				const bufferLength = dataArray.length;
				for (let i = 0; i < bufferLength; i++) {
					sum += dataArray[i] * dataArray[i];
				}
				const rms = Math.sqrt(sum / bufferLength);
				
				// Apply hysteresis to prevent rapid switching
				const rawSpeaking = rms > this.vadThreshold;
				speakingHistory.push(rawSpeaking);
				if (speakingHistory.length > maxHistoryLength) {
					speakingHistory.shift();
				}
				
				// Require majority of recent samples to agree for state change
				const speakingVotes = speakingHistory.filter(s => s).length;
				const speaking = speakingVotes > maxHistoryLength / 2;
				
				if (speaking !== lastSpeaking) {
					lastSpeaking = speaking;
					this.onRemoteSpeaking?.(userId, speaking);
				}
				
				requestAnimationFrame(tick);
			};
			tick();
		} catch {}
	}

	join = async () => {
		if (this.isDestroyed) {
			throw new Error('VoiceClient has been destroyed');
		}

		try {
			this.updateConnectionState('connecting');
			this.clearReconnectTimer();

			// Get user media with error handling
				const saved = typeof window !== 'undefined' ? {
					echoCancellation: localStorage.getItem('hexcall-audio-ec') !== '0',
					noiseSuppression: localStorage.getItem('hexcall-audio-ns') !== '0',
					autoGainControl: localStorage.getItem('hexcall-audio-agc') !== '0',
				} : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

				const audioConstraints: any = this.opts.micDeviceId ? { deviceId: this.opts.micDeviceId } : {};
				audioConstraints.echoCancellation = saved.echoCancellation;
				audioConstraints.noiseSuppression = saved.noiseSuppression;
				audioConstraints.autoGainControl = saved.autoGainControl;

				this.stream = await navigator.mediaDevices.getUserMedia({ 
					audio: Object.keys(audioConstraints).length ? audioConstraints : true 
				});
				
				this.setupVuMeter(this.stream);
			
			console.log('[VoiceClient] Successfully joined room, waiting for peers...');
		} catch (error) {
			this.updateConnectionState('failed');
			this.handleError(error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	};

	async applyConstraints(update: Partial<NonNullable<VoiceClientOptions['constraints']>>) {
		if (!this.stream) return;
		const track = this.stream.getAudioTracks()[0];
		if (!track) return;
		const current = (track.getConstraints?.() as MediaTrackConstraints) || ({} as any);
		const next: MediaTrackConstraints = {
			...current,
			...update,
		};
		try {
			await (track as MediaStreamTrack).applyConstraints(next);
		} catch {}
	}

	private onSignal = async (msg: SignalMessage) => {
		if (this.isDestroyed) return;
		
		// Ignore messages from self
		if (msg.from === this.opts.userId) return;
		
		console.log(`[VoiceClient] Received ${msg.type} from ${msg.from}`);
		
		try {
			switch (msg.type) {
				case 'offer': {
					// Get or create peer connection for this peer
					let pc = this.peerConnections.get(msg.from);
					if (!pc) {
						pc = await this.createPeerConnection(msg.from);
						this.peerConnections.set(msg.from, pc);
						// Notify UI that a new peer connection exists (so participants list updates)
						this.onPeersChanged?.(Array.from(this.peerConnections.keys()));
					}
					
					// Handle offer collision - if we're in wrong state, reset the connection
					if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
						console.log(`[VoiceClient] Offer collision detected with ${msg.from}, resetting connection`);
						pc.close();
						pc = await this.createPeerConnection(msg.from);
						this.peerConnections.set(msg.from, pc);
					}
					
					// If we have a local offer and this is an offer collision, decide who wins
					if (pc.signalingState === 'have-local-offer') {
						// Use lexicographic comparison to decide who wins
						if (msg.from > this.opts.userId) {
							// Remote wins, we become answerer
							console.log(`[VoiceClient] Offer collision: remote wins, becoming answerer for ${msg.from}`);
						} else {
							// We win, ignore remote offer
							console.log(`[VoiceClient] Offer collision: we win, ignoring offer from ${msg.from}`);
							return;
						}
					}
					
					await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
					
					// Process any pending ICE candidates now that we have remote description
					await this.processPendingIceCandidates(msg.from);
					
					const answer = await pc.createAnswer();
					await pc.setLocalDescription(answer);
					await this.signaling.send({ type: 'answer', from: this.opts.userId, to: msg.from, sdp: answer });
					console.log(`[VoiceClient] Sent answer to ${msg.from}`);
					break;
				}
				case 'answer': {
					// Only process answers meant for us
					if (msg.to !== this.opts.userId) return;
					
					const pc = this.peerConnections.get(msg.from);
					if (pc) {
						await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
						
						// Process any pending ICE candidates now that we have remote description
						await this.processPendingIceCandidates(msg.from);
						
					console.log(`[VoiceClient] Processed answer from ${msg.from}`);
					} else {
						console.warn(`[VoiceClient] No peer connection found for answer from ${msg.from}`);
					}
					break;
				}
				case 'ice': {
					// Only process ICE candidates meant for us or broadcast to all
					if (msg.to !== this.opts.userId && msg.to !== '*') return;
					
					const pc = this.peerConnections.get(msg.from);
					if (pc && pc.remoteDescription) {
						await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
					console.log(`[VoiceClient] Added ICE candidate from ${msg.from}`);
					} else {
						// Queue ICE candidate for later processing
						if (!this.pendingIceCandidates.has(msg.from)) {
							this.pendingIceCandidates.set(msg.from, []);
						}
						this.pendingIceCandidates.get(msg.from)!.push(msg.candidate);
						console.log(`[VoiceClient] Queued ICE candidate from ${msg.from} (no remote description yet)`);
					}
					break;
				}
			}
		} catch (error) {
			console.error(`[VoiceClient] Error processing ${msg.type} from ${msg.from}:`, error);
		}
	};

	private async tryReconnect() {
		if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.log(`[VoiceClient] Max reconnection attempts reached (${this.maxReconnectAttempts})`);
			this.updateConnectionState('failed');
			return;
		}

		this.reconnectAttempts += 1;
		const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Cap at 30 seconds
		
		console.log(`[VoiceClient] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
		
		this.clearReconnectTimer();
		this.reconnectTimer = setTimeout(async () => {
			if (this.isDestroyed) return;
			
			try {
				await this.cleanup(false);
				await this.join();
			} catch (error) {
				this.handleError(new Error(`Reconnection attempt ${this.reconnectAttempts} failed: ${error}`));
				// Will trigger another reconnection attempt via connection state change
			}
		}, delay);
	}

	mute(muted: boolean) {
		// Don't allow manual muting when push-to-talk is enabled
		if (this.pushToTalkEnabled) {
			console.warn('[VoiceClient] Cannot manually mute when push-to-talk is enabled');
			return;
		}
		
		this.stream?.getAudioTracks().forEach(t => (t.enabled = !muted));
	}

	updatePresence(meta: any) {
		return this.signaling.updatePresence(meta);
	}

	cleanup = async (closeSignaling: boolean = true) => {
		console.log('[VoiceClient] Cleaning up resources...');
		
		this.isDestroyed = closeSignaling; // Only mark as destroyed if fully cleaning up
		this.clearReconnectTimer();
		this.stopStatsMonitoring(); // Stop stats monitoring
		
		// Clear audio buffers to free memory
		this.audioBuffer = [];
		
		// Cleanup audio worklet if exists
		if (this.audioWorklet) {
			this.audioWorklet.disconnect();
			this.audioWorklet = null;
		}
		
		// Stop local media stream
		if (this.stream) {
			this.stream.getTracks().forEach(track => {
				track.stop();
				console.log(`[VoiceClient] Stopped track: ${track.kind}`);
			});
			this.stream = null;
		}
		
		// Close all peer connections
		this.peerConnections.forEach((pc, peerId) => {
			pc.close();
			console.log(`[VoiceClient] Closed peer connection to ${peerId}`);
		});
		this.peerConnections.clear();
		
		// Clear pending ICE candidates
		this.pendingIceCandidates.clear();
		
		// Close legacy single peer connection if it exists
		if (this.pc) {
			this.pc.close();
			this.pc = null;
			console.log('[VoiceClient] Closed peer connection');
		}
		
		// Cleanup local audio analysis
		try {
			if (this.analyser) {
				this.analyser.disconnect();
				this.analyser = null;
			}
			if (this.audioContext && this.audioContext.state !== 'closed') {
				await this.audioContext.close();
				this.audioContext = null;
			}
		} catch (error) {
			console.warn('[VoiceClient] Error cleaning up audio context:', error);
		}
		
		// Cleanup remote audio elements and analyzers
		this.remoteAudioEls.forEach((audio, userId) => {
			try {
				audio.pause();
				audio.srcObject = null;
				audio.remove();
				console.log(`[VoiceClient] Cleaned up audio element for user: ${userId}`);
			} catch (error) {
				console.warn(`[VoiceClient] Error cleaning up audio element for ${userId}:`, error);
			}
		});
		this.remoteAudioEls.clear();
		
		this.remoteAnalysers.forEach(({ analyser, context }, userId) => {
			try {
				analyser.disconnect();
				context.close();
				console.log(`[VoiceClient] Cleaned up analyser for user: ${userId}`);
			} catch (error) {
				console.warn(`[VoiceClient] Error cleaning up analyser for ${userId}:`, error);
			}
		});
		this.remoteAnalysers.clear();
		
		// Close signaling if requested
		if (closeSignaling) {
			try {
				await this.signaling.close();
				console.log('[VoiceClient] Closed signaling connection');
			} catch (error) {
				console.warn('[VoiceClient] Error closing signaling:', error);
			}
		}
		
		// Reset state
		if (closeSignaling) {
			this.reconnectAttempts = 0;
			this.updateConnectionState('disconnected');
		}
		
		console.log('[VoiceClient] Cleanup completed');
	};
}


