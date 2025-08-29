import { useEffect, useRef, useState } from 'react';
import { useVoiceRoom } from '../hooks/useVoiceRoom';
import Link from 'next/link';

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

	const micCtxRef = useRef<AudioContext | null>(null);
	const micAnalyserRef = useRef<AnalyserNode | null>(null);
	const micRafRef = useRef<number | null>(null);
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
		} catch {}
	}, []);

	useEffect(() => {
		(async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				stream.getTracks().forEach(t => t.stop());
			} catch {}
			const devices = await navigator.mediaDevices.enumerateDevices();
			setMics(devices.filter(d => d.kind === 'audioinput'));
			setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
		})();
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
			const constraints: any = selectedMic ? { deviceId: selectedMic } : {};
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
		audios.forEach((a: any) => a.setSinkId && selectedSpeaker && a.setSinkId(selectedSpeaker));
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
	const { connected, join, mute, canJoin, applyConstraints } = useVoiceRoom('test-room', userId, selectedMic);

	useEffect(() => {
		applyConstraints?.({ echoCancellation, noiseSuppression, autoGainControl });
	}, [applyConstraints, echoCancellation, noiseSuppression, autoGainControl]);

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
						<h2 className="text-sm text-neutral-300 mb-3">Audio Devices</h2>
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
							<div className="flex items-center gap-3">
								<button onClick={() => join()} disabled={!canJoin} className="btn-primary px-4 py-2 rounded ring-hextech disabled:opacity-50">{connected ? 'Connected' : (canJoin ? 'Join Test Room' : 'Waiting for another user…')}</button>
								<button onClick={() => mute(true)} className="px-4 py-2 rounded chip">Mute</button>
								<button onClick={() => mute(false)} className="px-4 py-2 rounded chip">Unmute</button>
							</div>
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


