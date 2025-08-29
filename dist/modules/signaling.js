"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseSignaling = void 0;
const supabase_1 = require("../lib/supabase");
class SupabaseSignaling {
    constructor(roomId, userId) {
        this.userId = userId;
        this.channel = supabase_1.supabase.channel(`room:${roomId}`, {
            config: { broadcast: { self: false } },
        });
    }
    async subscribe(onMessage) {
        await this.channel.subscribe((status) => {
            return status === 'SUBSCRIBED';
        });
        this.channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
            if (!payload)
                return;
            onMessage(payload);
        });
    }
    async send(message) {
        await this.channel.send({ type: 'broadcast', event: 'signal', payload: message });
    }
    async presence(onSync, meta) {
        this.lastPresenceMeta = meta;
        this.channel.on('presence', { event: 'sync' }, () => {
            const state = this.channel.presenceState();
            const peers = Object.entries(state).map(([id, metas]) => ({ id, meta: metas?.[0] }));
            onSync?.(peers);
        });
        await this.channel.track({ id: this.userId, ts: Date.now(), ...(meta || {}) });
    }
    async updatePresence(meta) {
        this.lastPresenceMeta = { ...(this.lastPresenceMeta || {}), ...meta };
        await this.channel.track({ id: this.userId, ts: Date.now(), ...(this.lastPresenceMeta || {}) });
    }
    async close() {
        await this.channel.unsubscribe();
    }
}
exports.SupabaseSignaling = SupabaseSignaling;
