import { useEffect, useState } from 'react';
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
	const { connected, join, mute, canJoin } = useVoiceRoom('test-room', userId, selectedMic);

	useEffect(() => {
		import('../modules/webrtc/voiceClient').then(({ VoiceClient }) => {
			const anyWindow = window as any;
			const vc: any = anyWindow.__hexcall_vc;
			if (vc && typeof vc.onLevel === 'function') {
				vc.onLevel = (rms: number) => setLevel(rms);
			}
		});
	}, []);

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
								<div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-[width] duration-100" style={{ width: `${Math.min(1, level * 3) * 100}%` }} />
							</div>
							<p className="mt-1 text-xs text-neutral-400">Input level</p>
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
						</div>
						<div className="mt-5 flex items-center gap-3">
							<button onClick={() => join()} disabled={!canJoin} className="btn-primary px-4 py-2 rounded ring-hextech disabled:opacity-50">{connected ? 'Connected' : (canJoin ? 'Join Test Room' : 'Waiting for another user…')}</button>
							<button onClick={() => mute(true)} className="px-4 py-2 rounded chip">Mute</button>
							<button onClick={() => mute(false)} className="px-4 py-2 rounded chip">Unmute</button>
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


