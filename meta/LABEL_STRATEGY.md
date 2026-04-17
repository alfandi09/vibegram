# Label Strategy

This document defines a simple, maintainable label taxonomy for the VibeGram repository.

## Goals

1. Keep the label system small enough to stay usable.
2. Make triage fast for bugs, docs, API sync work, and release tasks.
3. Reserve a few labels for automation such as Dependabot and CI.

## Recommended Label Groups

Use prefixes so labels stay sorted and easy to scan.

### Type

Use these to describe the nature of the work.

| Label               | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| `type: bug`         | Broken behavior, regression, or production defect       |
| `type: enhancement` | Backward-compatible improvement                         |
| `type: feature`     | New capability or public API addition                   |
| `type: refactor`    | Internal restructuring without intended behavior change |
| `type: docs`        | Documentation-only change                               |
| `type: test`        | Test-only improvement                                   |
| `type: chore`       | Maintenance task, tooling, cleanup, metadata            |

### Area

Use these to show where the work lands.

| Label            | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| `area: core`     | Core middleware/runtime flow                           |
| `area: api`      | Telegram Bot API parity, types, or context helpers     |
| `area: adapters` | Express/Fastify/Hono/Koa/native webhook adapters       |
| `area: security` | Validation, token handling, logging, webhook hardening |
| `area: docs`     | Documentation site, API docs, examples in docs         |
| `area: examples` | Example bots and smoke-testable examples               |
| `area: ci`       | GitHub Actions, release checks, automation             |
| `area: dx`       | Developer experience, ergonomics, observability        |

### Priority

Use these only when triage value is real.

| Label          | Purpose                                     |
| -------------- | ------------------------------------------- |
| `priority: p0` | Release blocker / critical production issue |
| `priority: p1` | High-value issue for next release           |
| `priority: p2` | Normal planned work                         |
| `priority: p3` | Nice-to-have / backlog                      |

### Workflow / Status

Keep this group small to avoid churn.

| Label                     | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `status: needs-info`      | More detail required before work starts               |
| `status: blocked`         | Cannot proceed due to external dependency or decision |
| `status: ready`           | Ready for implementation                              |
| `status: breaking-change` | Requires migration note or release attention          |

### Automation

These labels are primarily for bots and maintenance flows.

| Label          | Purpose                                               |
| -------------- | ----------------------------------------------------- |
| `dependencies` | Dependency update PRs                                 |
| `security`     | Security fix or vulnerability-related work            |
| `ci`           | CI-only changes or automation updates                 |
| `release`      | Release preparation, versioning, changelog, packaging |

## Recommended Minimal Set

If you want the leanest setup possible, create only these first:

1. `type: bug`
2. `type: enhancement`
3. `type: docs`
4. `type: test`
5. `area: api`
6. `area: core`
7. `area: security`
8. `area: ci`
9. `dependencies`
10. `security`
11. `ci`
12. `release`

## Dependabot Policy

At the moment, `.github/dependabot.yml` does not assign labels automatically.

Reason:

1. Dependabot fails if configured labels do not exist in the repository.
2. Keeping the config label-free is the safest default until labels are created on GitHub.

Once the repository labels exist, you can safely re-enable:

```yml
labels:
    - dependencies
    - security
```

for npm updates, and:

```yml
labels:
    - dependencies
    - ci
```

for GitHub Actions updates.

## Suggested Colors

Suggested colors are optional, but help visual scanning.

| Label Group       | Suggested Color |
| ----------------- | --------------- |
| `type:*`          | `#0E8A16`       |
| `area:*`          | `#1D76DB`       |
| `priority:*`      | `#B60205`       |
| `status:*`        | `#5319E7`       |
| automation labels | `#6E7781`       |

## Operating Rules

1. Avoid creating near-duplicate labels.
2. Prefer one `type:*` and one `area:*` label per issue or PR.
3. Use `priority:*` only for actively triaged work.
4. Keep bot-facing labels stable once automation depends on them.
