# Code & Documentation Style Guide

VibeGram is an enterprise-grade framework. All code and documentation must adhere to professional standards.

## 1. Language

- **Code comments**: English only
- **Error messages**: English only
- **Documentation**: English only
- **Variable names**: Descriptive English identifiers

## 2. TypeScript

- Use strict mode (`"strict": true`)
- Prefer proper interfaces over `any`
- Use generic type parameters where appropriate (e.g., `session<T>()`)
- Export all public types from `src/index.ts`

```typescript
// ✅ Good
export interface SessionOptions<S = any> {
    initial?: () => S;
    store?: SessionStore;
}

// ❌ Bad
export interface SessionOptions {
    initial?: () => any;
    store?: any;
}
```

## 3. Code Comments

Keep comments concise and functional:

```typescript
// ✅ Good
// Validate webhook secret token before processing
if (secretToken && req.headers['x-telegram-bot-api-secret-token'] !== secretToken) {
    return res.status(403).end();
}

// ❌ Bad
// This magical incantation protects our sacred server from the dark forces
```

## 4. Documentation Pages

- All headings (`#`, `##`, `###`) must be in English
- Include code examples for every feature
- Use tables for API reference
- Use VitePress `:::` containers for tips, warnings, and info blocks

## 5. Error Messages

```typescript
// ✅ Good
throw new Error('Telegram Bot token is required');

// ❌ Bad
throw new Error('Token bot Telegram wajib diisi untuk mengaktifkan mesin');
```

## 6. File Structure

- Source code in `src/`
- Examples in `examples/`
- Documentation in `docs/`
- No test files in the root directory
