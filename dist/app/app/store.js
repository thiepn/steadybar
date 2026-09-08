import { all, initializeDatabase, put, readData, remove } from '../db/database.js';
import { nowISO } from '../domain/utils.js';
export class AppStore {
    data;
    listeners = new Set();
    channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('music-practice-os-data') : undefined;
    constructor() { if (this.channel)
        this.channel.onmessage = () => { void this.refresh().catch(() => { }); }; }
    async initialize() { await initializeDatabase(); await this.refresh(); }
    snapshot() { if (!this.data)
        throw new Error('The workspace is not ready yet.'); return this.data; }
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    async refresh(notify = true) { this.data = await readData(); if (notify)
        this.listeners.forEach(fn => fn()); }
    async save(name, value, notify = true) {
        const stamped = 'updatedAt' in value ? { ...value, updatedAt: nowISO() } : value;
        await put(name, stamped);
        await this.refresh(notify);
        this.channel?.postMessage('changed');
    }
    async delete(name, id) { await remove(name, id); await this.refresh(); this.channel?.postMessage('changed'); }
    async settings(change, notify = true) { await this.save('settings', { ...this.snapshot().settings, ...change }, notify); }
    async activeSession() { return (await all('sessions')).find(s => s.status === 'active'); }
    broadcast() { this.channel?.postMessage('changed'); }
}
export const store = new AppStore();
