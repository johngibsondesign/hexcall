"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const head_1 = __importDefault(require("next/head"));
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const VoiceProvider_1 = require("../providers/VoiceProvider");
function Home() {
    const { joinedRoomId } = (0, VoiceProvider_1.useVoice)();
    const [clientStatus, setClientStatus] = (0, react_1.useState)('Waiting…');
    const [callStatus, setCallStatus] = (0, react_1.useState)('Idle');
    (0, react_1.useEffect)(() => {
        const off = window.hexcall?.onLcuUpdate?.((payload) => {
            const phase = payload?.phase || 'Unknown';
            setClientStatus(String(phase));
        });
        return () => { off && off(); };
    }, []);
    (0, react_1.useEffect)(() => {
        setCallStatus(joinedRoomId ? 'Connected' : 'Idle');
    }, [joinedRoomId]);
    return (<div className="min-h-screen bg-hextech">
			<head_1.default>
				<title>Hexcall</title>
			</head_1.default>
			<header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
				<h1 className="text-xl font-semibold text-gradient">Hexcall</h1>
				<nav className="text-sm text-neutral-300">
					<link_1.default href="/settings" className="hover:underline">Settings</link_1.default>
				</nav>
			</header>
			<main className="max-w-6xl mx-auto px-6 pb-16">
				<section className="mt-10 grid md:grid-cols-2 gap-8 items-center">
					<div>
						<h2 className="text-4xl md:text-5xl font-bold leading-tight">
							A sleek dark-mode voice for <span className="text-gradient">League</span>
						</h2>
						<p className="mt-4 text-neutral-300">
							Auto-join with lobby, in-game overlay, push-to-talk, and crystal-clear audio
							with TURN.
						</p>
						<div className="mt-6 flex items-center gap-3">
							<link_1.default href="/settings" className="btn-primary px-4 py-2 rounded ring-hextech">Open Settings</link_1.default>
							<link_1.default href="/overlay" className="px-4 py-2 rounded chip hover:bg-white/10 border border-white/10">Preview Overlay</link_1.default>
						</div>
					</div>
					<div className="glass rounded-xl p-6 border border-white/10">
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div className="chip rounded-lg p-4">
								<span className="text-neutral-400">Client Status</span>
								<div className="mt-2 font-medium" id="client-status">{clientStatus}</div>
							</div>
							<div className="chip rounded-lg p-4">
								<span className="text-neutral-400">Call Status</span>
								<div className="mt-2 font-medium" id="call-status">{callStatus}</div>
							</div>
							<div className="chip rounded-lg p-4">
								<span className="text-neutral-400">Quick Mute</span>
								<div className="mt-2 font-medium">Ctrl+Shift+M</div>
							</div>
							<div className="chip rounded-lg p-4">
								<span className="text-neutral-400">TURN</span>
								<div className="mt-2 font-medium">Metered configured</div>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>);
}
