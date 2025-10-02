export {};

declare global {
	interface Window {
		hexcall?: {
			getProfile: () => Promise<string>;
			setOverlayBounds: (bounds: { x: number; y: number; width: number; height: number }) => void;
			onLcuUpdate?: (cb: (payload: any) => void) => () => void;
			onHotkeyToggleMute?: (cb: () => void) => () => void;
			onHotkeyPushToTalk?: (cb: (active: boolean) => void) => () => void;
			onHotkeyPushToMute?: (cb: (active: boolean) => void) => () => void;
			pushToTalkUpdateSettings?: (enabled: boolean, key: string) => Promise<{ success: boolean }>;
			pushToTalkGetSettings?: () => Promise<{ enabled: boolean; key: string }>;
			pushToTalkSimulateRelease?: () => void;
			pushToMuteUpdateSettings?: (enabled: boolean, key: string) => Promise<{ success: boolean }>;
			pushToMuteGetSettings?: () => Promise<{ enabled: boolean; key: string }>;
			pushToMuteSimulateRelease?: () => void;
			setOverlayScale?: (scale: number) => void;
			setOverlayCorner?: (corner: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => void;
			setOverlayInteractive?: (interactive: boolean) => void;
			setOverlayLocked?: (locked: boolean) => void;
			windowMinimize?: () => void;
			windowClose?: () => void;
			windowMaximizeToggle?: () => void;
			windowIsMaximized?: () => Promise<boolean>;
			updatesCheck?: () => void;
			updatesDownload?: () => Promise<{ success: boolean; error?: string }>;
			updatesQuitAndInstall?: () => Promise<{ success: boolean; error?: string }>;
			setAutoStart?: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
			setMinimizeToTray?: (enabled: boolean) => Promise<{ success: boolean }>;
			getMinimizeToTray?: () => Promise<boolean>;
			showOverlay?: () => Promise<{ success: boolean; error?: string }>;
			hideOverlay?: () => Promise<{ success: boolean; error?: string }>;
			onUpdateAvailable?: (cb: (info: any) => void) => () => void;
			onUpdateNone?: (cb: (info: any) => void) => () => void;
			onUpdateProgress?: (cb: (p: any) => void) => () => void;
			onUpdateDownloaded?: (cb: (info: any) => void) => () => void;
			onUpdateError?: (cb: (error: any) => void) => () => void;
		};
	}
}


