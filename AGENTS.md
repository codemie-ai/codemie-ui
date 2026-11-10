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
| Local Verification | `.ai-run/guides/testing/local-verification.md` | Harness run, browser scenarios and screenshots before an MR |
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
| Git | only when the user explicitly asks git ops | commit; push; open an MR | `.ai-run/guides/standards/git-workflow.md` | `.ai-run/guides/testing/local-verification.md` |
<!-- ai-run-init:task-classifier end -->

## Critical Rules

<!-- ai-run-init:critical-rules start -->
| Rule | Trigger | Action |
|---|---|---|
| Check Guides First | ANY task | Match request to category and load the P0 guide before searching broadly |
| Testing | "write tests" / "run tests" | ONLY then |
| Git Operations | "commit" / "push" / "PR" / "MR" | Only then; load `.ai-run/guides/standards/git-workflow.md` |
| Shell | ANY shell command | Use bash/Linux-compatible syntax |
| Carry the ticket key on every branch, commit and MR; ask for it when the request has none | Any branch, commit or MR | load `.ai-run/guides/standards/git-workflow.md` |
| Load the security guide before editing for a scanner finding, a CVE or a version pin, and follow its MR handoff | A scanner finding, CVE ticket or security pin | load `.ai-run/guides/security/README.md` |
| Reinstall dependencies from the lock file before trusting a test or type-check result | Before trusting any test or type-check result | load `.ai-run/guides/security/verification.md` |
| Commit a manifest and its lock file together | Changing `package.json` dependencies | load `.ai-run/guides/security/dependencies.md` |
| Run gates one at a time and report each result; never chain them | Running more than one gate | load `.ai-run/guides/quality-gates.md` |
| Sanitize at the producer anything rendered through dangerouslySetInnerHTML | Rendering HTML from markdown, an API or an agent | load `.ai-run/guides/development/security-patterns.md` |
<!-- ai-run-init:critical-rules end -->

<!-- ai-run-init:commands start -->
## Commands Routing

| Need | Source Guide | Source Evidence | Notes |
|---|---|---|---|
| Install dependencies | `.ai-run/guides/quality-gates.md` | `package.json`, `package-lock.json` | Run before trusting any other gate. |
| Lint and format | `.ai-run/guides/quality-gates.md` | `package.json` scripts, `.eslintrc.cjs` | Load the guide for the exact command and skip policy. |
| Type-check | `.ai-run/guides/quality-gates.md` | `package.json` scripts, `tsconfig.json` | |
| Tests and coverage | `.ai-run/guides/testing/testing-patterns.md` | `package.json` scripts, `vite.config.ts` (`test.projects`) | Only run or write tests when explicitly requested. |
| Licence and secret checks | `.ai-run/guides/quality-gates.md` | `package.json` scripts, `.gitleaks.toml` | Read the output, not the exit code. |
| Run the app, Docker, Keycloak theme | `README.md` | `package.json` scripts, Dockerfiles | Human-facing setup lives in the README. |
| Fixing a reported CVE or scanner finding | `.ai-run/guides/security/README.md` | `package.json`, Dockerfiles, git history | Covers dependency surfaces, image rebuild, verification, MR handoff. |
| Branch, commit, open an MR | `.ai-run/guides/standards/git-workflow.md` | `.husky/pre-commit`, CONTRIBUTING.md, `.gitlab/merge_request_templates/Default.md` | MR body follows the template. |
| Verify a change locally before an MR | `.ai-run/guides/testing/local-verification.md` | `package.json` (`test-harness`), `.gitlab/merge_request_templates/Default.md` | Browser scenarios and screenshots go to `## Verified locally`. |
<!-- ai-run-init:commands end -->

## Behavioral Defaults

<!-- ai-run-init:behavioral-defaults start -->
Behavioral guidelines to reduce common LLM coding mistakes. The Critical Rules above take precedence where they differ.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask; in an unattended run, record the assumption where the run records its decisions.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing before you go on.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals; write or run tests only as the Critical Rules allow:
- "Add validation" → "Name the invalid inputs it must reject and how each is checked"
- "Fix the bug" → "Reproduce it, then show it no longer happens"
- "Refactor X" → "Show the behavior is the same before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

Source: [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills).
<!-- ai-run-init:behavioral-defaults end -->

## Boundaries

Exact values and procedures live in the guide each line names.

**Ask first**

- Bumping a base image tag in any `FROM` line — [security/images.md](.ai-run/guides/security/images.md).
- Adding a brand-new dependency (the licence allow list is binding) — [quality-gates.md](.ai-run/guides/quality-gates.md).
- Adding a `nosonar` marker or a Sonar ignore criterion.
- Changing `nginx.conf`: it ships in the image and no gate validates it.

**Never**

- Regenerate or hand-edit the lock file, or run an audit auto-fix that re-resolves broadly — [security/dependencies.md](.ai-run/guides/security/dependencies.md).
- Relax or delete a security pin as cleanup, or fix an npm CVE with a Dockerfile override — [security/README.md](.ai-run/guides/security/README.md).
- Let an automated reviewer approve a security MR.
- Put a real secret in a tracked env file; `import.meta.env.VITE_*` and `window._env_` are both public — [security-patterns.md](.ai-run/guides/development/security-patterns.md).
- Skip the pre-commit hook, or write a summary or validation-report document; report in the response.

## Gate output

A suite that fails to import adds nothing to the test counter: quote the `Test Files` line, and a gate that could not run is unverified, not passed — [security/verification.md](.ai-run/guides/security/verification.md). Tests failing in CI but passing locally: [testing-patterns.md](.ai-run/guides/testing/testing-patterns.md) § Tests Failing in CI but Passing Locally.

## Conflict handling

| Conflict | Action |
|---|---|
| A guide disagrees with the source | Trust the source; correct the guide only if the task owns that change. |
| `README.md` disagrees with `package.json` | Prefer `package.json` and say so in the response. |
| A ticket names a component this repo does not have | Confirm which image or package it means — [security/images.md](.ai-run/guides/security/images.md). |
| Git work is requested without a ticket | Ask for the ticket before committing. |

Shared skills: `epm-cdme/codemie-public-skills` on the GitLab host in `git remote -v`. Where a skill disagrees with `.ai-run/guides/`, follow the guides unless the user selected that skill.

---

Last reviewed: 2026-11-10 · Owner: AI/Run · Guides: `.ai-run/guides/` · `CLAUDE.md` is `@AGENTS.md`; fix facts here only.
