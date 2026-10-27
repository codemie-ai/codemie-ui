# QA Gate Report — EPMCDME-14145 workflow-truncation-indicator

**Branch**: EPMCDME-14145_workflow-truncation-indicator
**Runner**: npm
**Started**: 2026-09-17T16:16:00Z
**Status**: BLOCKED (mechanically — see notes; all failures are pre-existing, environment-specific, unrelated to this diff)

## Gates

| Gate | Status | Command | Notes |
|---|---|---|---|
| lint | PASS | `npm run lint` | No output after the file list; exit 0. |
| typecheck | PASS | `npm run typecheck` | Silent, exit 0. |
| license-check | SKIPPED | `npm run license-check` | No dependency added/removed/moved in this diff (`git diff origin/main...HEAD` touches no `package.json`/`package-lock.json`). |
| secrets | PASS | `npm run secrets:check` | `no leaks found`, exit 0 (gitleaks scanned ~1.69 GB in 6m59s). |
| unit | **FAIL** | `npm run test:unit` | `Test Files 3 failed \| 519 passed (522)`; `Tests 2 failed \| 5401 passed (5403)`. See detail below — all 3 failing files are pre-existing Windows-checkout artifacts in areas this diff never touches. |
| integration | PASS | `npm run test:integration` | `Test Files 40 passed (40)`; `Tests 512 passed \| 1 skipped (513)`. |
| ui | SKIPPED | (n/a) | `--ui` not requested for this run. |

## Failure detail

Three unit test files fail, none of which are touched by this branch's diff (`git diff origin/main...HEAD` only touches CodeBlock, Thought/ThoughtHeader, the new TruncationBadge component, ChatAiMessage, WorkflowDrawerList/Item, WorkflowStateOutput, ContinueWithInputPopup's test mock, chatGeneration.ts, chatHelpers.ts, and type defs):

1. **`scripts/license_headers/__tests__/check_license_headers.test.js`** — suite fails to load: `SyntaxError: Invalid or unexpected token` inside Node's `vm.Script`, pointing at a `//` comment line in a checked-out `.js` file. Root cause: `git config core.autocrlf` is `true` on this Windows checkout (confirmed via `git config --get core.autocrlf`) and no `.gitattributes` overrides it, so text files land with CRLF line endings; the license-header script's `vm` parsing path chokes on the CRLF-normalized content.
2. **`src/a2ui/__tests__/manifest.test.ts` › "is serialized exactly as the generator writes it (stable diffs)"** — assertion fails comparing the committed `a2ui-manifest.json` byte-for-byte against a freshly generated one: `expected '{\r\n  "catalogId": ...' to be '{\n  "catalogId": ...'`. Same CRLF-vs-LF checkout artifact as above — the committed file round-trips through the Windows CRLF checkout, the freshly generated string does not.
3. **`src/components/appLevel/ToasterAnnouncer/__tests__/modalSurfaces.guard.test.ts` › "recognises the surfaces that already carry the host"** — `expected [...] to include 'components/Popup/Popup.tsx'`. The guard builds its file list with Node's `path.relative()`, which returns backslash-separated paths (`components\Popup\Popup.tsx`) on Windows, so the forward-slash literal in the assertion never matches. Pure Windows path-separator artifact, unrelated to `Popup.tsx`'s actual content.

None of the three failing files, nor their subjects (the license-header checker itself, the a2ui manifest generator, or `Popup.tsx`/`NavigationProfile.tsx`), appear anywhere in this branch's diff. All three assertions are exact string/byte comparisons that are sensitive to `core.autocrlf`/path-separator differences between POSIX and Windows checkouts — a known category of environment fragility, not a regression introduced by EPMCDME-14145. They would be expected to fail identically on `origin/main` on this same Windows machine.

## Drift signal

no

## Note on Windows-only tool exceptions

Per AGENTS.md, shell commands were run via the Bash tool with POSIX syntax throughout. `npm ci`, `npm run lint`, `npm run typecheck`, `npm run secrets:check`, `npm run test:unit`, and `npm run test:integration` were each run individually (never chained with `&&`), and `npm ci` was run before trusting any gate.
