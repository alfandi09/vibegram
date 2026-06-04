/**
 * vibegram/codex - Public API barrel export
 */

// Core plugin
export { codex } from './plugin';

// Types
export type {
    CodexProvider,
    CodexMessage,
    CodexAskInput,
    CodexAskResult,
    CodexStatusResult,
    CodexModelInfo,
    CodexContext,
    CodexMemoryStore,
    CodexSessionStore,
    CodexSession,
    CodexSessionState,
    CodexPluginOptions,
    CodexAuditEvent,
} from './types';

// Memory store
export { MemoryCodexStore } from './memory';

// Provider — Codex session token
export {
    codexProvider,
    codexProviderFromJson,
} from './providers/chatgpt-token';
export type {
    CodexProviderOptions,
    CodexAuthJson,
} from './providers/chatgpt-token';

// Auth — manual auth.json helpers
export {
    readCodexAuthSummary,
    saveCodexAuthJson,
    validateCodexAuthJson,
} from './auth/manual';
export type {
    CodexAuthSummary,
} from './auth/manual';
