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
    const [pushToTalkKey, setPushToTalkKey] = (0, react_1.useState)('LeftAlt');
    const [usePushToTalk, setUsePushToTalk] = (0, react_1.useState)(false);
    const [level, setLevel] = (0, react_1.useState)(0);
    const [corner, setCorner] = (0, react_1.useState)('top-right');
    const [scale, setScale] = (0, react_1.useState)(1);
    (0, react_1.useEffect)(() => {
        try {
            const savedMic = localStorage.getItem('hexcall-mic');
            if (savedMic)
                setSelectedMic(savedMic);
            const savedPtt = localStorage.getItem('hexcall-ptt-key');
            if (savedPtt)
                setPushToTalkKey(savedPtt);
            const savedUse = localStorage.getItem('hexcall-ptt-enabled');
            if (savedUse)
                setUsePushToTalk(savedUse === '1');
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
    (0, react_1.useEffect)(() => {
        try {
            localStorage.setItem('hexcall-mic', selectedMic || '');
        }
        catch { }
    }, [selectedMic]);
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
    const { connected, join, mute, canJoin } = (0, useVoiceRoom_1.useVoiceRoom)('test-room', userId, selectedMic);
    (0, react_1.useEffect)(() => {
        Promise.resolve().then(() => __importStar(require('../modules/webrtc/voiceClient'))).then(({ VoiceClient }) => {
            const anyWindow = window;
            const vc = anyWindow.__hexcall_vc;
            if (vc && typeof vc.onLevel === 'function') {
                vc.onLevel = (rms) => setLevel(rms);
            }
        });
    }, []);
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
						<div className="mt-4">
							<div className="h-2 bg-neutral-900 rounded overflow-hidden border border-neutral-800">
								<div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-[width] duration-100" style={{ width: `${Math.min(1, level * 3) * 100}%` }}/>
							</div>
							<p className="mt-1 text-xs text-neutral-400">Input level</p>
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
