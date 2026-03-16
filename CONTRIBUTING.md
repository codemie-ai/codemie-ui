# Contributing to CodeMie UI

Thank you for your interest in contributing to CodeMie UI! We welcome contributions from the community.

## How to Contribute

1. Fork the repository
2. Clone your fork locally
3. Create a feature branch from `main`: `git checkout -b <TICKET-ID>_short-description`
4. Make your changes following the guidelines below
5. Commit your changes using [Conventional Commits](#commit-message-format)
6. Push to your fork
7. Open a pull request against `main`

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

**Scopes:** `components`, `pages`, `hooks`, `store`, `api`, `routing`, `styles`, `config`, `docs`

**Rules:**
- Use imperative mood (`add` not `added` or `adds`)
- Keep the first line under 72 characters
- Reference issues in the footer: `Closes #123`

**Examples:**
```
feat(components): add collapsible sidebar navigation
fix(store): resolve race condition in async state update
docs(readme): update environment configuration section
```

## Pull Request Requirements

- PR title must follow the Conventional Commits format
- At least 1 approval required
- CI pipeline must pass
- Describe what changed, why, and how it was tested
- Note any breaking changes clearly

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

# Run all checks (recommended before commit)
npm run lint && npm test
```

## Code Standards

- TypeScript with strict type annotations
- Tailwind CSS only — no custom CSS or inline styles
- Use the `cn()` utility for conditional class names
- Valtio for global state management
- React Hook Form + Yup for form validation
- Use the custom fetch wrapper — not Axios or raw `fetch`
- Use the `Popup` component for modals — never `Dialog` directly
- Keep components under 300 lines; extract hooks for logic

## Reporting Issues

Please use the [GitHub issue tracker](../../issues) to report bugs or request features. Include:
- A clear description of the issue or request
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Browser and Node.js version

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).
