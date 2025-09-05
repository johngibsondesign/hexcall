export function RoleIcon({ role, className }: { role?: string; className?: string }) {
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
	return <span className={className} aria-label={r || 'unknown'} title={r || 'unknown'}>{glyph}</span>;
}
