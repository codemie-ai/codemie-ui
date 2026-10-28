# QA Gate Report — EPMCDME-16322

Repo: `codemie-ui` · Branch: `EPMCDME-16322_tool-success-dash` · Merge base: `e1c2cbefc`
Gates per `.ai-run/guides/quality-gates.md`.

## Results

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | exit 0, no output |
| Type-check | `npm run typecheck` | exit 0, silent |
| Unit (affected files) | `npm run test:unit -- <3 files>` | 22/22 passed, exit 0 |
| Unit (full suite) | `npm run test:unit:slnt` | 752 files / 7656 passed, 1 pre-existing skip, exit 0 (run before the review fix-up) |
| Integration | `npm run test:integration:slnt` | 53 files / 593 passed, 1 pre-existing skip, exit 0 |
| Test harness | `npm run test-harness` | not run — needs the stack up and `~/.codemie/test-harness.json`. A gate that could not run is unverified, not passed. |
| License check | `npm run license-check` | not run — no dependency added, removed or moved |
| Secret detection | `npm run secrets:check` | exit 0 via the Husky pre-commit hook on all 4 commits (`no leaks found`) |
| License headers | `npm run license-headers:check` | exit 0 via pre-commit (2451 files, 0 missing) |
| Sonar local | `npm run sonar-local` | skipped by the script itself — `SONAR_TOKEN` not set |

## Unrelated flaky test observed

The full unit suite re-run after the review fix-up reported `752 files / 751 passed, 1 failed`:

```
src/pages/analytics/__tests__/AnalyticsPage.test.tsx
  > AnalyticsPage - CLI Analytics feature flag gate
  > does not redirect the built-in usageAttribution tab once dashboards have loaded
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
  1st call: [ { tab: "insights" }, { replace: true } ]   (AnalyticsPage.test.tsx:353)
```

This is order-dependent and pre-existing, not caused by this change. Evidence:

1. **Passes in isolation** — that file alone: 44/44 passed, exit 0.
2. **Passed in the earlier full run** on this same branch with a different shuffle seed (seed is randomized; the failing run used `1793053020246`).
3. **This change is unreachable from that test.** `AnalyticsPage.tsx` reaches any cli-analytics view only through `./components/AnalyticsDashboard` (import at `:36`, rendered at `:189`), and the test replaces that module with `vi.mock('../components/AnalyticsDashboard', …)`. `format.ts`, `UsersView.tsx` and `OverviewView.tsx` are never loaded by that test file.
4. **Root cause is in the repo's own test config.** `mockSetSearchParams` is a single `vi.hoisted(() => vi.fn())` shared by every test in the file (`:31`), and `vite.config.ts` sets no `clearMocks`/`restoreMocks` — each nested `describe` relies on its own `beforeEach(() => vi.clearAllMocks())`. `vite.config.ts:187` deliberately forces `sequence.hooks: 'parallel'` (overriding Vitest 5's `'stack'` default), so a nested `beforeEach` runs concurrently with its parent's rather than after it, and the clear can race the parent's render. The leaked value at `:353` is exactly the `{ tab: 'insights' }` call that the sibling assertion at `:329` expects.

No action taken — fixing that file's hook isolation is outside this ticket's scope. Worth a separate ticket.

## Feature verification

Skipped: this run was invoked without `--ui`, so `feature-verification` did not run. The change is
user-visible (three analytics surfaces), so a manual browser pass is still worthwhile before merge —
and note the API sends `Cache-Control: private, max-age=300` with an ETag on these endpoints, so a
verifier can see up to 5 minutes of stale `0%` after deploy.

## Manual verification notes

Beyond the automated gates, CR-003's new test was mutation-verified: replacing the Overview guard with
the naive `kpis.tool_call_success_rate ? …` truthiness check made exactly that test fail (1 failed,
15 passed) while the two pre-existing subtitle tests still passed. The mutation was reverted and
`OverviewView.tsx` confirmed byte-identical to its committed state.
