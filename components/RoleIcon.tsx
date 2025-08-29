export function RoleIcon({ role }: { role?: string }) {
	const r = (role || '').toLowerCase();
	const map: Record<string, string> = {
		top: '🛡️',
		jungle: '🌿',
		mid: '🗡️',
		adc: '🏹',
		bottom: '🏹',
		support: '✨',
	};
	const glyph = map[r] || '🎧';
	return <span aria-label={r || 'unknown'} title={r || 'unknown'}>{glyph}</span>;
}
