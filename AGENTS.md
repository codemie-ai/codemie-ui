# AGENTS.md

Entry point for AI agents and automations working in this repository. This file routes; the guides
under `.ai-run/guides/` answer. Read the row that matches the task and follow that one link.

**CodeMie UI** — the React/TypeScript frontend for the CodeMie platform. Vite build, Tailwind,
Valtio stores, served by nginx from a prebuilt `dist/`. It also ships a Keycloak login theme built
from the same source tree.

<!-- ai-run-init:guide-imports start -->
## AI Development Guides

| Category | Guide Path | Purpose |
|---|---|---|
| Guide Index | `.ai-run/guides/README.md` | Which guide answers which question |
| Project | `.ai-run/guides/project.md` | Project identity, tracker, source control, adapters |
| Quality Gates | `.ai-run/guides/quality-gates.md` | Lint, type-check, licence, secrets, tests |
| Standards | `.ai-run/guides/standards/git-workflow.md` | Branch, commit, merge, MR checklist |
| Security | `.ai-run/guides/security/README.md` | Scanner and CVE remediation; routes onward |
| Secure Coding | `.ai-run/guides/development/security-patterns.md` | HTML sinks, redirects, cross-window messages, config, secrets |
| Architecture | `.ai-run/guides/architecture/architecture.md` | System design and where a change belongs |
| Routing | `.ai-run/guides/architecture/routing-patterns.md` | Route definition and navigation |
| Components | `.ai-run/guides/components/component-patterns.md` | Component construction and organization |
| Patterns | `.ai-run/guides/patterns/state-management.md` | Valtio stores, hooks, forms, modals, accessibility |
| Development | `.ai-run/guides/development/api-integration.md` | Backend calls, errors, constants, performance |
| Styling | `.ai-run/guides/styling/styling-guide.md` | Tailwind conventions and theming |
| Testing | `.ai-run/guides/testing/testing-patterns.md` | Unit and integration test patterns |
| Integration | `.ai-run/guides/integration/ticket-flow.md` | Ticket state sync driven by pipeline events |
| Onboarding | `.ai-run/guides/onboarding/flow-creation-guide.md` | Authoring in-product onboarding flows |
<!-- ai-run-init:guide-imports end -->

<!-- ai-run-init:task-classifier start -->
## Task Routing

| Category | User Intent | Example Requests | P0 Guide | P1 Guide |
|---|---|---|---|---|
| Vulnerability Remediation | a scanner or CVE ticket names this repo | fix this CVE; bump a vulnerable package; patch the base image | `.ai-run/guides/security/README.md` | `.ai-run/guides/quality-gates.md` |
| Secure Coding | rendering untrusted HTML, redirects, secrets, config | sanitize this markdown; open redirect; is this value secret | `.ai-run/guides/development/security-patterns.md` | `.ai-run/guides/security/README.md` |
| Architecture | where code belongs, boundaries | where should this go?; refactor this boundary | `.ai-run/guides/architecture/architecture.md` | `.ai-run/guides/development/code-organization.md` |
| Routing | routes and navigation | add a page; fix a redirect after login | `.ai-run/guides/architecture/routing-patterns.md` | `.ai-run/guides/development/security-patterns.md` |
| Components | building or placing UI components | new component; where does this component live | `.ai-run/guides/components/component-patterns.md` | `.ai-run/guides/components/component-organization.md` |
| State | shared state and data fetching | add a store; why is this not re-rendering | `.ai-run/guides/patterns/state-management.md` | `.ai-run/guides/development/api-integration.md` |
| Forms & Modals | forms, dialogs, popups | build this form; add a confirmation modal | `.ai-run/guides/patterns/form-patterns.md` | `.ai-run/guides/patterns/modal-patterns.md` |
| Styling | Tailwind, themes, appearance | style this panel; make it work in dark mode | `.ai-run/guides/styling/styling-guide.md` | `.ai-run/guides/styling/theme-management.md` |
| Accessibility | semantics, keyboard, labels | add an aria label; heading order | `.ai-run/guides/patterns/accessibility-patterns.md` | `.ai-run/guides/components/component-patterns.md` |
| Development | errors, constants, performance | handle this error; extract this constant; slow list | `.ai-run/guides/development/error-handling-patterns.md` | `.ai-run/guides/development/performance-patterns.md` |
| Testing | only when the user explicitly asks tests | write tests; fix this failing test | `.ai-run/guides/testing/testing-patterns.md` | `.ai-run/guides/testing/qa-strategy.md` |
| Git | only when the user explicitly asks git ops | commit; push; open an MR | `.ai-run/guides/standards/git-workflow.md` | `.ai-run/guides/project.md` |
<!-- ai-run-init:task-classifier end -->

<!-- ai-run-init:critical-rules start -->
## Critical Rules

