# EPMCDME-15243: Vite 8 and Vitest 5 Upgrade Plan

> Recorded after the implementation: each task below is one commit on
> `EPMCDME-15243_upgrade-vite-8`, in order. Hashes are after the rebase onto `main` `1d9ebbae5`
> on 2026-09-29. The review fix-up `e0803a37d` (finding CR-002) follows Task 10.

**Goal:** Move `codemie-ui` to Vite 8 and Vitest 5 with the same test count, a clean `tsc` and
lint, an unchanged Keycloak theme and federation host, and an explicit browser list.

**Architecture:** Tooling only. Packages first (the suite is expected to break), then the test
migration, then the fixes that make the suite pass without retries, then the browser list and
the cleanup, then the regressions found by the build-level checks.

**Tech Stack:** Vite 8.3 (Rolldown, Oxc), Vitest 5.0, `@vitejs/plugin-react` 6, keycloakify 11,
`@originjs/vite-plugin-federation` 1.4.1, TypeScript 5.8, npm 11.

**Commit per task:** `EPMCDME-15243: <subject>`.

## Global Constraints

- Update the lockfile package by package; never regenerate it. Review every changed entry.
- Keep Node 20.19.6 in CI and Docker; no Node change in this ticket.
- Test fixes stay minimal. Any test improvement beyond the minimal fix is proposed to the
  assignee first and applied only after approval.
- All checks run in a separate worktree; the main `codemie-ui` working copy is not touched.
- The Test Files count must equal `main`'s at every rebase.

---

### Task 1: Bump Vite to 8 and Vitest to 5

**Files:** `package.json`, `package-lock.json`

**Test-first: no** — a dependency bump; the existing suite is the check, and it is expected to
fail until Task 2 (88 of 663 files).

- [x] Uninstall and reinstall `vite` 8.3.1, `@vitejs/plugin-react` 6.1.1, `vite-plugin-svgr`
      5.2.0, `vitest` and `@vitest/coverage-istanbul` 5.0.2 at exact versions (npm cannot
      upgrade the peer-coupled set over the existing lock).
- [x] Add `vite-node` 6.0.0 (dev) and check `npm run a2ui:manifest` output is identical.
- [x] Add `overrides` for `@a2ui/markdown-it` 0.1.1 and `@babel/plugin-transform-runtime`
      `^7.29.0`.
- [x] `npm ls` clean, `vite build` passes; only 18 existing lock entries change version.

Commit: `1f6187451`

### Task 2: Migrate tests to Vitest 5

**Files:** `vite.config.ts`, delete `vitest.workspace.ts`, `vitest-env-integration.ts`, `README.md`,
`src/setupTests.tsx`, create `src/types/jest-dom-vitest.d.ts`, 8 test files, `AGENTS.md`,
`.ai-run/guides/{architecture/architecture.md,testing/qa-strategy.md,testing/testing-patterns.md}`

**Test-first: yes** — the 88 failing test files and 4,344 `tsc` errors from Task 1 are the
failing tests; each fix is checked against them.

- [x] `test.projects` (`unit`, `integration`) in `vite.config.ts` instead of the workspace file.
- [x] Integration environment: `vitest/runtime`, `viteEnvironment`.
- [x] Pin `sequence.hooks: 'parallel'` and `fakeTimers.toFake` to the Vitest 1 set.
- [x] Constructor mocks as functions; jsdom errors through the test console.
- [x] jest-dom matchers through `Matchers`; Vitest 5 `Mock`/`vi.fn` generics; drop the
      `import.meta.env` assignment in `util.test.ts`.
- [x] Guides and `AGENTS.md` updated for Vite 8, Vitest 5 and `test.projects`.
- [x] Rebase onto `1d9ebbae5`: port EPMCDME-15347 from the deleted `vitest.workspace.ts` into
      `test.projects` (`CI_COVERAGE_TEST_TIMEOUT_MS` on both projects, `maxWorkers: 3`); drop its
      `minWorkers: 1`, which Vitest 5 no longer has; point `AGENTS.md` and `README.md` at
      `vite.config.ts`.

Commit: `8278c7290`

### Task 3: Keep untested files in the coverage report

**Files:** `vite.config.ts`

**Test-first: yes** — `vitest run --coverage` lists 75 fewer `src` files than `main`
(1308 vs 1383), and line coverage rises from 57.98 % to 60.63 % without new tests; after the
fix the file list matches `main` (lines 61.07 % vs 61.10 %).

