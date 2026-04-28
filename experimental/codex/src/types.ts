/**
 * @module @vibegram/codex - Codex ChatGPT Plugin Types
 *
 * Auth mode: ChatGPT session token → `accessToken` option (from Codex / auth JSON)
 */

// ---------------------------------------------------------------------------
// Message & conversation primitives
// ---------------------------------------------------------------------------

export type CodexRole = 'system' | 'user' | 'assistant';

export interface CodexMessage {
    role: CodexRole;
    content: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface CodexAskInput {
    /** Text from the Telegram user */
    text: string;
    /** Telegram user ID */
    userId: number;
    /** Telegram chat ID */
    chatId: number | string;
    /** Key used to look up conversation memory */
    conversationKey: string;
    /** Override model for this specific call */
    model?: string;
    /** System prompt override */
    systemPrompt?: string;
    /** Full conversation history (already fetched from memory) */
    messages: CodexMessage[];
    /** Arbitrary metadata forwarded to the provider */
    metadata?: Record<string, unknown>;
    /** Abort signal used by the plugin timeout guard. */
    signal?: AbortSignal;
}

export interface CodexAskResult {
    /** Plain text response from GPT */
    text: string;
    /** Model that generated the reply */
    model?: string;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
    };
    /** Raw provider response for advanced usage */
    raw?: unknown;
}

export interface CodexStatusResult {
    connected: boolean;
    provider: string;
    model?: string;
    extra?: Record<string, unknown>;
}

export interface CodexModelInfo {
    id: string;
    displayName?: string;
}

/**
 * Interface that every Codex provider must implement.
 */
export interface CodexProvider {
    /** Human-readable provider name (logged, never contains secrets) */
    readonly name: string;
    ask(input: CodexAskInput): Promise<CodexAskResult>;
    status?(input: { userId: number; chatId: number | string }): Promise<CodexStatusResult>;
    listModels?(): Promise<CodexModelInfo[]>;
    close?(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Memory store
// ---------------------------------------------------------------------------

export interface CodexMemoryStore {
    append(key: string, message: CodexMessage): Promise<void>;
    list(key: string): Promise<CodexMessage[]>;
    clear(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Session store (for per-user token mode)
// ---------------------------------------------------------------------------

export type CodexSessionState = 'connected' | 'expired' | 'error' | 'missing';

export interface CodexSession {
    state: CodexSessionState;
    /** Bearer access_token (from ChatGPT auth JSON) */
    accessToken?: string;
    /** refresh_token – stored but not used at runtime */
    refreshToken?: string;
    /** Expiry epoch (ms) parsed from the JWT exp claim */
    expiresAt?: number;
    /** Provider-specific metadata */
    meta?: Record<string, unknown>;
}

export interface CodexSessionStore {
    get(userId: number): Promise<CodexSession | null>;
    set(userId: number, session: CodexSession): Promise<void>;
    delete(userId: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// Plugin options
// ---------------------------------------------------------------------------

export interface CodexPluginOptions {
    /**
     * The Codex provider to use.
     * Use `codexProvider()`.
     */
    provider: CodexProvider;

    /**
     * System prompt injected before every conversation.
     * @default 'You are a helpful assistant.'
     */
    systemPrompt?: string;

    /**
     * Maximum characters in user prompt before rejection.
     * @default 4000
     */
    maxPromptLength?: number;

    /**
     * Maximum characters in GPT response before truncation warning.
     * @default 4096
     */
    maxResponseLength?: number;

    /**
     * Sliding window — keep the last N messages in memory.
     * @default 20
     */
    maxHistory?: number;

    /**
     * Request timeout in milliseconds.
     * @default 30000
     */
    timeoutMs?: number;

    /**
     * Allow only these Telegram user IDs. Empty = allow everyone.
     */
    allowedUserIds?: number[];

    /**
     * Allow only these Telegram chat IDs. Empty = allow all chats.
     */
    allowedChatIds?: (number | string)[];

    /**
     * Conversation memory adapter.
     * Defaults to in-memory store.
     */
    memoryStore?: CodexMemoryStore;

    /**
     * Command prefix for bot commands.
     * @default 'codex'
     */
    commandPrefix?: string;

    /**
     * If true, the bot replies to every text message (direct chats only by default).
     * If false, only explicit `/codex ask <text>` commands trigger GPT.
     * @default true
     */
    autoReply?: boolean;

    /**
     * In group chats, only reply when the bot is mentioned or /ask is used.
     * Set `botUsername` for precise mention detection.
     * @default true
     */
    groupMentionOnly?: boolean;

    /**
     * Bot username used for group mention detection, with or without leading @.
     * If omitted, group auto-reply is disabled when `groupMentionOnly` is true.
     */
    botUsername?: string;

    /**
     * Audit logger callback. Called after each request. Never includes prompt body.
     */
    onAudit?: (event: CodexAuditEvent) => void;
}

export interface CodexAuditEvent {
    timestamp: string;
    userId: number;
    chatId: number | string;
    provider: string;
    model?: string;
    success: boolean;
    durationMs: number;
    error?: string;
}

// ---------------------------------------------------------------------------
// Context augmentation — ctx.codex injected by the middleware
// ---------------------------------------------------------------------------

export interface CodexContext {
    /**
     * Ask GPT with automatic memory/history management.
     */
    ask(text: string, options?: Partial<Pick<CodexAskInput, 'model' | 'systemPrompt'>>): Promise<CodexAskResult>;
    /**
     * Get provider + session status.
     */
    status(): Promise<CodexStatusResult>;
    /**
     * Clear conversation history for the current chat/user.
     */
    reset(): Promise<void>;
    /**
     * List models available from the provider.
     */
    listModels(): Promise<CodexModelInfo[]>;
    /**
     * Set per-user custom instructions (personality).
     * These are prepended to the system prompt on every request.
     */
    setPersonality(text: string): Promise<void>;
    /**
     * Get current per-user personality/custom instructions.
     * Returns null if not set.
     */
    getPersonality(): Promise<string | null>;
    /**
     * Clear per-user personality, reverting to default system prompt.
     */
    clearPersonality(): Promise<void>;
    /** Current conversation key */
    conversationKey: string;
}