| Rule | Trigger | Action |
|---|---|---|
| Check Guides First | ANY task | Match the request to a category, load that P0 guide before searching the codebase. |
| Testing | User asks to write, run, or fix tests | Only then work on tests; load `.ai-run/guides/testing/testing-patterns.md` first. |
| Git Operations | User asks to commit, push, or open an MR | Only then perform git side effects; load `.ai-run/guides/standards/git-workflow.md` first. |
| Shell | ANY shell command | Use bash/Linux syntax and report the commands actually run. |
| Reinstall Before Trusting A Gate | Before trusting any test or type-check result | Run `npm ci` first; see `.ai-run/guides/security/verification.md` § 1 — a stale install reports a green test count while suites never run. |
| Ticket Required | Any branch, commit, or MR | Values live in `.ai-run/guides/project.md` and `.ai-run/guides/standards/git-workflow.md`; do not infer them here. |
| Security Change | A scanner finding, a version pin, or an MR that carries one | Load `.ai-run/guides/security/README.md` before editing, and follow its MR handoff. |
| Gates Run Individually | Running more than one gate | Never chain them into one `&&` string — a chain reports only the first failure, and anything invoking commands directly cannot execute shell syntax. |
| Formatting Is Automatic | After editing a file under `src/` in Claude Code | A `PostToolUse` hook in `.claude/settings.json` runs prettier and eslint --fix. Do not re-run them. |
<!-- ai-run-init:critical-rules end -->

<!-- ai-run-init:commands start -->
## Commands Routing

| Need | Source Guide | Source Evidence | Notes |
|---|---|---|---|
| Install dependencies | `.ai-run/guides/quality-gates.md` | `package.json`, `package-lock.json` | Run before trusting any other gate. |
| Lint and format | `.ai-run/guides/quality-gates.md` | `package.json` scripts, `.eslintrc.cjs` | Load the guide for the exact command and skip policy. |
| Type-check | `.ai-run/guides/quality-gates.md` | `package.json` scripts, `tsconfig.json` | |
| Tests and coverage | `.ai-run/guides/testing/testing-patterns.md` | `package.json` scripts, `vitest.workspace.ts` | Only run or write tests when explicitly requested. |
| Licence and secret checks | `.ai-run/guides/quality-gates.md` | `package.json` scripts, `.gitleaks.toml` | Read the output, not the exit code. |
| Run the app, Docker, Keycloak theme | `README.md` | `package.json` scripts, Dockerfiles | Human-facing setup lives in the README. |
| Fixing a reported CVE or scanner finding | `.ai-run/guides/security/README.md` | `package.json`, Dockerfiles, git history | Covers dependency surfaces, image rebuild, verification, MR handoff. |
| Branch, commit, open an MR | `.ai-run/guides/standards/git-workflow.md` | `.husky/pre-commit`, CONTRIBUTING.md | |
<!-- ai-run-init:commands end -->

## Stack

React 18 · TypeScript 5 · Vite 5 · Tailwind 3 · Valtio (state) · react-router 7 ·
react-hook-form · PrimeReact · marked + DOMPurify (markdown) · Keycloakify (login theme).
Tests: Vitest with React Testing Library, two projects — `unit` and `integration`.

Exact versions live in `package.json`. Read them there rather than from a document.

## Architecture at a glance

Enough to decide where a change belongs; the full picture is in
[architecture.md](.ai-run/guides/architecture/architecture.md).

| Area | Holds |
|---|---|
| `src/pages/` | One directory per product area; the bulk of the codebase |
| `src/components/` | Shared presentational and form components |
| `src/store/` | Valtio stores — shared state and the methods that fetch it |
| `src/utils/` | `api.ts` (the single HTTP layer), storage, markdown, redirects |
| `src/hooks/` | Reusable behaviour, including the cross-window auth listener |
| `src/authentication/` | Sign-in flows and the Keycloak theme source |

**Configuration reaches the app twice and both layers are public.** Build-time
`import.meta.env.VITE_*` is baked into the bundle; run-time `window._env_` comes from `config.js`,
served from the image. Nothing secret belongs in either —
[security-patterns.md](.ai-run/guides/development/security-patterns.md).

**Four Dockerfiles exist and only the root one is the served app.** It runs no `npm` — it copies a
prebuilt `dist/`, so a rebuild needs `npm ci && npm run build:prod` first.
[security/images.md](.ai-run/guides/security/images.md).

## Orient

Structure is derived, not stored. Run the command that answers the question.

| Question | Command |
|---|---|
| What are the top-level areas | `git ls-files \| awk -F/ 'NF>1{print $1"/"}' \| sort -u` |
| What lives under `src/` | `git ls-files 'src/*' \| awk -F/ 'NF>2{print $2"/"}' \| sort -u` |
| Which product areas exist | `git ls-files 'src/pages/*' \| awk -F/ 'NF>2{print $3}' \| sort -u` |
| What routes are defined | `grep -n "path: '" src/router.tsx` |
| Which stores exist | `git ls-files 'src/store/*'` |
| What tests cover an area | `git ls-files 'src/**/__tests__/**' \| grep <area>` |
| What runtime config is read | `grep -rn 'import.meta.env\|window._env_' src --include='*.ts' --include='*.tsx'` |
| What scripts this repo declares | `node -e "console.log(Object.keys(require('./package.json').scripts).join('\n'))"` |
| Every image and its base | `grep -nE '^FROM' $(git ls-files '*Dockerfile*')` |
| Which pins are load-bearing security fixes | `grep -rn "Security (EPMCDME" $(git ls-files '*Dockerfile*') package.json` |
| Why a file looks the way it does | `git log --oneline -- <path>` |

