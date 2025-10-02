import { useEffect, useRef, useState } from 'react';
import { useVoiceRoom } from '../hooks/useVoiceRoom';
import { useVoice } from '../providers/VoiceProvider';
import { DetailedConnectionStats } from '../components/ConnectionQualityIndicator';
import Link from 'next/link';
import { FaArrowsRotate, FaDownload, FaCheck, FaSpinner, FaMicrophone, FaVolumeHigh, FaGamepad, FaEye, FaGear, FaBug, FaRocket, FaShield, FaLock } from 'react-icons/fa6';

type MediaDeviceInfoLite = Pick<MediaDeviceInfo, 'deviceId' | 'label' | 'kind'>;

type Corner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export default function Settings() {
	const [mics, setMics] = useState<MediaDeviceInfoLite[]>([]);
	const [speakers, setSpeakers] = useState<MediaDeviceInfoLite[]>([]);
	const [selectedMic, setSelectedMic] = useState<string>('');
	const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
	const [pushToTalkKey, setPushToTalkKey] = useState<string>('LeftAlt');
	const [usePushToTalk, setUsePushToTalk] = useState<boolean>(false);
	const [pushToMuteKey, setPushToMuteKey] = useState<string>('V');
	const [usePushToMute, setUsePushToMute] = useState<boolean>(false);
	const [level, setLevel] = useState(0);
	const [corner, setCorner] = useState<Corner>('top-right');
	const [scale, setScale] = useState<number>(1);
    const [overlayLocked, setOverlayLocked] = useState<boolean>(false);
	const [echoCancellation, setEchoCancellation] = useState(true);
	const [noiseSuppression, setNoiseSuppression] = useState(true);
	const [autoGainControl, setAutoGainControl] = useState(true);
	const [noiseGate, setNoiseGate] = useState(0.03);
	const [autoJoin, setAutoJoin] = useState(true);
	const [vadThreshold, setVadThreshold] = useState(0.01);
	const [startOnSystemStart, setStartOnSystemStart] = useState(false);
	const [minimizeToTray, setMinimizeToTray] = useState(true);
	const [showInGameNotifications, setShowInGameNotifications] = useState(true);
	const [showDebug, setShowDebug] = useState(false);
	const [showOverlayPreview, setShowOverlayPreview] = useState(false);
	
	// Update-related state
	const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'none'>('idle');
	const [updateInfo, setUpdateInfo] = useState<any>(null);
	const [downloadProgress, setDownloadProgress] = useState(0);

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
			const savedPtm = localStorage.getItem('hexcall-ptm-key');
			if (savedPtm) setPushToMuteKey(savedPtm);
			const savedUsePtm = localStorage.getItem('hexcall-ptm-enabled');
			if (savedUsePtm) setUsePushToMute(savedUsePtm === '1');
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
			const startup = localStorage.getItem('hexcall-start-on-boot');
			if (startup !== null) setStartOnSystemStart(startup !== '0');
			const locked = localStorage.getItem('hexcall-overlay-locked');
			if (locked !== null) setOverlayLocked(locked === '1');
			const tray = localStorage.getItem('hexcall-minimize-to-tray');
			if (tray !== null) setMinimizeToTray(tray !== '0');
			const notifications = localStorage.getItem('hexcall-in-game-notifications');
			if (notifications !== null) setShowInGameNotifications(notifications !== '0');
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

	// Apply overlay settings to Electron overlay
	useEffect(() => {
		window.hexcall?.setOverlayCorner?.(corner);
		window.hexcall?.setOverlayScale?.(scale);
		window.hexcall?.setOverlayInteractive?.(!overlayLocked);
		window.hexcall?.setOverlayLocked?.(overlayLocked);
		try { localStorage.setItem('hexcall-overlay-locked', overlayLocked ? '1' : '0'); } catch {}
	}, [corner, scale, overlayLocked]);

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
	useEffect(() => {
		try { localStorage.setItem('hexcall-ptm-key', pushToMuteKey || ''); } catch {}
	}, [pushToMuteKey]);
	useEffect(() => {
		try { localStorage.setItem('hexcall-ptm-enabled', usePushToMute ? '1' : '0'); } catch {}
	}, [usePushToMute]);
	useEffect(() => { try { localStorage.setItem('hexcall-auto-join', autoJoin ? '1' : '0'); } catch {} }, [autoJoin]);
	useEffect(() => { try { localStorage.setItem('hexcall-audio-ec', echoCancellation ? '1' : '0'); } catch {} }, [echoCancellation]);
	useEffect(() => { try { localStorage.setItem('hexcall-audio-ns', noiseSuppression ? '1' : '0'); } catch {} }, [noiseSuppression]);
	useEffect(() => { try { localStorage.setItem('hexcall-audio-agc', autoGainControl ? '1' : '0'); } catch {} }, [autoGainControl]);
	useEffect(() => { try { localStorage.setItem('hexcall-audio-gate', String(noiseGate)); } catch {} }, [noiseGate]);
	useEffect(() => { try { localStorage.setItem('hexcall-vad-threshold', String(vadThreshold)); } catch {} }, [vadThreshold]);
	useEffect(() => { 
		try { 
			localStorage.setItem('hexcall-start-on-boot', startOnSystemStart ? '1' : '0');
			// Update Electron setting
			window.hexcall?.setAutoStart?.(startOnSystemStart);
		} catch {} 
	}, [startOnSystemStart]);

	useEffect(() => { 
		try { 
			localStorage.setItem('hexcall-minimize-to-tray', minimizeToTray ? '1' : '0');
			// Update Electron setting
			window.hexcall?.setMinimizeToTray?.(minimizeToTray);
		} catch {} 
	}, [minimizeToTray]);

	useEffect(() => { 
		try { 
			localStorage.setItem('hexcall-in-game-notifications', showInGameNotifications ? '1' : '0');
		} catch {} 
	}, [showInGameNotifications]);

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

	// Load and save push-to-mute settings
	useEffect(() => {
		try {
			const savedPTM = localStorage.getItem('hexcall-push-to-mute');
			if (savedPTM) {
				const ptmSettings = JSON.parse(savedPTM);
				setUsePushToMute(ptmSettings.enabled || false);
				setPushToMuteKey(ptmSettings.key || 'V');
			}
		} catch {}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem('hexcall-push-to-mute', JSON.stringify({
				enabled: usePushToMute,
				key: pushToMuteKey
			}));
		} catch {}

		// Update Electron settings
		if (typeof window !== 'undefined' && window.hexcall?.pushToMuteUpdateSettings) {
			window.hexcall.pushToMuteUpdateSettings(usePushToMute, pushToMuteKey);
		}
	}, [usePushToMute, pushToMuteKey]);

	// Update event listeners
	useEffect(() => {
		if (!window.hexcall) return;

		const offUpdateNone = window.hexcall.onUpdateNone?.(() => {
			setUpdateStatus('none');
		});

		const offUpdateAvailable = window.hexcall.onUpdateAvailable?.((info: any) => {
			setUpdateStatus('available');
			setUpdateInfo(info);
		});

		const offUpdateProgress = window.hexcall.onUpdateProgress?.((progress: any) => {
			setUpdateStatus('downloading');
			setDownloadProgress(Math.round(progress?.percent || 0));
		});

		const offUpdateDownloaded = window.hexcall.onUpdateDownloaded?.(() => {
			setUpdateStatus('downloaded');
			setDownloadProgress(100);
			
			// Show confirmation dialog for auto-install
			const autoInstall = confirm('Update downloaded successfully! Would you like to install and restart the app now?');
			if (autoInstall) {
				installUpdate();
			}
		});

		const offUpdateError = window.hexcall.onUpdateError?.((error: any) => {
			console.error('Update error:', error);
			setUpdateStatus('idle');
			setDownloadProgress(0);
		});

		return () => {
			offUpdateNone?.();
			offUpdateAvailable?.();
			offUpdateProgress?.();
			offUpdateDownloaded?.();
			offUpdateError?.();
		};
	}, []);

	// Update functions
	const checkForUpdates = async () => {
		setUpdateStatus('checking');
		setUpdateInfo(null);
		setDownloadProgress(0);
		try {
			await window.hexcall?.updatesCheck?.();
		} catch (error) {
			console.error('Failed to check for updates:', error);
			setUpdateStatus('idle');
		}
	};

	const downloadUpdate = async () => {
		try {
			setUpdateStatus('downloading');
			setDownloadProgress(0);
			const result = await window.hexcall?.updatesDownload?.();
			
			if (result && !result.success) {
				console.error('Download failed:', result.error);
				setUpdateStatus('available');
				alert('Failed to download update: ' + result.error);
			}
		} catch (error) {
			console.error('Failed to download update:', error);
			setUpdateStatus('available'); // Reset to available state on error
			alert('Failed to download update. Please check your internet connection and try again.');
		}
	};

	const installUpdate = async () => {
		try {
			console.log('Installing update and restarting...');
			
			// Show user that installation is starting
			setUpdateStatus('installing' as any); // Temporary status for UI feedback
			
			const result = await window.hexcall?.updatesQuitAndInstall?.();
			
			if (result && !result.success) {
				console.error('Install failed:', result.error);
				setUpdateStatus('downloaded'); // Reset to downloaded state
				alert('Failed to install update: ' + result.error);
			}
			// If successful, app will restart automatically
		} catch (error) {
			console.error('Failed to install update:', error);
			setUpdateStatus('downloaded'); // Reset to downloaded state
			alert('Failed to install update. Please try again or download manually.');
		}
	};

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
		<div className="bg-hextech min-h-full">
			<div className="max-w-6xl mx-auto px-6 py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div className="flex items-center gap-4">
						<Link href="/" className="w-10 h-10 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700/50 flex items-center justify-center transition-colors">
							<svg className="w-5 h-5 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
						</Link>
						<div>
							<h1 className="text-3xl font-bold text-white">Settings</h1>
							<p className="text-neutral-400 text-sm mt-1">Configure your HexCall experience</p>
						</div>
					</div>
					<button 
						onClick={() => setShowDebug(!showDebug)}
						className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium ${
							showDebug 
								? 'bg-red-500/20 text-red-400 border border-red-500/30' 
								: 'bg-neutral-800/50 text-neutral-300 border border-neutral-700/50 hover:bg-neutral-700/50'
						}`}
					>
						<FaBug className="w-4 h-4" />
						{showDebug ? 'Hide Debug' : 'Debug Mode'}
					</button>
				</div>

				{/* Settings Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
					{/* Audio Devices */}
					<div className="glass rounded-2xl p-6 col-span-1 lg:col-span-2">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
								<FaMicrophone className="w-5 h-5 text-white" />
							</div>
							<div className="flex-1">
								<h2 className="text-lg font-semibold text-white">Audio Devices</h2>
								<p className="text-sm text-neutral-400">Configure your microphone and speakers</p>
				</div>
							<button
								onClick={refreshDevices}
								className="w-10 h-10 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700/50 flex items-center justify-center transition-colors"
								title="Refresh devices"
							>
								<FaArrowsRotate className="w-4 h-4 text-neutral-300" />
							</button>
						</div>

						<div className="grid md:grid-cols-2 gap-6">
							<div className="space-y-4">
								<div>
									<label className="text-sm font-medium text-neutral-300 mb-2 block">Microphone</label>
						<select
										className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
							value={selectedMic}
							onChange={e => setSelectedMic(e.target.value)}
						>
							<option value="">System Default</option>
							{mics.map(d => (
											<option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
							))}
						</select>
						</div>

								<div>
									<label className="text-sm font-medium text-neutral-300 mb-2 block">Output Device</label>
						<select
										className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
							value={selectedSpeaker}
							onChange={e => setSelectedSpeaker(e.target.value)}
						>
							<option value="">System Default</option>
							{speakers.map(d => (
								<option key={d.deviceId} value={d.deviceId}>{d.label || 'Speakers'}</option>
							))}
						</select>
								</div>

								<div className="flex gap-3">
									<button onClick={testOutputTone} className="flex-1 px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700/50 text-neutral-300 hover:text-white transition-colors text-sm font-medium">
										Test Output
									</button>
									<button
										onClick={isTestingAudio ? stopAudioTest : startAudioTest}
										className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
											isTestingAudio 
												? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
												: 'bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30'
										}`}
									>
										{isTestingAudio ? 'Stop Test' : 'Test Mic'}
									</button>
								</div>
							</div>

							<div className="space-y-4">
								<div>
									<label className="text-sm font-medium text-neutral-300 mb-2 block">Microphone Level</label>
									<div className="h-3 bg-neutral-800/50 rounded-full overflow-hidden border border-neutral-700/50">
								<div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-[width] duration-100" style={{ width: `${Math.min(1, level * 4) * 100}%` }} />
							</div>
									<p className="text-xs text-neutral-400 mt-1">Speak to test your microphone</p>
								</div>

								{isTestingAudio && (
									<div>
										<label className="text-sm font-medium text-neutral-300 mb-2 block">Test Audio Level</label>
										<div className="flex gap-3 items-center">
											<div className="flex-1 h-3 bg-neutral-800/50 rounded-full overflow-hidden border border-neutral-700/50">
												<div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${testAudioVolume * 100}%` }}></div>
											</div>
											<span className="text-sm text-green-400 min-w-[3ch] font-mono">{Math.round(testAudioVolume * 100)}%</span>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Voice Controls */}
					<div className="glass rounded-2xl p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
								<FaGear className="w-5 h-5 text-white" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-white">Voice Controls</h2>
								<p className="text-sm text-neutral-400">Push-to-talk and auto-join settings</p>
							</div>
						</div>

						<div className="space-y-6">
							<div>
								<div className="flex items-center justify-between mb-3">
									<label className="text-sm font-medium text-neutral-300">Push-to-Talk</label>
									<label className="relative inline-flex items-center cursor-pointer">
										<input type="checkbox" checked={usePushToTalk} onChange={e => setUsePushToTalk(e.target.checked)} className="sr-only peer" />
										<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500"></div>
									</label>
								</div>
								{usePushToTalk && (
								<input
										className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors text-center font-mono"
									value={pushToTalkKey}
									onChange={e => setPushToTalkKey(e.target.value)}
										placeholder="Enter key..."
									/>
								)}
							</div>

							<div>
								<div className="flex items-center justify-between mb-3">
									<div>
										<label className="text-sm font-medium text-neutral-300">Push-to-Mute</label>
										<p className="text-xs text-neutral-400 mt-1">Hold key to temporarily mute</p>
									</div>
									<label className="relative inline-flex items-center cursor-pointer">
										<input type="checkbox" checked={usePushToMute} onChange={e => setUsePushToMute(e.target.checked)} className="sr-only peer" />
										<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
									</label>
								</div>
								{usePushToMute && (
								<input
										className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors text-center font-mono"
									value={pushToMuteKey}
									onChange={e => setPushToMuteKey(e.target.value)}
										placeholder="Enter key..."
									/>
								)}
							</div>

							<div className="flex items-center justify-between">
								<div>
									<label className="text-sm font-medium text-neutral-300">Auto-join League Calls</label>
									<p className="text-xs text-neutral-400 mt-1">Automatically join when a League game starts</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" checked={autoJoin} onChange={e => setAutoJoin(e.target.checked)} className="sr-only peer" />
									<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
								</label>
							</div>

							<div className="flex items-center justify-between">
								<div>
									<label className="text-sm font-medium text-neutral-300">Start on System Boot</label>
									<p className="text-xs text-neutral-400 mt-1">Launch HexCall when Windows starts</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" checked={startOnSystemStart} onChange={e => setStartOnSystemStart(e.target.checked)} className="sr-only peer" />
									<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
								</label>
							</div>

							<div className="flex items-center justify-between">
								<div>
									<label className="text-sm font-medium text-neutral-300">Minimize to Tray</label>
									<p className="text-xs text-neutral-400 mt-1">Hide to system tray instead of closing</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" checked={minimizeToTray} onChange={e => setMinimizeToTray(e.target.checked)} className="sr-only peer" />
									<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
								</label>
							</div>
						</div>
					</div>

					{/* Audio Processing */}
					<div className="glass rounded-2xl p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
								<FaVolumeHigh className="w-5 h-5 text-white" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-white">Audio Processing</h2>
								<p className="text-sm text-neutral-400">Enhance your audio quality</p>
							</div>
						</div>

						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-sm text-neutral-300">Echo Cancellation</span>
								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" checked={echoCancellation} onChange={e => setEchoCancellation(e.target.checked)} className="sr-only peer" />
									<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
								</label>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-sm text-neutral-300">Noise Suppression</span>
								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" checked={noiseSuppression} onChange={e => setNoiseSuppression(e.target.checked)} className="sr-only peer" />
									<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
								</label>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-sm text-neutral-300">Auto Gain Control</span>
								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" checked={autoGainControl} onChange={e => setAutoGainControl(e.target.checked)} className="sr-only peer" />
									<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
								</label>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between">
									<label className="text-sm text-neutral-300">Noise Gate</label>
									<span className="text-xs text-neutral-400 font-mono">{noiseGate.toFixed(3)}</span>
								</div>
								<input 
									type="range" 
									min={0} 
									max={0.2} 
									step={0.005} 
									value={noiseGate} 
									onChange={e => setNoiseGate(Number(e.target.value))} 
									className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
									style={{
										background: `linear-gradient(to right, rgb(34 197 94) 0%, rgb(34 197 94) ${(noiseGate / 0.2) * 100}%, rgb(64 64 64) ${(noiseGate / 0.2) * 100}%, rgb(64 64 64) 100%)`
									}}
								/>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between">
									<label className="text-sm text-neutral-300">Voice Detection Threshold</label>
									<span className="text-xs text-neutral-400 font-mono">{vadThreshold.toFixed(3)}</span>
								</div>
								<input 
									type="range" 
									min={0.001} 
									max={0.1} 
									step={0.001} 
									value={vadThreshold} 
									onChange={e => setVadThreshold(Number(e.target.value))} 
									className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
									style={{
										background: `linear-gradient(to right, rgb(34 197 94) 0%, rgb(34 197 94) ${(vadThreshold / 0.1) * 100}%, rgb(64 64 64) ${(vadThreshold / 0.1) * 100}%, rgb(64 64 64) 100%)`
									}}
								/>
								<p className="text-xs text-neutral-500">Lower = more sensitive, Higher = less sensitive</p>
						</div>

							<div className="flex gap-2 pt-2">
								<button onClick={() => join()} disabled={!canJoin} className="flex-1 btn-primary px-4 py-2 rounded-xl disabled:opacity-50 text-sm font-medium">
									{connected ? 'Connected' : (canJoin ? 'Test Room' : 'Waiting...')}
								</button>
								<button onClick={() => mute(true)} className="px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700/50 text-neutral-300 hover:text-white transition-colors text-sm">
									Mute
								</button>
								<button onClick={() => mute(false)} className="px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700/50 text-neutral-300 hover:text-white transition-colors text-sm">
									Unmute
								</button>
							</div>
						</div>
					</div>

					{/* Overlay Settings */}
					<div className="glass rounded-2xl p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
								<FaEye className="w-5 h-5 text-white" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-white">Overlay</h2>
								<p className="text-sm text-neutral-400">In-game overlay position and size</p>
							</div>
						</div>

						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<label className="text-sm font-medium text-neutral-300">Preview Overlay</label>
									<p className="text-xs text-neutral-400 mt-1">Show overlay preview with mock data</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" checked={showOverlayPreview} onChange={e => setShowOverlayPreview(e.target.checked)} className="sr-only peer" />
									<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
								</label>
					</div>

							<div className="flex items-center justify-between">
								<div>
									<label className="text-sm font-medium text-neutral-300">Lock Overlay</label>
									<p className="text-xs text-neutral-400 mt-1">Prevents dragging; clicks pass through</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" checked={overlayLocked} onChange={e => setOverlayLocked(e.target.checked)} className="sr-only peer" />
									<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
								</label>
							</div>

							<div className="flex items-center justify-between">
								<div>
									<label className="text-sm font-medium text-neutral-300">In-Game Notifications</label>
									<p className="text-xs text-neutral-400 mt-1">Show when players join/leave during game</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" checked={showInGameNotifications} onChange={e => setShowInGameNotifications(e.target.checked)} className="sr-only peer" />
									<div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
								</label>
							</div>

							<div>
								<label className="text-sm font-medium text-neutral-300 mb-2 block">Position</label>
								<select 
									className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors" 
									value={corner} 
									onChange={e => setCorner(e.target.value as Corner)}
								>
									<option value="top-right">Top Right</option>
									<option value="top-left">Top Left</option>
									<option value="bottom-right">Bottom Right</option>
									<option value="bottom-left">Bottom Left</option>
								</select>
							</div>

						<div className="space-y-2">
							<div className="flex justify-between">
								<label className="text-sm font-medium text-neutral-300">Scale</label>
								<span className="text-xs text-neutral-400 font-mono">{scale.toFixed(2)}x</span>
							</div>
							
							{/* Quick Size Presets */}
							<div className="flex gap-2 mb-3">
								<button
									onClick={() => setScale(0.75)}
									className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
										scale === 0.75
											? 'bg-yellow-500 text-black'
											: 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
									}`}
								>
									Small
								</button>
								<button
									onClick={() => setScale(1.0)}
									className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
										scale === 1.0
											? 'bg-yellow-500 text-black'
											: 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
									}`}
								>
									Medium
								</button>
								<button
									onClick={() => setScale(1.25)}
									className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
										scale === 1.25
											? 'bg-yellow-500 text-black'
											: 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
									}`}
								>
									Large
								</button>
								<button
									onClick={() => setScale(1.5)}
									className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
										scale === 1.5
											? 'bg-yellow-500 text-black'
											: 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
									}`}
								>
									XL
								</button>
							</div>
							
							<input
								type="range" 
								min={0.75} 
								max={1.5} 
								step={0.05} 
								value={scale} 
								onChange={e => setScale(Number(e.target.value))} 
								className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
								style={{
									background: `linear-gradient(to right, rgb(234 179 8) 0%, rgb(234 179 8) ${((scale - 0.75) / (1.5 - 0.75)) * 100}%, rgb(64 64 64) ${((scale - 0.75) / (1.5 - 0.75)) * 100}%, rgb(64 64 64) 100%)`
								}}
							/>
						</div>

						{/* Overlay Position Lock */}
						<div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
									<FaLock className="w-4 h-4 text-yellow-400" />
								</div>
								<div>
									<div className="text-sm font-medium text-neutral-200">Lock Overlay Position</div>
									<div className="text-xs text-neutral-400">Prevent accidental dragging during gameplay</div>
								</div>
							</div>
							<button
								onClick={() => setOverlayLocked(!overlayLocked)}
								className={`relative w-12 h-6 rounded-full transition-colors ${
									overlayLocked ? 'bg-green-500' : 'bg-neutral-600'
								}`}
							>
								<div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${
									overlayLocked ? 'right-0.5' : 'left-0.5'
								}`} />
							</button>
						</div>
					</div>
				</div>					{/* App Updates */}
					<div className="glass rounded-2xl p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
								<FaRocket className="w-5 h-5 text-white" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-white">App Updates</h2>
								<p className="text-sm text-neutral-400">Keep HexCall up to date</p>
						</div>
					</div>

						<div className="space-y-4">
							<div className="flex flex-wrap gap-3">
								<button
									onClick={checkForUpdates}
									disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
									className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-neutral-700/50 text-blue-400 disabled:text-neutral-400 px-4 py-2 rounded-xl transition-colors text-sm font-medium disabled:cursor-not-allowed border border-blue-500/30 disabled:border-neutral-600/30"
								>
									{updateStatus === 'checking' ? (
										<>
											<FaSpinner className="animate-spin w-4 h-4" />
											Checking...
										</>
									) : (
										<>
											<FaArrowsRotate className="w-4 h-4" />
											Check Updates
										</>
									)}
								</button>
								
								{updateStatus === 'available' && (
									<button
										onClick={downloadUpdate}
										className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-xl transition-colors text-sm font-medium border border-green-500/30"
									>
										<FaDownload className="w-4 h-4" />
										Download
									</button>
								)}
								
								{updateStatus === 'downloaded' && (
									<button
										onClick={installUpdate}
										className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-4 py-2 rounded-xl transition-colors text-sm font-medium border border-purple-500/30"
									>
										<FaCheck className="w-4 h-4" />
										Install & Restart
									</button>
								)}
								
								{updateStatus === 'installing' && (
									<button
										disabled
										className="flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-xl text-sm font-medium border border-purple-500/30 opacity-75 cursor-not-allowed"
									>
										<FaSpinner className="animate-spin w-4 h-4" />
										Installing...
									</button>
								)}
							</div>
							
							{updateStatus === 'downloading' && (
								<div className="space-y-2">
									<div className="flex justify-between text-xs text-neutral-400">
										<span>Downloading update...</span>
										<span className="font-mono">{downloadProgress}%</span>
									</div>
									<div className="w-full bg-neutral-800/50 rounded-full h-2 border border-neutral-700/50">
										<div 
											className="bg-blue-500 h-2 rounded-full transition-all duration-300"
											style={{ width: `${downloadProgress}%` }}
										></div>
									</div>
								</div>
							)}
							
							<div className="text-xs text-neutral-400 p-3 bg-neutral-800/30 rounded-xl border border-neutral-700/30">
								{updateStatus === 'none' && '✅ No updates available'}
								{updateStatus === 'available' && updateInfo && (
									<span>🚀 Update available: v{updateInfo.version}</span>
								)}
								{updateStatus === 'downloaded' && '⚡ Update ready to install'}
								{updateStatus === 'installing' && '🔄 Installing update and restarting app...'}
								{updateStatus === 'idle' && '🔍 Click "Check Updates" to see if a new version is available'}
							</div>
						</div>
					</div>

					{/* Settings Backup */}
					<div className="glass rounded-2xl p-6">
						<div className="flex items-center gap-3 mb-6">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
								<FaShield className="w-5 h-5 text-white" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-white">Settings Backup</h2>
								<p className="text-sm text-neutral-400">Export and import your settings</p>
							</div>
						</div>

						<div className="space-y-4">
							<div className="flex gap-3">
								<button
									onClick={exportSettings}
									className="flex-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 px-4 py-2 rounded-xl transition-colors text-sm font-medium border border-violet-500/30"
								>
									Export Settings
								</button>
								<label className="flex-1 bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-300 hover:text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium cursor-pointer text-center border border-neutral-700/50">
									Import Settings
									<input
										type="file"
										accept=".json"
										onChange={importSettings}
										className="hidden"
									/>
								</label>
							</div>
							<p className="text-xs text-neutral-400 p-3 bg-neutral-800/30 rounded-xl border border-neutral-700/30">
								💾 Export your settings to backup or share with other devices. Import to restore previous settings.
							</p>
						</div>
					</div>

					{/* Connection Stats - only show in debug mode */}
					{showDebug && (
						<div className="glass rounded-2xl p-6 col-span-1 lg:col-span-2 xl:col-span-3">
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
									<FaBug className="w-5 h-5 text-white" />
								</div>
								<div>
									<h2 className="text-lg font-semibold text-white">Debug Information</h2>
									<p className="text-sm text-neutral-400">Connection stats and technical details</p>
								</div>
							</div>
							<DetailedConnectionStats stats={connectionStats || null} />
						</div>
					)}
				</div>

				{/* Preview Overlay */}
				{showOverlayPreview && (
					<div className={`fixed z-50 pointer-events-none ${
						corner === 'top-right' ? 'top-4 right-4' :
						corner === 'top-left' ? 'top-4 left-4' :
						corner === 'bottom-right' ? 'bottom-4 right-4' :
						'bottom-4 left-4'
					}`} style={{ transform: `scale(${scale})` }}>
						<div className="bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/50 rounded-2xl p-4 min-w-[280px]">
							{/* Header */}
							<div className="flex items-center gap-2 mb-3">
								<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
								<span className="text-xs text-neutral-400 font-medium">Voice Chat Preview</span>
							</div>

							{/* Mock Participants */}
							<div className="space-y-2">
								{[
									{ name: 'You', speaking: true, muted: false },
									{ name: 'Teammate Alpha', speaking: false, muted: false },
									{ name: 'Teammate Beta', speaking: false, muted: true },
									{ name: 'Teammate Gamma', speaking: true, muted: false },
									{ name: 'Teammate Delta', speaking: false, muted: false }
								].map((participant, idx) => (
									<div key={idx} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
										participant.speaking ? 'bg-green-500/20 ring-1 ring-green-500/30' : 'bg-neutral-800/30'
									}`}>
										<div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
											participant.speaking ? 'bg-green-500 text-white' : 'bg-neutral-600 text-neutral-300'
										}`}>
											{participant.name.charAt(0)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-sm text-white truncate">{participant.name}</div>
											<div className="text-xs text-neutral-400">Connected: 2m 15s</div>
										</div>
										{participant.muted && (
											<div className="w-4 h-4 rounded bg-red-500/20 flex items-center justify-center">
												<div className="w-2 h-2 bg-red-400 rounded-full"></div>
											</div>
										)}
									</div>
								))}
							</div>

							{/* Footer */}
							<div className="mt-3 pt-2 border-t border-neutral-700/30">
								<div className="text-xs text-neutral-500 text-center">
									Preview Mode • 5 participants
						</div>
					</div>
				</div>
					</div>
				)}
			</div>
		</div>
	);
}


