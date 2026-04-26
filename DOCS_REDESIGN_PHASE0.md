# DOCS_REDESIGN_PHASE0.md - Audit and Accepted Concept

> Date: 2026-04-26
> Scope: Phase 0 for the total VibeGram docs UI/UX redesign.
> Status: completed, pending implementation in Phase 1.

---

## Summary

Phase 0 locks the redesign direction before changing runtime docs code. The current docs are structurally healthy, with EN and ID route parity, but the visual layer is still a thin VitePress default-theme extension.

The approved direction is **Calm Technical Console Docs**: a modern, minimal, docs-first interface with a polished technical SaaS feel, strong code surfaces, restrained cyan/indigo accents, clean navigation, and responsive mobile drawer behavior.

---

## Accepted Concept

- Concept role: accepted layout concept for implementation.
- Concept file: `C:\Users\Lenovo\.codex\generated_images\019dc041-c07a-7cf3-a607-8730fec8271b\ig_0ec07a912cdeedaf0169edafb2f9e88191be250d5918b2d94e.png`
- Native size: `1586x992`.
- Concept contents:
    - Homepage first viewport.
    - Docs article reading page.
    - Mobile navigation drawer preview.
- User approval: approved in chat before Phase 0 execution.

### Implementation Contract

The concept is the baseline visual spec for Phase 1 onward. Implementation should preserve:

- Sticky top navigation with VibeGram wordmark.
- Guide, API Reference, Changelog, GitHub, language, theme, and search controls.
- Homepage hero with `VibeGram` and `Telegram Bot Framework` as the first-viewport signal.
- Install command block as a primary visual object.
- Feature row for Middleware, Webhooks, Conversations, and TypeScript.
- Docs shell with grouped left sidebar, center article, and right outline.
- Code blocks with copy affordance.
- Callout/alert styling.
- Mobile drawer with search and grouped docs links.
- Quiet light theme with strong dark code surfaces and restrained cyan/indigo accent.

Intentional constraints:

- Do not turn the homepage into a heavy marketing page.
- Do not add decorative background blobs, bokeh, or gradient orbs.
- Do not remove docs-first navigation density.
- Do not reduce mobile navigation to an afterthought.

---

## Docs Structure Audit

### Source Counts

- EN markdown pages: `39`.
- ID markdown pages: `39`.
- Total source markdown pages: `78`.
- Theme files: `2`.
- Source image assets under `docs/`: `0`.

### Generated Output

Generated VitePress output exists locally and is ignored:

- `docs/.vitepress/cache/`
- `docs/.vitepress/dist/`

These directories must not be staged or committed.

### Route Parity

EN and ID markdown route structures are aligned. Each EN source page has a matching ID page under `docs/id/`.

Top-level groups:

- `adapters`
- `advanced`
- `api`
- `basics`
- `core`
- `security`
- `state`
- `ui`
- `index.md`

### Current Theme

Current files:

- `docs/.vitepress/theme/index.ts`
- `docs/.vitepress/theme/style.css`

Current behavior:

- `index.ts` only extends `vitepress/theme`.
- `style.css` only overrides VitePress brand colors and heading weight.
- No custom layout.
- No custom header.
- No custom sidebar.
- No custom mobile navigation.
- No reusable docs components.
- No source asset system for docs visuals.

Conclusion: a total redesign is feasible because the current theme surface is small. The safest rewrite path is to replace the theme layer while preserving VitePress routing, Markdown rendering, local search, and i18n config.

---

## Priority Page Audit

### Home

Files:

- `docs/index.md`
- `docs/id/index.md`

Current state:

- Uses VitePress `layout: home`.
- Relies on default hero/features rendering.
- References `/logo.png`, but no source image asset was found under `docs/`.
- Feature copy is useful and should be preserved or adapted into custom homepage components.

Redesign need:

- Replace default home rendering with a custom homepage.
- Preserve first-viewport brand clarity.
- Add install command tabs and product/docs CTAs.
- Keep EN/ID content parity.

### Quickstart

Files:

- `docs/basics/quickstart.md`
- `docs/id/basics/quickstart.md`

Current state:

- EN is concise with Install, Bot, Run, Checklist.
- ID is shorter and structured differently.

Redesign need:

- Convert into a guided start flow.
- Use code panels and checklist components.
- Keep EN/ID equivalent in structure.

### Installation

Files:

- `docs/basics/installation.md`
- `docs/id/basics/installation.md`

Current state:

- EN is concise.
- ID is more detailed with token and first bot sections.

Redesign need:

- Build a consistent install page template.
- Add package manager tabs.
- Normalize EN/ID structure during content migration.