## Reading gate output

Commands that look like gates and are not:
[security/README.md](.ai-run/guides/security/README.md) § Exit codes that mislead and
[security/verification.md](.ai-run/guides/security/verification.md).

A suite that fails to import adds nothing to the test counter, so a broken environment reports a
higher passing count than a healthy one. Quote the `Test Files` line. A gate that could not run is
unverified, not passed.

## Boundaries

**Always**

- Carry the ticket key on every branch and commit — format in
  [standards/git-workflow.md](.ai-run/guides/standards/git-workflow.md), values in
  [project.md](.ai-run/guides/project.md).
- Reinstall from the lock file before trusting any test or type-check result.
- Commit a manifest and its lock file together.
- Give a security pin a comment naming the ticket and the CVEs —
  [security/README.md](.ai-run/guides/security/README.md).
- Sanitize at the producer for anything rendered through `dangerouslySetInnerHTML` —
  [security-patterns.md](.ai-run/guides/development/security-patterns.md).

**Ask first**

- Bumping a base image tag in any `FROM` line — it changes the runtime for every consumer.
- Adding a brand-new dependency rather than moving an existing one. The licence allow list is
  binding, and a new package needs review on maintenance and footprint.
- Adding a `nosonar` marker or a Sonar ignore criterion.
- Changing `nginx.conf`. It ships inside the image and no gate in the working tree validates it.

**Never**

- **Regenerate or hand-edit the lock file.** Move the one package with the targeted command in
  [security/dependencies.md](.ai-run/guides/security/dependencies.md), so the security fix stays
  distinguishable from churn.
- **Run an audit auto-fix that re-resolves broadly.** It will downgrade or major-bump direct
  dependencies to satisfy an advisory.
- **Relax or delete a security pin as cleanup.** Remove it in its own commit when upstream or the
  base image ships the fix.
- **Fix an npm CVE with a Dockerfile override.** The override patches the image and leaves the
  lock file vulnerable for every other consumer.
- **Let an automated reviewer approve a security MR.** Its default mode pushes and approves,
  removing the human gate.
- **Put a real secret in a tracked env file** — [security-patterns.md](.ai-run/guides/development/security-patterns.md).
- **Skip the pre-commit hook**, or write a summary or validation-report document. Report in the
  response instead.

## Opening an MR

Two things must reach the description and neither happens by itself: a request for a reviewer to
post the regression command, and the harness log. Wording and the rest of the checklist:
[security/README.md](.ai-run/guides/security/README.md) § MR handoff and
[standards/git-workflow.md](.ai-run/guides/standards/git-workflow.md).

The compliance bot that checks for the log is suppressible with a label, so the log is the only
regression evidence that reliably reaches a reviewer.

## Skills

`.claude/skills/` holds repo-local skills. The shared ones live in the
`epm-cdme/codemie-public-skills` repository, on the same GitLab host that serves
this repo — resolve `<host>` with `git remote -v`.

```bash
codemie skills add <host>/epm-cdme/codemie-public-skills.git --skill code-reviewer
codemie skills add <host>/epm-cdme/codemie-public-skills.git --package sdlc-factory
```

`sdlc-factory` includes `refactor-cleaner`, `unit-tester`, and `integration-tester`. Where a skill
disagrees with `.ai-run/guides/`, follow the guides unless the user explicitly selected that skill.

## Conflict handling

| Conflict | Action |
|---|---|
| A guide disagrees with the source | Trust the source; correct the guide only if the task owns that change. |
| `README.md` disagrees with `package.json` | Prefer the script in `package.json` and say so in the response. |
| A ticket names a component this repo does not have | Confirm which image or package it means before editing — [security/images.md](.ai-run/guides/security/images.md). |
| Git work is requested without a ticket | Ask for the ticket before committing; the prefix is validated by CI. |

## Conventions this file follows

- Every command above was executed and its exit code observed.
- Structure is derived, never stored. Values that routine maintenance moves — versions, tags,
  counts — are published as the command that finds them.
- Anything `README.md`, `CONTRIBUTING.md`, or `package.json` already states correctly is linked,
  not copied.
- Security process policy — remediation flow, verify predicates, rotation and delivery rules — is
  owned by the `secops` bundle. These guides carry only repository-specific facts.
- `CLAUDE.md` is `@AGENTS.md` and holds no second copy; fix a stale fact here only.

---

Last reviewed: 2026-08-17 · Owner: AI/Run · Guides: `.ai-run/guides/`
