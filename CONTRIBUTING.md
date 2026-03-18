# Contributing to CodeMie UI

Thank you for your interest in contributing to CodeMie UI! We welcome contributions from the community. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before you start.

## How to Contribute

1. Fork the repository
2. Clone your fork locally
3. Create a feature branch from `main`: `git checkout -b EPMCDME-XX-short-description` (e.g. `EPMCDME-123-add-dark-mode`), or `<type>/short-description` if no ticket is available (e.g. `fix/login-redirect`)
4. Make your changes following the guidelines below
5. Commit your changes using the [commit message format](#commit-message-format) below
6. Push to your fork
7. Open a pull request against `main`

## Commit Message Format

This project enforces a specific commit message format validated by CI. **PRs with non-conforming commits will fail the pipeline.**

### Format

```
EPMCDME-XX: Capital sentence describing the change
```

### Rules

- Must start with a Jira ticket ID: `EPMCDME-` followed by a non-zero number
- Followed by `: ` (colon and space)
- Description must start with a capital letter
- Use imperative mood (`Fix` not `Fixed` or `Fixes`)
- Keep the first line under 72 characters

### Examples

✅ **Valid:**
```
EPMCDME-123: Fix authentication redirect loop
EPMCDME-456: Add dark mode toggle to settings page
EPMCDME-789: Refactor workflow editor state management
```

❌ **Invalid:**
```
EPMCDME-123: fix authentication redirect    # lowercase first letter
EPMCDME-0: Fix bug                          # zero ticket ID
feat: add feature                           # wrong format entirely
Fix authentication redirect                 # missing ticket ID
```

### Special cases

The following formats are also accepted (for maintainer use only):
```
Generate release notes for version X.Y.Z
Revert "EPMCDME-XX: Original commit message"
```

## Pull Request Requirements

- PR title should follow the same format: `EPMCDME-XX: Capital sentence`
- At least 1 approval required
- CI pipeline must pass
- Describe what changed, why, and how it was tested
- Note any breaking changes

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Run tests
npm test

# Run all checks before committing
npm run lint && npm test
```

## Code Standards

- **TypeScript** with strict type annotations on all functions
- **Tailwind CSS only** — no custom CSS or inline styles; use `cn()` for conditional classes
- **Valtio** for global state management — never call APIs directly from components
- **React Hook Form + Yup** for all form validation
- **Custom fetch wrapper** — not Axios or raw `fetch` (see `src/utils/api.ts`)
- **`Popup` component** for modals — never use `Dialog` from PrimeReact directly
- **Components under 300 lines** — extract hooks or sub-components if approaching this limit
- **Single quotes** for strings (enforced by ESLint)
- **No magic strings or numbers** — extract to constants files

See [CLAUDE.md](./CLAUDE.md) for the comprehensive development guide.

## Reporting Issues

Please use the [issue tracker](../../issues) to report bugs or request features. Include:

- A clear description of the issue or request
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Browser and Node.js version
