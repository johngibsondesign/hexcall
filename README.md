## Hexcall (Electron + Next.js)

Dark-mode voice chat tool for League of Legends with overlay.

### Features

- Electron desktop app with Next.js UI and Tailwind CSS (dark mode)
- In-game overlay window (always-on-top), minimal teammate list, hover controls
- WebRTC audio with TURN support (Metered) and Supabase signaling
- LCU (League Client Update) polling for lobby/game state and auto-join
- Global hotkeys: toggle overlay and quick mute

### Dev

1) Create `.env.local` with the following:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
METERED_TURN_URL=turn:global.turn.metered.ca:80,turns:global.turn.metered.ca:443
METERED_TURN_USERNAME=your_metered_username
METERED_TURN_CREDENTIAL=your_metered_password
```

2) Run dev:

```
npm run dev
```

This starts Next (port 3000), TypeScript watch, and Electron.

### Hotkeys

- Ctrl+Shift+H: Toggle overlay visibility
- Ctrl+Shift+M: Quick mute toggle (push-to-talk style tap)

### Build

- `npm run build` (Next + TypeScript)
- `npm run build:electron` (package with electron-builder)


