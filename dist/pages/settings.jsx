"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Settings;
const react_1 = require("react");
const useVoiceRoom_1 = require("../hooks/useVoiceRoom");
const link_1 = __importDefault(require("next/link"));
function Settings() {
    const [mics, setMics] = (0, react_1.useState)([]);
    const [speakers, setSpeakers] = (0, react_1.useState)([]);
    const [selectedMic, setSelectedMic] = (0, react_1.useState)('');
    const [selectedSpeaker, setSelectedSpeaker] = (0, react_1.useState)('');
    const [pushToTalkKey, setPushToTalkKey] = (0, react_1.useState)('LeftAlt');
    const [usePushToTalk, setUsePushToTalk] = (0, react_1.useState)(false);
    const [level, setLevel] = (0, react_1.useState)(0);
    const [corner, setCorner] = (0, react_1.useState)('top-right');
    const [scale, setScale] = (0, react_1.useState)(1);
    const [echoCancellation, setEchoCancellation] = (0, react_1.useState)(true);
    const [noiseSuppression, setNoiseSuppression] = (0, react_1.useState)(true);
    const [autoGainControl, setAutoGainControl] = (0, react_1.useState)(true);
    const [noiseGate, setNoiseGate] = (0, react_1.useState)(0.03);
    const micCtxRef = (0, react_1.useRef)(null);
    const micAnalyserRef = (0, react_1.useRef)(null);
    const micRafRef = (0, react_1.useRef)(null);
    const micStreamRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        try {
            const savedMic = localStorage.getItem('hexcall-mic');
            if (savedMic)
                setSelectedMic(savedMic);
            const savedSpk = localStorage.getItem('hexcall-speaker');
            if (savedSpk)
                setSelectedSpeaker(savedSpk);
            const savedPtt = localStorage.getItem('hexcall-ptt-key');
            if (savedPtt)
                setPushToTalkKey(savedPtt);
            const savedUse = localStorage.getItem('hexcall-ptt-enabled');
            if (savedUse)
                setUsePushToTalk(savedUse === '1');
            const ec = localStorage.getItem('hexcall-audio-ec');
            const ns = localStorage.getItem('hexcall-audio-ns');
            const agc = localStorage.getItem('hexcall-audio-agc');
            const ng = localStorage.getItem('hexcall-audio-gate');
            if (ec !== null)
                setEchoCancellation(ec !== '0');
            if (ns !== null)
                setNoiseSuppression(ns !== '0');
            if (agc !== null)
                setAutoGainControl(agc !== '0');
            if (ng !== null)
                setNoiseGate(Number(ng));
        }
        catch { }
    }, []);
    (0, react_1.useEffect)(() => {
        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(t => t.stop());
            }
            catch { }
            const devices = await navigator.mediaDevices.enumerateDevices();
            setMics(devices.filter(d => d.kind === 'audioinput'));
            setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
        })();
    }, []);
    function stopMicMonitor() {
        if (micRafRef.current)
            cancelAnimationFrame(micRafRef.current);
        micRafRef.current = null;
        micAnalyserRef.current?.disconnect();
        micCtxRef.current?.close().catch(() => { });
        micAnalyserRef.current = null;
        micCtxRef.current = null;
        micStreamRef.current?.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
    }
    async function startMicMonitor() {
        stopMicMonitor();
        try {
            const constraints = selectedMic ? { deviceId: selectedMic } : {};
            constraints.echoCancellation = echoCancellation;
            constraints.noiseSuppression = noiseSuppression;
            constraints.autoGainControl = autoGainControl;
            micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: Object.keys(constraints).length ? constraints : true });
            micCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const src = micCtxRef.current.createMediaStreamSource(micStreamRef.current);
            const gateNode = micCtxRef.current.createScriptProcessor(256, 1, 1);
            gateNode.onaudioprocess = (ev) => {
                const input = ev.inputBuffer.getChannelData(0);
                const output = ev.outputBuffer.getChannelData(0);
                let power = 0;
                for (let i = 0; i < input.length; i++) {
                    const v = input[i];
                    power += v * v;
                }
                const rms = Math.sqrt(power / input.length);
                for (let i = 0; i < input.length; i++) {
                    output[i] = rms < noiseGate ? 0 : input[i];
                }
            };
            micAnalyserRef.current = micCtxRef.current.createAnalyser();
            micAnalyserRef.current.fftSize = 256;
            src.connect(gateNode).connect(micAnalyserRef.current);
            const data = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
            const tick = () => {
                if (!micAnalyserRef.current)
                    return;
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
        }
        catch {
            setLevel(0);
        }
    }
    (0, react_1.useEffect)(() => {
        startMicMonitor();
        return () => stopMicMonitor();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMic, echoCancellation, noiseSuppression, autoGainControl, noiseGate]);
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem('hexcall-mic', selectedMic || '');
        }
        catch { }
    }, [selectedMic]);
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem('hexcall-speaker', selectedSpeaker || '');
        }
        catch { }
        const audios = document.querySelectorAll('audio');
        // @ts-ignore
        audios.forEach((a) => a.setSinkId && selectedSpeaker && a.setSinkId(selectedSpeaker));
    }, [selectedSpeaker]);
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem('hexcall-ptt-key', pushToTalkKey || '');
        }
        catch { }
    }, [pushToTalkKey]);
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem('hexcall-ptt-enabled', usePushToTalk ? '1' : '0');
        }
        catch { }
    }, [usePushToTalk]);
    (0, react_1.useEffect)(() => { try {
        localStorage.setItem('hexcall-audio-ec', echoCancellation ? '1' : '0');
    }
    catch { } }, [echoCancellation]);
    (0, react_1.useEffect)(() => { try {
        localStorage.setItem('hexcall-audio-ns', noiseSuppression ? '1' : '0');
    }
    catch { } }, [noiseSuppression]);
    (0, react_1.useEffect)(() => { try {
        localStorage.setItem('hexcall-audio-agc', autoGainControl ? '1' : '0');
    }
    catch { } }, [autoGainControl]);
    (0, react_1.useEffect)(() => { try {
        localStorage.setItem('hexcall-audio-gate', String(noiseGate));
    }
    catch { } }, [noiseGate]);
    (0, react_1.useEffect)(() => {
        try {
            const c = localStorage.getItem('hexcall-overlay-corner');
            const s = Number(localStorage.getItem('hexcall-overlay-scale') || '1');
            if (c)
                setCorner(c);
            if (s)
                setScale(s);
            window.hexcall?.setOverlayCorner?.(c || 'top-right');
            window.hexcall?.setOverlayScale?.(s || 1);
        }
        catch { }
    }, []);
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem('hexcall-overlay-corner', corner);
        }
        catch { }
        window.hexcall?.setOverlayCorner?.(corner);
    }, [corner]);
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem('hexcall-overlay-scale', String(scale));
        }
        catch { }
        window.hexcall?.setOverlayScale?.(scale);
    }, [scale]);
    const userId = 'local-' + (typeof window !== 'undefined' ? (window.crypto?.randomUUID?.() || 'user') : 'user');
    const { connected, join, mute, canJoin, applyConstraints } = (0, useVoiceRoom_1.useVoiceRoom)('test-room', userId, selectedMic);
    (0, react_1.useEffect)(() => {
        applyConstraints?.({ echoCancellation, noiseSuppression, autoGainControl });
    }, [applyConstraints, echoCancellation, noiseSuppression, autoGainControl]);
    (0, react_1.useEffect)(() => {
        Promise.resolve().then(() => __importStar(require('../modules/webrtc/voiceClient'))).then(({ VoiceClient }) => {
            const anyWindow = window;
            const vc = anyWindow.__hexcall_vc;
            if (vc && typeof vc.onLevel === 'function') {
                vc.onLevel = (rms) => setLevel(rms);
            }
        });
    }, []);
    async function testOutputTone() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
            if (audio.setSinkId && selectedSpeaker)
                await audio.setSinkId(selectedSpeaker);
            audio.srcObject = dest.stream;
            audio.play();
            setTimeout(() => { osc.stop(); ctx.close(); }, 800);
        }
        catch { }
    }
    return (<div className="min-h-screen bg-hextech">
			<div className="max-w-5xl mx-auto px-6 py-8">
				<div className="flex items-center gap-3">
					<link_1.default href="/" className="chip rounded px-2 py-1">← Back</link_1.default>
					<h1 className="text-3xl font-bold text-gradient">Settings</h1>
				</div>
				<div className="mt-6 grid md:grid-cols-2 gap-6">
					<div className="glass rounded-xl p-5">
						<h2 className="text-sm text-neutral-300 mb-3">Audio Devices</h2>
						<label className="text-xs text-neutral-400">Microphone</label>
						<select className="mt-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 w-full" value={selectedMic} onChange={e => setSelectedMic(e.target.value)}>
							<option value="">System Default</option>
							{mics.map(d => (<option key={d.deviceId} value={d.deviceId}>{d.label || 'Mic'}</option>))}
						</select>

						<label className="mt-4 text-xs text-neutral-400">Output Device</label>
						<select className="mt-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 w-full" value={selectedSpeaker} onChange={e => setSelectedSpeaker(e.target.value)}>
							<option value="">System Default</option>
							{speakers.map(d => (<option key={d.deviceId} value={d.deviceId}>{d.label || 'Speakers'}</option>))}
						</select>

						<div className="mt-4">
							<div className="h-2 bg-neutral-900 rounded overflow-hidden border border-neutral-800">
								<div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-[width] duration-100" style={{ width: `${Math.min(1, level * 4) * 100}%` }}/>
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
								<input type="checkbox" checked={usePushToTalk} onChange={e => setUsePushToTalk(e.target.checked)}/>
								<input className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2" value={pushToTalkKey} onChange={e => setPushToTalkKey(e.target.value)}/>
							</div>
						</div>
						<div className="mt-5 grid gap-3">
							<h3 className="text-xs text-neutral-400">Audio Improvements</h3>
							<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={echoCancellation} onChange={e => setEchoCancellation(e.target.checked)}/> Echo Cancellation</label>
							<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={noiseSuppression} onChange={e => setNoiseSuppression(e.target.checked)}/> Noise Suppression</label>
							<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoGainControl} onChange={e => setAutoGainControl(e.target.checked)}/> Auto Gain Control</label>
							<label className="text-xs text-neutral-400">Noise gate (beta) {noiseGate.toFixed(2)}</label>
							<input type="range" min={0} max={0.2} step={0.005} value={noiseGate} onChange={e => setNoiseGate(Number(e.target.value))}/>
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
							<select className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 w-full" value={corner} onChange={e => setCorner(e.target.value)}>
								<option value="top-right">Top Right</option>
								<option value="top-left">Top Left</option>
								<option value="bottom-right">Bottom Right</option>
								<option value="bottom-left">Bottom Left</option>
							</select>
							<label className="text-xs text-neutral-400">Scale ({(scale).toFixed(2)}x)</label>
							<input type="range" min={0.75} max={1.5} step={0.05} value={scale} onChange={e => setScale(Number(e.target.value))}/>
						</div>
					</div>
				</div>
			</div>
		</div>);
}
