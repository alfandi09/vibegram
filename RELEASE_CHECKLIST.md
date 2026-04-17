# Release Checklist

Use this checklist before publishing a new prerelease or stable release.

## Versioning

1. Confirm the next version follows Semantic Versioning.
2. Update `package.json` and `package-lock.json`.
3. Update `CHANGELOG.md` with a dated release section.

## Validation

Run the full validation suite:

```bash
npm run typecheck
npm run typecheck:test
npm run typecheck:examples
npm test
npm run test:coverage
npm run build
npm run docs:build
npm run docs:api
npm audit --omit=dev --audit-level=high
npm run pack:dry
```

## Release Quality Checks

1. Confirm examples still pass smoke tests and typecheck.
2. Confirm `QUALITY_BASELINE.md` reflects the current metrics if they changed materially.
3. Confirm generated package contents include `dist/cjs`, `dist/esm`, and `dist/types`.
4. Confirm docs and README do not overclaim unsupported API coverage.

## Publish Steps

1. Commit release preparation changes.
2. Push to GitHub and confirm CI is green.
3. Create the release tag.
4. Publish to npm.
5. Create or update the GitHub Release notes.