### Bot Instance

Files:

- `docs/basics/instance.md`
- `docs/id/basics/instance.md`

Current state:

- Both cover launch, polling, webhook, and bot methods.
- ID has richer sections.

Redesign need:

- Present polling vs webhook as a clear comparison.
- Use method tables and callouts.
- Keep webhook launch mode visible.

### Webhook

Files:

- `docs/security/webhook.md`
- `docs/id/security/webhook.md`

Current state:

- Both now include native webhook launch and `healthPath`.
- ID has broader adapter examples.

Redesign need:

- Convert security guidance into strong callouts.
- Highlight `secretToken`, `healthPath`, and deployment checklist.
- Avoid duplicating adapter details too heavily across pages.

### API Context

Files:

- `docs/api/context.md`
- `docs/id/api/context.md`

Current state:

- EN uses compact sections.
- ID is more detailed and grouped by feature area.

Redesign need:

- Create reusable method/card/table components.
- Improve scanability for long API reference pages.
- Normalize high-level grouping during content migration.

### Bot Methods

Files:

- `docs/api/bot-methods.md`
- `docs/id/api/bot-methods.md`

Current state:

- Both include instance, routing, business, gifts/stories, direct API calls.
- ID includes launch options and plugin API sections.

Redesign need:

- Use API method cards or compact tables.
- Add badges for category/status where helpful.
- Keep claims tied to source code.

### Conversations

Files:

- `docs/state/conversations.md`
- `docs/id/state/conversations.md`

Current state:

- Both cover conversation flows.
- ID includes `waitForAny()` and richer wait method sections.

Redesign need:

- Make this a flagship state-management page.
- Use step-by-step examples and result callouts.
- Keep wait method API easy to scan.

### Adapters

Files:

- `docs/adapters/express.md`
- `docs/id/adapters/express.md`
- plus individual adapter pages.

Current state:

- Matrix content exists but is mostly markdown/code.
- `healthPath` is documented.

Redesign need:

- Use adapter cards and response-code table styling.
- Keep Express/Fastify/Hono/Koa/native paths easy to compare.

---

## Information Architecture Decision

Keep the existing IA groups for Phase 1:

1. Getting Started
2. Core Concepts
3. API Reference
4. State Management
5. UI and Interactions
6. Security and Utilities
7. Advanced Features
8. Framework Adapters

Reason:

- Current IA already matches the library shape.
- EN/ID route parity is stable.
- Redesign value should come from layout, navigation, reading experience, and reusable components first.

Potential later refinement:

- Add an API overview landing page.
- Add a production guide landing page.
- Add examples gallery if the repo later includes more examples.

---

## Design System Direction

### Layout

- Max content width tuned for reading, not full-width prose.
- Fixed/sticky desktop header.
- Scrollable grouped desktop sidebar.
- Right outline on article pages.
- Mobile sheet navigation.
- Homepage can use custom full-width bands, but article pages should stay quiet.

### Color

- Neutral light background.
- Strong dark code blocks.
- Cyan/indigo brand accent.
- Semantic tokens instead of raw repeated colors.
- Dark mode must be designed, not inverted.

### Typography

- Clean sans-serif for UI and prose.
- Mono font for commands, methods, and code.
- Avoid oversized headings inside compact docs panels.
- Keep line length controlled.

### Components

Initial components to implement after foundation:

- `AppHeader`
- `AppSidebar`
- `AppMobileNav`
- `AppToc`
- `AppFooter`
- `InstallTabs`
- `FeatureGrid`
- `DocsCard`
- `ApiMethodCard`
- `SecurityNote`
- `CodePreview`

### Motion

- Use CSS transitions first.
- Add `@vueuse/motion` only if the interaction needs it.
- Respect `prefers-reduced-motion`.
- No motion that shifts layout while reading.

---

## Phase 1 Readiness

Phase 1 can start with these assumptions:

- Use the accepted concept as the visual baseline.
- Preserve the existing sidebar data in `docs/.vitepress/config.js`.
- Start with a custom VitePress layout shell.
- Keep Markdown rendering working before adding shadcn-vue.
- Do not install dependencies until the foundation strategy is clear.
- Validate with `npm run docs:build` after every meaningful batch.

Recommended Phase 1 first steps:

1. Create `Layout.vue` that wraps VitePress content with the new shell.
2. Split theme CSS into base/tokens/docs files.
3. Build header/sidebar/mobile shell with plain Vue/CSS first.
4. Confirm EN/ID navigation and local search still work.
5. Only then proceed to Tailwind/shadcn-vue setup in Phase 2.
