/**
 * @vibegram/codex — Public API barrel export
 */

// Core plugin
export { codex } from './plugin.js';

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
} from './types.js';

// Memory store
export { MemoryCodexStore } from './memory.js';

// Provider — Codex session token
export {
    codexProvider,
    codexProviderFromJson,
} from './providers/chatgpt-token.js';
export type {
    CodexProviderOptions,
    CodexAuthJson,
} from './providers/chatgpt-token.js';
