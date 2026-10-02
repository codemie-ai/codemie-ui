# QA Report — EPMCDME-15243

**Branch**: `EPMCDME-15243_upgrade-vite-8`
**Merge base**: `1d9ebbae5` (`origin/main` on 2026-09-29, after the rebase; see [Rebase](#rebase-onto-1d9ebbae5))
**Gates run at**: `e0803a37d` (branch head, including the review fix-up) on 2026-09-29

## Gates

From [gate-run.json](gate-run.json) (`qa-gates-runner`, Node 26 on macOS).

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | pass (one non-blocking `eslint-plugin-react` "React version not specified" warning, pre-existing) |
| Type-check | `npm run typecheck` | pass |
| Type-check, config | `npx tsc -p tsconfig.node.json --noEmit` | pass |
| Licences | `npm run license-check` | pass |
| Licence headers | `npm run license-headers:check` | pass — 2213 files, 0 missing |
| Secrets | `npm run secrets:check` | pass — no leaks found |
| Unit tests | `npm run test:unit:slnt` | pass — **619 files, 6337 passed, 1 skipped** |
| Integration tests | `npm run test:integration:slnt` | pass — **48 files, 549 passed, 1 skipped** |
| Prettier (changed files) | `npx prettier --check …` | pass |
| Build | `npm run build` | pass (chunk-size and Tailwind `line-clamp` warnings, pre-existing) |
| Sonar, local | `npm run sonar-local` | skipped — `SONAR_TOKEN` not set |
| hadolint, Docker image build, Sonar | CI pipeline | not run locally — owed to the MR pipeline |

## Test counts (AC 7–8)

| Commit | Vitest | Test Files | Tests | `--retry 0` |
|---|---|---|---|---|
| `e421ad1d6` (`main`) | 1.6.1 | 665 | 6859 passed, 2 skipped | 4 fail (3 `SettingsForm`, 1 flaky xWiki) |
| `1c6361766` (branch before the last rebase) | 5.0.2 | **665** | **6859 passed, 2 skipped** | **0 fail** |
| `1d9ebbae5` (`main`) | 1.6.1 | 667 (619 unit + 48 integration) | — | — |
| `e0803a37d` (branch) | 5.0.2 | **667** | **6886 passed, 2 skipped** (+1 test from the CR-002 fix-up) | — |

The count moved with `main` during the work (661 on `b3986522a`, 663 on `dcbbea431`, 665 on
`e421ad1d6`, 667 on `1d9ebbae5`) and matched `main` at every rebase.

**Coverage.** Since EPMCDME-15347, `npm run test:coverage` collects coverage from the unit
project only, so the numbers are lower than the earlier all-project figures. Same script on both
sides, `src` files only:

| | `src` files | Lines | Branches |
|---|---|---|---|
| `main` `1d9ebbae5` (Vitest 1) | 1385 | 49.08 % | 42.67 % |
| branch `e0803a37d` (Vitest 5) | 1385 | 49.05 % | 42.36 % |

Before the rebase, all projects: lines 61.07 % vs 61.10 % on `main`, the same 1383 files.

## Lockfile (AC 6)

A script compared every entry of `package-lock.json` at the pre-rebase merge base `e421ad1d6`
and the branch head; `main` has changed no lockfile entry since. The full listing
(`evidence/lockfile-comparison.txt`) is ignored by `.gitignore` and kept with the task notes:

- **22 version changes.** Each one is either a package this ticket targets (`vite`, `vitest`,
  `@vitest/coverage-istanbul`, `@vitejs/plugin-react`, `vite-plugin-svgr`, `vite-node`,
  `keycloakify`), or a transitive entry whose new range one of them declares. Examples:
  `picomatch ^4.0.7` (vite, vitest), `@jridgewell/sourcemap-codec ^1.6.0` (Vitest's
  `magic-string`), `nanoid ^3.3.18` (vite's `postcss`).
- **67 added entries:** rolldown, lightningcss and Oxc with their platform bindings, the Vitest 5
  tree, and `browserslist-to-esbuild`.
- **117 removed entries:** esbuild, rollup, the Vitest 1 tree, and `vite-svg-loader` with `svgo`.
- **No unrelated package moved.** The lockfile was not regenerated.

## Verification beyond the gates

These checks ran during the work, on the commits named. The scripts and full results are in the
assignee's task notes, outside the repository.

| Check | Result |
|---|---|
| `vite build`, 3 runs, vs `main` | 4.43–4.64 s vs 8.96–9.20 s (about −51 %) |
| Bundle vs `main` | JS −1.4 %, gzip −3.5 %, CSS −1.6 % |
| `build.target` from `browserslist` (AC 20, 23) | `chrome119, edge119, firefox128, ios17.4, safari17.4`; `autoprefixer` follows it (`-moz-` prefixes 27 → 12) |
| Keycloak theme (AC 10–11) | `build:keycloak` produces `dist_keycloak/keycloak-theme-codemie.jar` |
| Keycloak login and OTP pages (AC 13, 14 without Entra) | 12 screenshots against the `main` baseline on Keycloak 26.4.5: identical except the random TOTP key and the server-ordered app list. Before the keycloakify bump they differed by 11–14 % (gradient images 404) |
| Smoke behind login (AC 18, locally) | 15 pages against the same local data: 12 identical, 3 differ by ≤ 0.024 % (animated graph edges) |
| Module federation (AC 15, locally) | stub remote: loads and mounts like `main`, CSS moves into the shadow root. Real production `technology-copilot` remote: loads, mounts and redirects to EPAM SSO on both `main` and the branch |
| `test-harness` sanity-ui (AC 19, locally) | 88 passed on both `main` and the branch |
| Node (AC 9–10) | Node 20.19.6 (CI image, arm64 and amd64), 20.20.2 (`dhi.io` image), 24.21 and 26.10: `npm ci`, `build:prod` and tests pass. On Node 20, `npm ci` warns `EBADENGINE` for 19 coverage packages |

## Review fix-up

`e0803a37d` (`981725a00` before the rebase) adds a test for the build-time `VITE_ENV` fallback in `getMode()` (review finding
CR-002).

- `npx vitest run --project unit --retry 0 src/utils/__tests__/util.test.ts`: 9 passed.
- With the fallback removed from `src/utils/utils.ts`, the new test fails (checked, then reverted).
- The pre-commit hook passed: prettier, eslint, `tsc`, licence headers and gitleaks.

## Rebase onto `1d9ebbae5`

On 2026-09-29 the branch was rebased onto `main` `1d9ebbae5` (6 new commits). The pre-rebase head
is kept as `backup/EPMCDME-15243-pre-rebase-2026-09-29`. There were two conflicts:

- **`vitest.workspace.ts`.** EPMCDME-15347 changed it, and this branch deletes it. The change was
  ported into `test.projects` in `vite.config.ts`: `CI_COVERAGE_TEST_TIMEOUT_MS` (30 s) now applies to
  both projects, and `maxWorkers: 3` is kept. `minWorkers: 1` was dropped, because Vitest 5 has no
  such option (checked in the installed type definitions). The new `AGENTS.md` and `README.md` text
  now points at `vite.config.ts`.
- **`src/components/markdown/Markdown.utils.ts`.** EPMCDME-12708 replaced the `replaceAll` line
  whose `@ts-expect-error` this branch removed, so `main`'s version was taken. `main` added no new
  `@ts-expect-error`.

`main` changed no lockfile entries. `npm ci` was run and then all gates were re-run (above). Unit
tests now take about 161 s instead of 72 s, because of the `maxWorkers: 3` cap `main` introduced.
The code-review verdicts were made at `1c6361766` (final) and `981725a00` (check); the rebase
changes only the conflict resolutions above.

## Not verified yet

- The Docker images (AC 12), Entra sign-in (AC 14), and smoke and sanity-ui on the dedicated
  environment (AC 18–19), followed by QA.
- The Sonar and hadolint gates in the MR pipeline.
