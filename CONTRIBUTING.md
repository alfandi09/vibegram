# Contributing

Thank you for your interest in contributing to VibeGram. This document explains the
baseline workflow expected for code, tests, documentation, and pull requests.

## Development Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/alfandi09/vibegram.git
cd vibegram
npm install
```

2. Make changes in the relevant source, test, example, or documentation files.
3. Add tests for new features and regression tests for bug fixes.
4. Run the full local validation suite:

```bash
npm run lint
npm run typecheck
npm run typecheck:test
npm run typecheck:examples
npm test
npm run build
```

The package builds CommonJS, ESM, and declaration outputs under `dist/`. Do not commit
`dist/`, `node_modules/`, or `.env` files.

## Zero-Dependency Policy

VibeGram keeps runtime dependencies intentionally small. Do not add npm dependencies
unless:

- The functionality cannot be achieved with Node.js built-in modules.
- The dependency has been discussed and approved via GitHub Issues first.
- The package is small, maintained, and worth the long-term maintenance cost.

## Code Standards

- **Language**: All code comments, documentation, and error messages must be in English.
- **Types**: Use proper TypeScript interfaces and avoid `any` where practical.
- **Formatting**: Follow the existing style: 4-space indentation and single quotes.
- **Testing**: Include tests for behavior changes and examples for public API additions.
- **Security**: Validate external input, keep secrets in environment variables, and avoid logging tokens.

## Pull Request Process

1. Create a feature branch from `main`.
2. Make focused commits with clear messages.
3. Ensure the full validation suite passes with zero errors.
4. Update documentation in `docs/` when adding or changing public features.
5. Submit a PR with a clear description, test evidence, and any migration notes.

## Reporting Bugs

Please file bug reports via GitHub Issues. Include:

- Node.js version (`node -v`).
- TypeScript version (`tsc -v`).
- Minimal reproducible code snippet.
- Expected vs. actual behavior.

## Security Reports

Do not open a public issue for vulnerabilities. Use the private reporting flow described
in `SECURITY.md`.

## Documentation

When contributing documentation:

- Use professional, concise language.
- Include code examples for public features.
- Keep English and Bahasa Indonesia docs aligned when possible.
- Follow the structure defined in `docs/.vitepress/config.js`.
