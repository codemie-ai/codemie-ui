# Git Workflow — codemie-ui

## Branch Naming Convention

**Pattern**: `EPMCDME-XXXX_short-description`

| ✅ Valid | ❌ Invalid |
|---|---|
| `EPMCDME-12399_add-hint-text` | `feature/add-hint-text` (no ticket) |
| `EPMCDME-9000_fix-auth-redirect` | `EPMCDME-0_fix-auth` (zero ID rejected by CI) |
| `EPMCDME-11960_fix-budget-popup` | `epmcdme-1234_my-fix` (wrong case) |

Create from `main`:

```bash
git checkout main && git pull
git checkout -b EPMCDME-XXXX_short-description
```

---

## Commit Message Format

**Pattern**: `EPMCDME-XXXX: Capital sentence`

Enforced by Tekton CI — the pipeline blocks on violations. Full regex:

```
^((EPMCDME)-(?!0+)\d+:\s[A-Z][a-z]*.*|Generate release notes for version \d+\.\d+\.\d+|Revert "(EPMCDME)-(?!0+)\d+:\s[A-Z][a-z]*.*")$
```

| ✅ Valid | ❌ Invalid |
|---|---|
| `EPMCDME-123: Fix authentication bug` | `EPMCDME-123: fix bug` (lowercase first word) |
| `EPMCDME-9359: Fix DOM-Based XSS in filename handling` | `EPMCDME-0: Fix bug` (zero ID) |
| `EPMCDME-11910: Make WIQL Query attribute optional` | `feat: add feature` (wrong format) |
| `Generate release notes for version 2.28.0` | `EPMCDME-12399` (no colon + description) |

**Rules:**
- First word after colon must start with uppercase (`Fix`, `Add`, `Make`, `Update`, `Remove`, `Refactor`)
- No period at end
- Body is optional; separate from subject with a blank line

---

## Merge Strategy

**Squash merge** into `main`.

- Each feature branch becomes one commit on `main`
- The squash commit subject should follow the same `EPMCDME-XXXX: Capital sentence` format
- Delete the feature branch after merge

```bash
# After MR approved and squash-merged via GitLab UI / glab CLI:
git branch -d EPMCDME-XXXX_short-description
```

---

## Anti-Patterns

| ❌ Avoid | ✅ Do instead |
|---|---|
| `git commit -m "fix stuff"` | `git commit -m 'EPMCDME-123: Fix authentication redirect loop'` |
| Committing directly to `main` | Always branch from `main` with ticket prefix |
| `git push --force` on shared branches | Rebase locally, push normally |
| Mixing unrelated changes in one commit | One logical change per commit |
| `git commit --no-verify` | Fix the pre-commit hook issue instead |
| Using zero ID: `EPMCDME-0` | Use the real Jira ticket number |

---

## Pre-commit Hooks (Husky)

Runs automatically on every `git commit` — see `.husky/pre-commit`:

| Hook | Command | Blocks commit? |
|---|---|---|
| Staged file formatting | `npx lint-staged` | Yes |
| License headers | `npm run license-headers:check` | Yes |
| Secret detection | `npm run secrets:check` | Yes |
| Sonar local scan | `npm run sonar-local` | Yes |

Fix hook failures before re-committing. Never skip with `--no-verify`.

---

## Merge Request (MR) Workflow

1. Push branch: `git push -u origin EPMCDME-XXXX_short-description`
2. Run `npm run test-harness` locally and capture the full console output — the MR description **must** include this log (see "MR description" below). The gitbud compliance bot enforces it; the MR will not merge without the harness section.
3. Open MR against `main` via GitLab UI or `glab mr create`.
4. MR title format: `EPMCDME-XXXX: Capital sentence` (same as commit).
5. Wait for CI pipeline to pass (Tekton).
6. Resolve reviewer comments.
7. Squash and merge.

### MR description

Follow [.gitlab/merge_request_templates/Default.md](../../../.gitlab/merge_request_templates/Default.md) — it is the single source of truth and its comments carry the filling rules. Do not restate it here. With `glab`, pass the filled template via `--description`.

What the compliance bot and reviewers rely on:

- **`## Test harness`** — the heading and the fenced block with the pasted `npm run test-harness` summary are mandatory. Screenshots are not accepted there; unit tests do not substitute for the harness run.
- **`## Verified locally`** — a short list of the checked scenarios on top and, in a collapsed `<details>` block, one subsection per scenario with **mandatory** screenshots of every user-visible state; how to run and record it: [local-verification.md](../testing/local-verification.md). Mark `N/A` with a reason only when the diff cannot alter UI.
- **Ticket link** — `Closes EPMCDME-XXXX`.

If `npm run test-harness` cannot run locally (missing `~/.codemie/test-harness.json`, stack not up, `ENV=local` prerequisites missing), fix the setup rather than skipping — the compliance bot checks the harness log, and every change requires a fresh run regardless of scope.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| CI rejects commit message | Check format: `EPMCDME-XXXX: Capital sentence`. No zero ID, no lowercase first word. |
| Pre-commit hook fails on lint | Run `npm run lint:fix`, re-stage, re-commit |
| Pre-commit hook fails on license headers | Run `npm run license-headers:fix`, re-stage |
| Pre-commit hook fails on secrets | Remove the flagged secret, never commit credentials |
| Push rejected on `main` | Branch from `main`, do not commit directly to it |
| Merge conflict | `git fetch origin && git rebase origin/main` on feature branch |
