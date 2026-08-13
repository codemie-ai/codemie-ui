# AGENTS.md

**Purpose**: AI-optimized execution guide for agents working with the CodeMie frontend repository.

Detailed project guidance lives under `.ai-run/guides/`, which is the source of truth for AI-assisted development in this repo.

## Guide Imports

<!-- ai-run-init:guide-imports start -->
| Category | Guide Path | Purpose |
|---|---|---|
| Project | `.ai-run/guides/project.md` | Project identity, tracker, source control, MR adapter |
| Quality Gates | `.ai-run/guides/quality-gates.md` | npm lint/typecheck/test commands and gate policy |
| Architecture | `.ai-run/guides/architecture/architecture.md` | React SPA layers, Valtio, Tailwind, module federation |
| Routing | `.ai-run/guides/architecture/routing-patterns.md` | Hash-based routing patterns |
| Component Organization | `.ai-run/guides/components/component-organization.md` | Component directory structure |
| Component Patterns | `.ai-run/guides/components/component-patterns.md` | React component authoring patterns |
| Reusable Components | `.ai-run/guides/components/reusable-components.md` | Shared component conventions |
| API Integration | `.ai-run/guides/development/api-integration.md` | REST API client patterns |
| Code Organization | `.ai-run/guides/development/code-organization.md` | File and module organization |
| Constants Usage | `.ai-run/guides/development/constants-usage.md` | Constants and magic-value conventions |
| Error Handling | `.ai-run/guides/development/error-handling-patterns.md` | Error handling patterns |
| Performance | `.ai-run/guides/development/performance-patterns.md` | Performance optimization patterns |
| Refactoring | `.ai-run/guides/development/refactoring-patterns.md` | Safe refactoring conventions |
| Workflow Editor | `.ai-run/guides/development/workflow-editor-patterns.md` | Workflow editor-specific patterns |
| Onboarding Flows | `.ai-run/guides/onboarding/flow-creation-guide.md` | User onboarding flow authoring |
| Accessibility | `.ai-run/guides/patterns/accessibility-patterns.md` | WCAG and accessibility conventions |
| Custom Hooks | `.ai-run/guides/patterns/custom-hooks.md` | Custom React hook patterns |
| Form Patterns | `.ai-run/guides/patterns/form-patterns.md` | Form handling and validation |
| Modal Patterns | `.ai-run/guides/patterns/modal-patterns.md` | Modal and popup patterns |
| State Management | `.ai-run/guides/patterns/state-management.md` | Valtio proxy store patterns |
| Git Workflow | `.ai-run/guides/standards/git-workflow.md` | Branch, commit, and MR conventions |
| Styling Guide | `.ai-run/guides/styling/styling-guide.md` | Tailwind CSS and PrimeReact conventions |
| Theme Management | `.ai-run/guides/styling/theme-management.md` | Theme and dark/light mode management |
| QA Health | `.ai-run/guides/testing/qa-health.md` | QA health metrics |
| QA Strategy | `.ai-run/guides/testing/qa-strategy.md` | Overall QA strategy |
| Testing Patterns | `.ai-run/guides/testing/testing-patterns.md` | Vitest + RTL test patterns |
<!-- ai-run-init:guide-imports end -->

## Task Classifier

<!-- ai-run-init:task-classifier start -->
| Category | User Intent | Example Requests | P0 Guide | P1 Guide |
|---|---|---|---|---|
| Architecture | component placement, store vs component, where code belongs | where should this go?; refactor component; split page | `.ai-run/guides/architecture/architecture.md` | `.ai-run/guides/components/component-organization.md` |
| Components | React components, patterns, reusable UI | add component; refactor component; shared component | `.ai-run/guides/components/component-patterns.md` | `.ai-run/guides/components/reusable-components.md` |
| State | Valtio stores, state management, reactivity | add store; update state; store action | `.ai-run/guides/patterns/state-management.md` | `.ai-run/guides/architecture/architecture.md` |
| API | REST calls, fetch, error handling, API client | add API call; handle error; retry | `.ai-run/guides/development/api-integration.md` | `.ai-run/guides/development/error-handling-patterns.md` |
| Forms | form handling, validation, field patterns | add form; validate field; form submit | `.ai-run/guides/patterns/form-patterns.md` | `.ai-run/guides/patterns/custom-hooks.md` |
| Modals | popups, dialogs, overlays | add modal; close popup; modal flow | `.ai-run/guides/patterns/modal-patterns.md` | `.ai-run/guides/components/component-patterns.md` |
| Styling | Tailwind, PrimeReact, theme, dark mode | style component; add theme class; custom colour | `.ai-run/guides/styling/styling-guide.md` | `.ai-run/guides/styling/theme-management.md` |
| Routing | hash routing, navigation, route guards | add route; navigate; redirect | `.ai-run/guides/architecture/routing-patterns.md` | `.ai-run/guides/architecture/architecture.md` |
| Hooks | custom hooks, lifecycle, side effects | extract hook; useEffect pattern; reuse logic | `.ai-run/guides/patterns/custom-hooks.md` | `.ai-run/guides/development/code-organization.md` |
| Performance | rendering, memoisation, lazy loading | slow render; optimise list; reduce re-renders | `.ai-run/guides/development/performance-patterns.md` | `.ai-run/guides/patterns/state-management.md` |
| Accessibility | WCAG, aria, keyboard nav, focus | a11y fix; aria label; keyboard trap | `.ai-run/guides/patterns/accessibility-patterns.md` | `.ai-run/guides/components/component-patterns.md` |
| Testing | only when user explicitly asks tests | write tests; run tests; fix failing test | `.ai-run/guides/testing/testing-patterns.md` | `.ai-run/guides/testing/qa-strategy.md` |
| Git | only when user explicitly asks git ops | commit; push; create MR | `.ai-run/guides/standards/git-workflow.md` | `.ai-run/guides/quality-gates.md` |
<!-- ai-run-init:task-classifier end -->

