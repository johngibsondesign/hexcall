import { useEffect, useRef, useState } from 'react';
import { useVoiceRoom } from '../hooks/useVoiceRoom';
import { useVoice } from '../providers/VoiceProvider';
import { DetailedConnectionStats } from '../components/ConnectionQualityIndicator';
import Link from 'next/link';
import { FaArrowsRotate } from 'react-icons/fa6';

type MediaDeviceInfoLite = Pick<MediaDeviceInfo, 'deviceId' | 'label' | 'kind'>;

type Corner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export default function Settings() {
	const [mics, setMics] = useState<MediaDeviceInfoLite[]>([]);
	const [speakers, setSpeakers] = useState<MediaDeviceInfoLite[]>([]);
	const [selectedMic, setSelectedMic] = useState<string>('');
	const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
	const [pushToTalkKey, setPushToTalkKey] = useState<string>('LeftAlt');
	const [usePushToTalk, setUsePushToTalk] = useState<boolean>(false);
	const [level, setLevel] = useState(0);
	const [corner, setCorner] = useState<Corner>('top-right');
	const [scale, setScale] = useState<number>(1);
	const [echoCancellation, setEchoCancellation] = useState(true);
	const [noiseSuppression, setNoiseSuppression] = useState(true);
	const [autoGainControl, setAutoGainControl] = useState(true);
	const [noiseGate, setNoiseGate] = useState(0.03);
	const [autoJoin, setAutoJoin] = useState(true);
	const [vadThreshold, setVadThreshold] = useState(0.01);

	const micCtxRef = useRef<AudioContext | null>(null);
	const micAnalyserRef = useRef<AnalyserNode | null>(null);
	const micRafRef = useRef<number | null>(null);
	
	const { setVadThreshold: setVoiceVadThreshold } = useVoiceRoom('idle', 'local-settings');
	const { setPushToTalkEnabled, connectionStats } = useVoice();
	const [isTestingAudio, setIsTestingAudio] = useState(false);
	const [testAudioVolume, setTestAudioVolume] = useState(0);
	const micStreamRef = useRef<MediaStream | null>(null);

	useEffect(() => {
		try {
			const savedMic = localStorage.getItem('hexcall-mic');
			if (savedMic) setSelectedMic(savedMic);
			const savedSpk = localStorage.getItem('hexcall-speaker');
			if (savedSpk) setSelectedSpeaker(savedSpk);
			const savedPtt = localStorage.getItem('hexcall-ptt-key');
			if (savedPtt) setPushToTalkKey(savedPtt);
			const savedUse = localStorage.getItem('hexcall-ptt-enabled');
			if (savedUse) setUsePushToTalk(savedUse === '1');
			const ec = localStorage.getItem('hexcall-audio-ec');
			const ns = localStorage.getItem('hexcall-audio-ns');
			const agc = localStorage.getItem('hexcall-audio-agc');
			const ng = localStorage.getItem('hexcall-audio-gate');
			if (ec !== null) setEchoCancellation(ec !== '0');
			if (ns !== null) setNoiseSuppression(ns !== '0');
			if (agc !== null) setAutoGainControl(agc !== '0');
			if (ng !== null) setNoiseGate(Number(ng));
			const aj = localStorage.getItem('hexcall-auto-join');
			if (aj !== null) setAutoJoin(aj !== '0');
			const vad = localStorage.getItem('hexcall-vad-threshold');
			if (vad !== null) setVadThreshold(Number(vad));
		} catch {}
	}, []);

	const refreshDevices = async () => {
		try {
			// Request permissions first
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			stream.getTracks().forEach(t => t.stop());
		} catch {}
		
		const devices = await navigator.mediaDevices.enumerateDevices();
		setMics(devices.filter(d => d.kind === 'audioinput'));
		setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
	};

	useEffect(() => {
		refreshDevices();
	}, []);

	function stopMicMonitor() {
		if (micRafRef.current) cancelAnimationFrame(micRafRef.current);
		micRafRef.current = null;
		micAnalyserRef.current?.disconnect();
		micCtxRef.current?.close().catch(() => {});
		micAnalyserRef.current = null;
		micCtxRef.current = null;
		micStreamRef.current?.getTracks().forEach(t => t.stop());
		micStreamRef.current = null;
	}

	async function startMicMonitor() {
		stopMicMonitor();
		try {
			const constraints: MediaTrackConstraints = selectedMic ? { deviceId: selectedMic } : {};
			constraints.echoCancellation = echoCancellation;
			constraints.noiseSuppression = noiseSuppression;
			constraints.autoGainControl = autoGainControl;
			micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: Object.keys(constraints).length ? constraints : true });
			micCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
			const src = micCtxRef.current.createMediaStreamSource(micStreamRef.current);
			const gateNode = micCtxRef.current.createScriptProcessor(256, 1, 1);
			gateNode.onaudioprocess = (ev) => {
				const input = ev.inputBuffer.getChannelData(0);
				const output = ev.outputBuffer.getChannelData(0);
				let power = 0;
				for (let i = 0; i < input.length; i++) { const v = input[i]; power += v * v; }
				const rms = Math.sqrt(power / input.length);
				for (let i = 0; i < input.length; i++) { output[i] = rms < noiseGate ? 0 : input[i]; }
			};
			micAnalyserRef.current = micCtxRef.current.createAnalyser();
			micAnalyserRef.current.fftSize = 256;
			src.connect(gateNode).connect(micAnalyserRef.current);
			const data = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
			const tick = () => {
				if (!micAnalyserRef.current) return;
				micAnalyserRef.current.getByteTimeDomainData(data);
				let sum = 0;
				for (let i = 0; i < data.length; i++) {
					const v = (data[i] - 128) / 128;
					sum += v * v;
				}
				const rms = Math.sqrt(sum / data.length);
				setLevel(rms);
				micRafRef.current = requestAnimationFrame(tick);
			};
			tick();
		} catch {
			setLevel(0);
		}
	}

	useEffect(() => {
		startMicMonitor();
		return () => stopMicMonitor();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedMic, echoCancellation, noiseSuppression, autoGainControl, noiseGate]);

	useEffect(() => {
		try { localStorage.setItem('hexcall-mic', selectedMic || ''); } catch {}
	}, [selectedMic]);
	useEffect(() => {
		try { localStorage.setItem('hexcall-speaker', selectedSpeaker || ''); } catch {}
		const audios = document.querySelectorAll('audio');
		// @ts-ignore
		audios.forEach((a: HTMLAudioElement) => {
			if ('setSinkId' in a && selectedSpeaker) {
				(a as any).setSinkId(selectedSpeaker);
			}
		});
	}, [selectedSpeaker]);
	useEffect(() => {
		try { localStorage.setItem('hexcall-ptt-key', pushToTalkKey || ''); } catch {}
	}, [pushToTalkKey]);
	useEffect(() => {
		try { localStorage.setItem('hexcall-ptt-enabled', usePushToTalk ? '1' : '0'); } catch {}
	}, [usePushToTalk]);
	useEffect(() => { try { localStorage.setItem('hexcall-auto-join', autoJoin ? '1' : '0'); } catch {} }, [autoJoin]);
	useEffect(() => { try { localStorage.setItem('hexcall-audio-ec', echoCancellation ? '1' : '0'); } catch {} }, [echoCancellation]);
	useEffect(() => { try { localStorage.setItem('hexcall-audio-ns', noiseSuppression ? '1' : '0'); } catch {} }, [noiseSuppression]);
	useEffect(() => { try { localStorage.setItem('hexcall-audio-agc', autoGainControl ? '1' : '0'); } catch {} }, [autoGainControl]);
	useEffect(() => { try { localStorage.setItem('hexcall-audio-gate', String(noiseGate)); } catch {} }, [noiseGate]);
	useEffect(() => { try { localStorage.setItem('hexcall-vad-threshold', String(vadThreshold)); } catch {} }, [vadThreshold]);

	useEffect(() => {
		try {
			const c = localStorage.getItem('hexcall-overlay-corner') as Corner | null;
			const s = Number(localStorage.getItem('hexcall-overlay-scale') || '1');
			if (c) setCorner(c);
			if (s) setScale(s);
			window.hexcall?.setOverlayCorner?.(c || 'top-right');
			window.hexcall?.setOverlayScale?.(s || 1);
		} catch {}
	}, []);

	useEffect(() => {
		try { localStorage.setItem('hexcall-overlay-corner', corner); } catch {}
		window.hexcall?.setOverlayCorner?.(corner);
	}, [corner]);

	useEffect(() => {
		try { localStorage.setItem('hexcall-overlay-scale', String(scale)); } catch {}
		window.hexcall?.setOverlayScale?.(scale);
	}, [scale]);

	const userId = 'local-' + (typeof window !== 'undefined' ? (window.crypto?.randomUUID?.() || 'user') : 'user');
	const { connected, join, mute, canJoin, applyConstraints, setVadThreshold: setVoiceRoomVadThreshold } = useVoiceRoom('test-room', userId, selectedMic);

	useEffect(() => {
		applyConstraints?.({ echoCancellation, noiseSuppression, autoGainControl });
	}, [applyConstraints, echoCancellation, noiseSuppression, autoGainControl]);

	useEffect(() => {
		setVoiceVadThreshold?.(vadThreshold);
	}, [setVoiceVadThreshold, vadThreshold]);

	// Load and save push-to-talk settings
	useEffect(() => {
		try {
			const savedPTT = localStorage.getItem('hexcall-push-to-talk');
			if (savedPTT) {
				const pttSettings = JSON.parse(savedPTT);
				setUsePushToTalk(pttSettings.enabled || false);
				setPushToTalkKey(pttSettings.key || 'CapsLock');
			}
		} catch {}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem('hexcall-push-to-talk', JSON.stringify({
				enabled: usePushToTalk,
				key: pushToTalkKey
			}));
		} catch {}

		// Update Electron settings
		if (typeof window !== 'undefined' && window.hexcall?.pushToTalkUpdateSettings) {
			window.hexcall.pushToTalkUpdateSettings(usePushToTalk, pushToTalkKey);
		}

		// Update voice client
		setPushToTalkEnabled?.(usePushToTalk);
	}, [usePushToTalk, pushToTalkKey, setPushToTalkEnabled]);

	// Audio testing functions
	const startAudioTest = async () => {
		try {
			setIsTestingAudio(true);
			
			// Get microphone stream
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: { deviceId: selectedMic || undefined }
			});

			// Create audio context for testing
			const context = new (window.AudioContext || (window as any).webkitAudioContext)();
			const source = context.createMediaStreamSource(stream);
			const analyser = context.createAnalyser();
			analyser.fftSize = 256;
			source.connect(analyser);

			const dataArray = new Uint8Array(analyser.frequencyBinCount);
			
			const updateVolume = () => {
				if (!isTestingAudio) {
					// Cleanup
					stream.getTracks().forEach(track => track.stop());
					context.close();
					return;
				}

				analyser.getByteFrequencyData(dataArray);
				const average = dataArray.reduce((acc, value) => acc + value, 0) / dataArray.length;
				setTestAudioVolume(average / 255);
				
				requestAnimationFrame(updateVolume);
			};

			updateVolume();
		} catch (error) {
			console.error('Audio test failed:', error);
			setIsTestingAudio(false);
		}
	};

	const stopAudioTest = () => {
		setIsTestingAudio(false);
		setTestAudioVolume(0);
	};

	// Settings export/import functions
	const exportSettings = () => {
		const settings = {
			selectedMic,
			selectedSpeaker,
			pushToTalkKey,
			usePushToTalk,
			corner,
			scale,
			echoCancellation,
			noiseSuppression,
			autoGainControl,
			vadThreshold,
			autoJoin,
			version: '1.0',
			exportDate: new Date().toISOString()
		};

		const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `hexcall-settings-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const settings = JSON.parse(e.target?.result as string);
				
				// Apply imported settings
				if (settings.selectedMic) setSelectedMic(settings.selectedMic);
				if (settings.selectedSpeaker) setSelectedSpeaker(settings.selectedSpeaker);
				if (settings.pushToTalkKey) setPushToTalkKey(settings.pushToTalkKey);
				if (typeof settings.usePushToTalk === 'boolean') setUsePushToTalk(settings.usePushToTalk);
				if (settings.corner) setCorner(settings.corner);
				if (typeof settings.scale === 'number') setScale(settings.scale);
				if (typeof settings.echoCancellation === 'boolean') setEchoCancellation(settings.echoCancellation);
				if (typeof settings.noiseSuppression === 'boolean') setNoiseSuppression(settings.noiseSuppression);
				if (typeof settings.autoGainControl === 'boolean') setAutoGainControl(settings.autoGainControl);
				if (typeof settings.vadThreshold === 'number') setVadThreshold(settings.vadThreshold);
				if (typeof settings.autoJoin === 'boolean') setAutoJoin(settings.autoJoin);

				alert('Settings imported successfully!');
			} catch (error) {
				alert('Failed to import settings. Please check the file format.');
			}
		};
		reader.readAsText(file);
	};

	useEffect(() => {
		import('../modules/webrtc/voiceClient').then(({ VoiceClient }) => {
			const anyWindow = window as any;
			const vc: any = anyWindow.__hexcall_vc;
			if (vc && typeof vc.onLevel === 'function') {
				vc.onLevel = (rms: number) => setLevel(rms);
			}
		});
	}, []);

	async function testOutputTone() {
		try {
			const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
			const osc = ctx.createOscillator();
			osc.type = 'sine';
			osc.frequency.value = 440;
			const gain = ctx.createGain();
			gain.gain.value = 0.1;
			const dest = ctx.createMediaStreamDestination();
			osc.connect(gain).connect(dest);
			osc.start();
			const audio = new Audio();
			// @ts-ignore
			if (audio.setSinkId && selectedSpeaker) await (audio as any).setSinkId(selectedSpeaker);
			audio.srcObject = dest.stream as any;
			audio.play();
			setTimeout(() => { osc.stop(); ctx.close(); }, 800);
		} catch {}
	}

	return (
		<div className="min-h-screen bg-hextech">
			<div className="max-w-5xl mx-auto px-6 py-8">
				<div className="flex items-center gap-3">
					<Link href="/" className="chip rounded px-2 py-1">← Back</Link>
					<h1 className="text-3xl font-bold text-gradient">Settings</h1>
				</div>
				<div className="mt-6 grid md:grid-cols-2 gap-6">
					<div className="glass rounded-xl p-5">
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-sm text-neutral-300">Audio Devices</h2>
							<button
								onClick={refreshDevices}
								className="p-2 rounded-lg hover:bg-white/10 transition-colors text-neutral-400 hover:text-white"
								title="Refresh devices"
							>
								<FaArrowsRotate className="w-4 h-4" />
							</button>
						</div>
						<label className="text-xs text-neutral-400">Microphone</label>
						<select
							className="mt-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 w-full"
							value={selectedMic}
							onChange={e => setSelectedMic(e.target.value)}
						>
							<option value="">System Default</option>
							{mics.map(d => (
								<option key={d.deviceId} value={d.deviceId}>{d.label || 'Mic'}</option>
							))}
						</select>

						{/* Audio Testing */}
						<div className="mt-4">
							<div className="flex items-center justify-between mb-2">
								<label className="text-xs text-neutral-400">Audio Test</label>
								<button
									onClick={isTestingAudio ? stopAudioTest : startAudioTest}
									className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
										isTestingAudio 
											? 'bg-red-500 hover:bg-red-600 text-white' 
											: 'bg-violet-500 hover:bg-violet-600 text-white'
									}`}
								>
									{isTestingAudio ? 'Stop Test' : 'Test Mic'}
								</button>
							</div>
							{isTestingAudio && (
								<div className="flex gap-2">
									<div className="flex-1 bg-neutral-800 rounded-full h-2 overflow-hidden">
										<div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${testAudioVolume * 100}%` }}></div>
									</div>
									<span className="text-xs text-green-400 min-w-[3ch]">{Math.round(testAudioVolume * 100)}%</span>
								</div>
							)}
						</div>

						<label className="mt-4 text-xs text-neutral-400">Output Device</label>
						<select
							className="mt-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 w-full"
							value={selectedSpeaker}
							onChange={e => setSelectedSpeaker(e.target.value)}
						>
							<option value="">System Default</option>
							{speakers.map(d => (
								<option key={d.deviceId} value={d.deviceId}>{d.label || 'Speakers'}</option>
							))}
						</select>

						<div className="mt-4">
							<div className="h-2 bg-neutral-900 rounded overflow-hidden border border-neutral-800">
								<div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-[width] duration-100" style={{ width: `${Math.min(1, level * 4) * 100}%` }} />
							</div>
							<p className="mt-1 text-xs text-neutral-400">Mic input level</p>
							<div className="mt-2">
								<button onClick={testOutputTone} className="px-3 py-2 rounded chip">Test Output</button>
							</div>
						</div>
					</div>

					<div className="glass rounded-xl p-5">
						<h2 className="text-sm text-neutral-300 mb-3">Controls</h2>
						<div className="grid gap-2">
							<label className="text-xs text-neutral-400">Push-to-talk</label>
							<div className="flex items-center gap-3">
								<input type="checkbox" checked={usePushToTalk} onChange={e => setUsePushToTalk(e.target.checked)} />
								<input
									className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2"
									value={pushToTalkKey}
									onChange={e => setPushToTalkKey(e.target.value)}
								/>
							</div>
							<label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={autoJoin} onChange={e => setAutoJoin(e.target.checked)} /> Auto join calls (recommended)</label>
						</div>
						<div className="mt-5 grid gap-3">
							<h3 className="text-xs text-neutral-400">Audio Improvements</h3>
							<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={echoCancellation} onChange={e => setEchoCancellation(e.target.checked)} /> Echo Cancellation</label>
							<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={noiseSuppression} onChange={e => setNoiseSuppression(e.target.checked)} /> Noise Suppression</label>
							<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoGainControl} onChange={e => setAutoGainControl(e.target.checked)} /> Auto Gain Control</label>
							<label className="text-xs text-neutral-400">Noise gate (beta) {noiseGate.toFixed(2)}</label>
							<input type="range" min={0} max={0.2} step={0.005} value={noiseGate} onChange={e => setNoiseGate(Number(e.target.value))} />
							<label className="text-xs text-neutral-400">Voice detection threshold {vadThreshold.toFixed(3)}</label>
							<input type="range" min={0.001} max={0.1} step={0.001} value={vadThreshold} onChange={e => setVadThreshold(Number(e.target.value))} />
							<p className="text-xs text-neutral-500">Lower = more sensitive to voice, Higher = less sensitive</p>
							<div className="flex items-center gap-3">
								<button onClick={() => join()} disabled={!canJoin} className="btn-primary px-4 py-2 rounded ring-hextech disabled:opacity-50">{connected ? 'Connected' : (canJoin ? 'Join Test Room' : 'Waiting for another user…')}</button>
								<button onClick={() => mute(true)} className="px-4 py-2 rounded chip">Mute</button>
								<button onClick={() => mute(false)} className="px-4 py-2 rounded chip">Unmute</button>
							</div>
						</div>
					</div>

					<div className="glass rounded-xl p-5">
						<h2 className="text-sm text-neutral-300 mb-3">Connection Stats</h2>
						<DetailedConnectionStats stats={connectionStats || null} />
					</div>

					<div className="glass rounded-xl p-5">
						<h2 className="text-sm text-neutral-300 mb-3">Settings Backup</h2>
						<div className="grid gap-3">
							<div className="flex gap-2">
								<button
									onClick={exportSettings}
									className="flex-1 bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded transition-colors text-sm font-medium"
								>
									Export Settings
								</button>
								<label className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded transition-colors text-sm font-medium cursor-pointer text-center">
									Import Settings
									<input
										type="file"
										accept=".json"
										onChange={importSettings}
										className="hidden"
									/>
								</label>
							</div>
							<p className="text-xs text-neutral-400">
								Export your settings to backup or share with other devices. Import to restore previous settings.
							</p>
						</div>
					</div>

					<div className="glass rounded-xl p-5">
						<h2 className="text-sm text-neutral-300 mb-3">Overlay</h2>
						<div className="grid gap-3">
							<label className="text-xs text-neutral-400">Corner</label>
							<select className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 w-full" value={corner} onChange={e => setCorner(e.target.value as Corner)}>
								<option value="top-right">Top Right</option>
								<option value="top-left">Top Left</option>
								<option value="bottom-right">Bottom Right</option>
								<option value="bottom-left">Bottom Left</option>
							</select>
							<label className="text-xs text-neutral-400">Scale ({(scale).toFixed(2)}x)</label>
							<input type="range" min={0.75} max={1.5} step={0.05} value={scale} onChange={e => setScale(Number(e.target.value))} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}


