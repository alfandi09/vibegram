# Internal Docs Components

These Vue components are registered globally in the VitePress theme and can be used directly from Markdown pages.

## Components

- `InstallTabs`: package manager tabs with copy support.
- `FeatureGrid` and `FeatureCard`: responsive feature sections.
- `ApiMethodCard`: API method summary card with endpoint, version, return type, and slots.
- `MethodSignature`: signature block plus optional parameter table.
- `CompatibilityTable`: static compatibility matrix with safe defaults.
- `SecurityNote`: accessible alert for info, tip, warning, and danger notes.
- `VersionBadge`: compact version/status badge.
- `CodePreview`: copyable code panel for examples.
- `DocsCard`: generic linked card for page lists.
- `PackageStats`: compact package/runtime stats.

## Usage Example

```md
<InstallTabs />

<SecurityNote title="Keep tokens private" variant="warning">
Never commit bot tokens or webhook secrets.
</SecurityNote>

<FeatureGrid title="Core surfaces" description="Use these cards to point readers into deeper docs.">
  <FeatureCard
    title="Webhook adapters"
    description="Express, Fastify, Hono, Koa, and native HTTP."
    href="/adapters/express"
  />
  <FeatureCard
    title="Conversations"
    description="Wait-state flows for natural bot dialogs."
    href="/state/conversations"
  />
</FeatureGrid>
```

## Rules

- Keep props serializable so Markdown usage stays simple.
- Prefer slots for rich content.
- Avoid direct browser APIs unless guarded for SSR.
- Keep EN and ID pages structurally aligned when components are introduced during content migration.
