"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
require("../styles/globals.css");
const VoiceProvider_1 = require("../providers/VoiceProvider");
const drag = { WebkitAppRegion: 'drag' };
const noDrag = { WebkitAppRegion: 'no-drag' };
function App({ Component, pageProps, router }) {
    return (<VoiceProvider_1.VoiceProvider>
			<div className="min-h-screen">
				{/* Hide title bar on overlay route */}
				{router?.pathname !== '/overlay' && (<div className="h-8 flex items-center justify-between px-3 select-none bg-neutral-950/80 border-b border-white/10" style={drag}>
						<div className="text-xs text-neutral-400">Hexcall</div>
						<div className="flex gap-1.5" style={noDrag}>
							<button onClick={() => window.hexcall?.updatesCheck?.()} className="h-6 px-2 rounded chip hover:bg-white/10 text-xs">Check updates</button>
							<button onClick={() => window.hexcall?.windowMinimize?.()} className="w-8 h-6 rounded chip hover:bg-white/10" aria-label="Minimize">—</button>
							<button onClick={() => window.hexcall?.windowMaximizeToggle?.()} className="w-8 h-6 rounded chip hover:bg-white/10" aria-label="Maximize">▢</button>
							<button onClick={() => window.hexcall?.windowClose?.()} className="w-8 h-6 rounded chip hover:bg-red-500/20" aria-label="Close">✕</button>
						</div>
					</div>)}
				<Component {...pageProps}/>
			</div>
		</VoiceProvider_1.VoiceProvider>);
}