- [x] `coverage.include: ['src/**/*.{ts,tsx}']`, exclude `*.d.ts`.

Commit: `c466bef23`

### Task 4: Harden test setup and document Vitest 5 pitfalls

**Files:** `src/setupTests.tsx`, `src/utils/__tests__/util.test.ts`,
`.ai-run/guides/testing/testing-patterns.md`

**Test-first: yes** — `NewAssistantPage` tests with `sequence.hooks: 'stack'` (52 of 61 time
out) and the `getMode()` test without `VITE_ENV`, which passed only because `.env` set it.

Approved by the assignee as an improvement beyond the minimal migration.

- [x] The fetch mock leaves a request that misses the cleared registry pending instead of
      answering `null`.
- [x] Observer mocks pass the implementation to `vi.fn()` so `mockReset()` keeps it.
- [x] `getMode()` checked through `vi.stubEnv`.
- [x] Vitest 5 pitfalls in `testing-patterns.md`.

Commit: `2824d8186`

### Task 5: Fix first-attempt SettingsForm failures and drop the ignored tsconfig key

**Files:** `SettingsForm.{autoFill,resourceReset,sharePointAuth}.test.tsx`, `tsconfig.json`

**Test-first: yes** — the first test of each `SettingsForm` file fails with `--retry 0`
because the mocked `appInfoStore` has no `configs` (also on `main`).

- [x] Add `configs: []` to the three mocks.
- [x] Remove the top-level `types` key that TypeScript never read.

Commit: `75d09deae`

### Task 6: Declare supported browsers and raise the ES level to ES2024

**Files:** `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`,
`src/utils/helpers.ts`, `src/utils/api.ts`, `src/components/markdown/Markdown.utils.ts`

**Test-first: yes** — `tsc` with `lib: ES2024` reports TS2578 on the four now-unused
`@ts-expect-error` directives; they are removed until `tsc` is clean.

- [x] `browserslist` in `package.json`; `browserslist-to-esbuild` 2.1.1 (dev) feeds
      `build.target` (`chrome119, edge119, firefox128, ios17.4, safari17.4`).
- [x] `tsconfig.json` `target`/`lib` → `ES2024`.
- [x] Check `autoprefixer` follows the list (`-moz-` prefixes 27 → 12) and the Keycloak `.jar`
      builds.

Commit: `167e34933`

### Task 7: Fix the flaky DataSourceCreatePage xWiki test

**Files:** `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

**Test-first: yes** — the xWiki create test fails in about 3 of 5 runs with `--retry 0` (on
`main` too): the Guided Tour popup takes focus while `user.type()` fills Name.

- [x] Pre-mark the page as visited, as `NewAssistantPage` does; 0 failures in 10 runs.

Commit: `9bbd148f4`

### Task 8: Clean up build config and dependencies

**Files:** `package.json`, `package-lock.json`, `postcss.config.js`, `src/vite-env.d.ts`,
`vite.config.ts`

**Test-first: no** — config cleanup with no behaviour change; checked by a byte-identical CSS
output, a clean `tsc -p tsconfig.node.json` and the absence of the config-loader warning.

- [x] `rollupOptions` → `rolldownOptions`.
- [x] `"type": "module"`, `postcss.config.js` → `export default`, `import.meta.dirname`.
- [x] Remove `scss.api`.
- [x] Move build-only packages to `devDependencies`; remove `express` and `vite-svg-loader`.

Commit: `e76f2345e`

### Task 9: Bump keycloakify to 11.15.14 to fix theme asset URLs

**Files:** `package.json`, `package-lock.json`

**Test-first: yes** — Keycloak login screenshots against the `main` baseline differ by
11–14 % and the gradient images return 404 from `/assets/`.

- [x] keycloakify 11.15.0 → 11.15.14 (handles `'` and `` ` `` quotes since 11.15.2).
- [x] Screenshots match the baseline except the random TOTP key and the server-ordered app list.

Commit: `1e2547db2`

### Task 10: Keep keycloakify in dependencies

**Files:** `package.json`, `package-lock.json`

**Test-first: yes** — `npm run lint` fails with 4 `import/no-extraneous-dependencies` errors
in the login theme after Task 8.

- [x] Move `keycloakify` back to `dependencies`; only the lockfile `dev` flags change.

Commit: `5bc4554f6`
