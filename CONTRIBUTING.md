# Contributing

Thank you for your interest in contributing to VibeGram! This document provides guidelines for contributing to the project.

## Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/alfandi09/vibegram.git
cd vibegram
npm install
```

2. Make your changes in the `src/` directory
3. Ensure the build passes:

```bash
npm run build
npm run typecheck
npm run typecheck:test
npm run typecheck:examples
npm test
```

## Zero-Dependency Policy

VibeGram strictly maintains a **zero-bloat** architecture. We do not accept pull requests that add new npm dependencies unless:

- The functionality cannot be achieved with Node.js built-in modules
- The dependency has been discussed and approved via GitHub Issues first
- The package is extremely small and well-maintained

## Code Standards

- **Language**: All code comments, documentation, and error messages must be in **English**
- **Types**: Use proper TypeScript interfaces — avoid `any` wherever possible
- **Formatting**: Follow the existing code style (4-space indentation, single quotes)
- **Testing**: Include examples demonstrating new features in the `examples/` directory

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commit messages
3. Ensure `npm run build` passes with zero errors
4. Update documentation in `docs/` if adding new features
5. Submit a PR with a clear description of the changes

## Reporting Bugs

Please file bug reports via GitHub Issues. Include:

- Node.js version (`node -v`)
- TypeScript version (`tsc -v`)
- Minimal reproducible code snippet
- Expected vs. actual behavior

## Documentation

When contributing documentation:

- All headings must be in English
- Use professional, concise language
- Include code examples for every feature
- Follow the structure defined in `docs/.vitepress/config.js`
