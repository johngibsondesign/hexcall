"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ddragonProfileIconUrl = ddragonProfileIconUrl;
exports.roleToIcon = roleToIcon;
const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com/cdn';
function ddragonProfileIconUrl(version, profileIconId) {
    return `${DDRAGON_BASE}/${version}/img/profileicon/${profileIconId}.png`;
}
function roleToIcon(role) {
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
