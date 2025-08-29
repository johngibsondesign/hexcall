const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com/cdn';

export function ddragonProfileIconUrl(version: string, profileIconId: number | string) {
	return `${DDRAGON_BASE}/${version}/img/profileicon/${profileIconId}.png`;
}

export function roleToIcon(role?: string): string {
	const r = (role || '').toLowerCase();
	switch (r) {
		case 'top':
			return '🛡️';
		case 'jungle':
			return '🌿';
		case 'mid':
			return '🗡️';
		case 'adc':
		case 'bottom':
			return '🏹';
		case 'support':
			return '✨';
		default:
			return '🎧';
	}
}
