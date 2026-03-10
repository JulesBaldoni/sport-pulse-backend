# Contributing to SportPulse API

Thank you for your interest in contributing! This document explains the conventions and process to follow.

## Development setup

Follow the steps in the [README](./README.md#setup):

```bash
pnpm install
cp .env.example .env   # fill in your API keys
docker-compose up -d
pnpm db:generate && pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Branch naming convention

Always branch off `develop` (never commit directly to `main`):

| Prefix | Use case |
|---|---|
| `feat/short-description` | New features |
| `fix/short-description` | Bug fixes |
| `chore/short-description` | Maintenance, deps, tooling |
| `docs/short-description` | Documentation only |
| `refactor/short-description` | Code restructuring (no behaviour change) |
| `ci/short-description` | CI/CD pipeline changes |

## Commit convention

This project enforces **Conventional Commits** via commitlint.
Every commit message must follow the format:

```
type(scope): description
```

### Allowed types

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `chore` | Build process, deps, tooling (no prod code) |
| `docs` | Documentation changes only |
| `style` | Formatting, whitespace (no logic change) |
| `refactor` | Code restructuring without feature/fix |
| `perf` | Performance improvements |
| `test` | Adding or fixing tests |
| `ci` | CI/CD configuration changes |
| `build` | Build system changes |
| `revert` | Reverts a previous commit |

### Rules
- Scope is optional, must be lowercase
- Description must be lowercase, no period at the end, max 100 chars

### Valid examples
```
feat(articles): add full-text search endpoint
fix(worker): handle missing event gracefully
chore(deps): update mistral sdk to latest
ci: add integration test job
docs(readme): document pagination behaviour
test(events): add missing repository unit tests
```

### Invalid examples
```
Add new feature        ← missing type
feat: Add Search.      ← uppercase + period
WIP                    ← no type, no description
```

Commits that don't match the convention will be **blocked** by the `commit-msg` Husky hook.

## Pull request process

1. Branch off `develop` — never commit directly to `main`
2. Write or update tests for your changes (unit and/or integration)
3. Ensure the following pass locally before opening a PR:
   ```bash
   pnpm test:all       # unit + integration tests
   pnpm typecheck      # zero TypeScript errors
   pnpm lint           # zero ESLint violations
   pnpm format:check   # zero Prettier violations
   ```
4. Open a PR against `develop` — the PR template will be pre-filled
5. Request a review from at least one maintainer
6. PRs to `main` are only made via a release PR (managed by semantic-release)

## Code style

Code style is enforced automatically:

- **ESLint** — linting and TypeScript rules (no `any`, no floating promises, etc.)
- **Prettier** — formatting (single quotes, no semis, 100 char width)

Both run automatically on staged files via the `pre-commit` Husky hook.
You can also run them manually:

```bash
pnpm lint:fix     # auto-fix ESLint violations
pnpm format       # auto-format with Prettier
```

## Testing

| Command | Description |
|---|---|
| `pnpm test:unit` | Unit tests only (no DB/Redis needed) |
| `pnpm test:integration` | Integration tests (requires Docker services running) |
| `pnpm test:all` | Both unit + integration |
| `pnpm test:coverage` | Unit tests with V8 coverage report |

## Security

If you discover a security vulnerability, **do not open a public GitHub issue**.
See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.

