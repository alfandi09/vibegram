/**
 * In-memory CodexMemoryStore with sliding window.
 *
 * Keyed by conversationKey. Each key holds an array of CodexMessage.
 * When the array exceeds `maxHistory`, oldest messages are evicted (keeping
 * the system prompt at index 0 if present).
 */

import { CodexMemoryStore, CodexMessage } from './types.js';

export class MemoryCodexStore implements CodexMemoryStore {
    private store = new Map<string, CodexMessage[]>();
    private maxHistory: number;

    constructor(maxHistory = 20) {
        this.maxHistory = maxHistory;
    }

    async append(key: string, message: CodexMessage): Promise<void> {
        const history = this.store.get(key) ?? [];
        history.push(message);

        // Sliding window: keep first message (system prompt) + last (maxHistory - 1) turns
        if (history.length > this.maxHistory) {
            const system = history[0]?.role === 'system' ? [history[0]] : [];
            const tail = history.slice(-(this.maxHistory - system.length));
            this.store.set(key, [...system, ...tail]);
        } else {
            this.store.set(key, history);
        }
    }

    async list(key: string): Promise<CodexMessage[]> {
        return this.store.get(key) ?? [];
    }

    async clear(key: string): Promise<void> {
        this.store.delete(key);
    }
}
