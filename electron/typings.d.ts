export {};

declare global {
	interface Window {
		hexcall?: {
			setOverlayBounds: (bounds: { x: number; y: number; width: number; height: number }) => void;
			onLcuUpdate?: (cb: (payload: any) => void) => () => void;
			onHotkeyToggleMute?: (cb: () => void) => () => void;
			setOverlayScale?: (scale: number) => void;
			setOverlayCorner?: (corner: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => void;
			windowMinimize?: () => void;
			windowClose?: () => void;
			windowMaximizeToggle?: () => void;
			windowIsMaximized?: () => Promise<boolean>;
			updatesCheck?: () => void;
			updatesDownload?: () => void;
			updatesQuitAndInstall?: () => void;
			onUpdateAvailable?: (cb: (info: any) => void) => () => void;
			onUpdateNone?: (cb: (info: any) => void) => () => void;
			onUpdateProgress?: (cb: (p: any) => void) => () => void;
			onUpdateDownloaded?: (cb: (info: any) => void) => () => void;
		};
	}
}


