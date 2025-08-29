"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleIcon = RoleIcon;
function RoleIcon({ role }) {
    const r = (role || '').toLowerCase();
    const map = {
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