## Critical Rules

<!-- ai-run-init:critical-rules start -->
| Rule | Trigger | Action |
|---|---|---|
| Check Guides First | ANY task | Match request to category, load the P0 `.ai-run/guides/` guide before broad code search. |
| Testing | User asks to write, run, or fix tests | Only then work on tests; load `.ai-run/guides/testing/testing-patterns.md` first. |
| Git Operations | User asks to commit, push, create MR, or similar | Only then perform git side effects; load `.ai-run/guides/standards/git-workflow.md` first. |
| npm / Node environment | Any npm, Node, or Vite command | Load `.ai-run/guides/quality-gates.md` before running commands. |
| Shell | ANY shell command | Use bash/zsh syntax and report commands actually run. |
| Project Conventions | Any project-specific convention | Load the relevant guide; do not infer exact values from this entrypoint. |
<!-- ai-run-init:critical-rules end -->

## Commands

<!-- ai-run-init:commands start -->
| Need | Source Guide | Source Evidence | Notes |
|---|---|---|---|
| Setup and local environment | `.ai-run/guides/quality-gates.md` | README, package.json | Run `npm install` then `cp .env .env.local`. |
| Run the application | `.ai-run/guides/architecture/architecture.md` | README | `npm run dev` — serves at http://localhost:5173. |
| Lint, format, build, and verification | `.ai-run/guides/quality-gates.md` | package.json, husky | Use the guide for exact commands and skip policy. |
| Tests and coverage | `.ai-run/guides/testing/testing-patterns.md` | vitest.workspace.ts | Only run or write tests when explicitly requested. |
<!-- ai-run-init:commands end -->

## Pre-Delivery Checklist

- Requirements handled and scoped to the user request.
- Relevant `.ai-run/guides/` P0 guide was checked first.
- Project-specific exact values came from a guide, not from this entrypoint.
- Validation commands actually run are reported exactly in the final response.
- Tests are only run or written when explicitly requested.
- Git operations are only performed when explicitly requested.

## Conflict Handling

| Conflict | Action |
|---|---|
| A guide conflicts with source code | Trust current source, then update guidance only if the task owns that documentation change. |
| README and Makefile disagree on a command | Prefer the Makefile target and note the README mismatch in the response. |
| User asks for tests but scope is unclear | Ask for the intended scope or run the narrowest relevant test. |
| User asks for git work without a required work item | Ask for the missing work item before committing. |
| Existing host-specific skills disagree with `.ai-run/guides/` | Follow `.ai-run/guides/` unless the user explicitly selects the host-specific workflow. |

## AI Skills

Local `.claude/skills/` and `.claude/agents/` have been migrated to [codemie-public-skills](https://gitbud.epam.com/epm-cdme/codemie-public-skills). Install with:

```bash
# Standalone code reviewer (self-review before submitting MR)
codemie skills add https://gitbud.epam.com/epm-cdme/codemie-public-skills.git \
  --skill code-reviewer

# Full SDLC factory (feature development, MR creation, QA — includes refactor-cleaner, unit-tester, integration-tester)
codemie skills add https://gitbud.epam.com/epm-cdme/codemie-public-skills.git \
  --package sdlc-factory
```

The `code-reviewer` skill reads `CLAUDE.md` and `.ai-run/guides/` to understand project-specific conventions automatically.
`refactor-cleaner`, `unit-tester`, and `integration-tester` are included in `sdlc-factory` — no separate install needed.

## Source Evidence Priority

| Evidence type | Priority |
|---|---|
| Current source files | Highest for implementation behavior. |
| `Makefile` and manifests | Highest for commands and dependencies. |
| README and contribution docs | Useful for workflow context. |
| `.ai-run/guides/` | Primary AI guidance source. |
| Host-specific skill files | Use only when that skill is explicitly invoked. |
