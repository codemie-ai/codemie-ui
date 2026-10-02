# Technical Research — Upgrade Vite 5 → 8 and Vitest 1 → 5 (EPMCDME-15243)

> Written after the implementation, from the research notes kept while the work was done
> (proposal and PoC of 2026-09-23, baseline of 2026-09-24/25). The findings describe `main`
> before the upgrade: `b3986522a` for the baseline numbers, `dcbbea431` as the branch start.

## 1. Original Context

**Ticket:** [EPMCDME-15243](https://jiraeu.epam.com/browse/EPMCDME-15243), Story, Major.
Parent EPMCDME-217 — [Improv&Stab] Community features.

### Summary

Upgrade `codemie-ui` from Vite 5 to Vite 8 and from Vitest 1 to Vitest 5. This includes the
required build tooling, test configuration, mock and type fixes, CI/Docker validation, and
verification on a dedicated environment.

### Description

Vite 5 no longer receives security patches. A local proof of concept with Vite 8.3.0 and
Vitest 5.0.1 showed that the production build and the Keycloak theme build pass, and that all
6385 tests pass after changes in 8 files. The PoC ran on Node 26 on macOS without a backend, so
runtime behaviour behind login, the real Keycloak integration, module federation, CI runner
compatibility and Docker/runtime Node compatibility must be verified on a dedicated
environment.

### Preconditions

- DevOps provides a dedicated environment with a real backend, real Keycloak and Node 20.19+.
- DevOps/backend confirm whether any environment still uses applications of type `module`.
- The new dependency `vite-node` is reviewed before merging.

### Scenarios of Use

1. Module federation on the dedicated environment as the go/no-go step.
2. CI pipelines on GitLab runners with Node 20.19+.
3. Keycloak theme build, Docker image, login page, Entra sign-in and OTP pages.
4. Manual smoke test behind login: chat, editors, workflow graph, highlighting, toasts, SVG icons.
5. `npm run test-harness` sanity UI suite against the dedicated environment.

### Affected Areas

Frontend build and test tooling, CI/Docker validation, Keycloak theme, module federation,
authenticated UI smoke coverage.

### Acceptance Criteria

23 criteria; the full list, including the assignee's additions (browser list, ES2024, cleanup),
is in [spec.md](spec.md#acceptance-criteria).

### Out of Scope

Node 20 → 22/24, replacing `vite-plugin-prismjs`, React Compiler.

## Summary

The upgrade touches build and test tooling only: no application logic, API or data changes.
The build side is almost free — Vite 8 builds `main` with no config change (5.3 s vs 9.6 s) and
only warns about `rollupOptions`. The cost sits in three places:

1. **Tests.** Vitest 4/5 removed the workspace file, the old environment API and several
   defaults the suite silently relies on. Before migration 88 of 663 test files fail and `tsc`
   reports 4,344 errors.
2. **Post-processors of the bundle.** Vite 8 minifies with Oxc, which emits string literals as
   template literals. Any plugin that rewrites strings by matching `"`/`'` quotes breaks. This
   hits keycloakify 11.15.0 (theme asset URLs) and `@originjs/vite-plugin-federation` on the
   remote side.
3. **Dependency resolution.** `npm install` fails with ERESOLVE for two reasons unrelated to
   Vite itself, so the lockfile has to be updated package by package with two `overrides`.

## 2. Codebase Findings

### Build configuration — `vite.config.ts`

- Plugins: `@vitejs/plugin-react` 4.6.0, `vite-plugin-svgr` 4.3.0 (1,015 `?react` SVG imports),
  `vite-plugin-prismjs` 0.0.8 (`languages: 'all'`), `@originjs/vite-plugin-federation` 1.4.1
  (host only, no `shared`), `keycloakify` 11.15.0 (enabled when `VITE_ENTRY=keycloakify`).
- `build.rollupOptions.input` switches between `index.html` and `index-keycloak.html`.
  Vite 8 bundles with Rolldown and keeps `rollupOptions` only as a deprecated alias.
- `css.preprocessorOptions.scss.api: 'modern-compiler'`: Vite 8 has only the modern Sass API,
  and `tsconfig.node.json` no longer type-checks the option.
- `server.host: true`: the dev server listens on all interfaces, including in Docker, so Vite
  dev-server advisories apply to this setup.
- No `build.target`, no `browserslist`, no `@vitejs/plugin-legacy`. JS syntax follows the Vite
  default (Vite 5: Chrome 87 / Safari 14; Vite 8: Chrome 111 / Safari 16.4), CSS prefixes follow
  the browserslist `defaults`, and `tsconfig.json` `lib` is `ES2020`. The three disagree, and the
  code already calls ES2021/ES2023 APIs hidden behind `@ts-expect-error` (`findLast`,
  `toReversed` in `src/utils/helpers.ts`; `replaceAll` in `src/utils/api.ts` and
  `src/components/markdown/Markdown.utils.ts`).
- `package.json` has no `"type": "module"`; Vite warns that a future major will stop loading
  the config without it. `postcss.config.js` uses `module.exports`.

### Test configuration

- `vitest.workspace.ts` defines two projects: `unit` (`src/setupTests.tsx` +
  `src/setupTests.unit.ts`, which mocks valtio) and `integration` (custom environment
  `vitest-env-integration.ts` + `src/setupTests.integration.ts`). Vitest 4+ ignores workspace
  files, so without migration everything runs as one project without the valtio mock.
- `vitest-env-integration.ts` imports from `vitest/environments` and uses `transformMode`; both
  are gone in Vitest 5, and none of the 47 integration files start.
- `src/setupTests.tsx`: global `ResizeObserver` / `IntersectionObserver` mocks are
  `vi.fn(() => ({…}))`. Vitest 4+ requires a `class` or `function` for anything called with
  `new`; this one pattern accounts for 548 failures.
- The fetch mock resolves requests from a `mockAPI` registry that `afterEach` clears. With
  Vitest 5's default `sequence.hooks: 'stack'`, an in-flight request reaches the cleared
  registry and stores `null` (52 of 61 `NewAssistantPage` tests time out).
- `vi.useFakeTimers()` in Vitest 5 also fakes `requestAnimationFrame` and more.
- jest-dom types augment `Assertion<T>`; Vitest 5 declares `Assertion<R, T>`, which yields
  ~4,283 TS errors. Newer jest-dom releases do not fix it and need Node ≥ 22.
- jsdom CSS parse errors bypass the existing console filter under Vitest 5 (jsdom is created
  before the test console), producing hundreds of MB of log.
- Old generics `vi.fn<[args], ret>` / `MockInstance<[args], ret>` in 6 test files; one
  assignment to `import.meta.env` in `util.test.ts` that the Oxc parser rejects.
- Vitest 5 removed `coverage.all`: without `coverage.include` the report silently drops 75
  untested files and inflates line coverage.

### Scripts and tooling

- `a2ui:manifest` runs `vite-node scripts/generate-a2ui-manifest.ts`. `vite-node` came in
  through Vitest 1 and is not a dependency of Vitest 5, so it must be added explicitly (`tsx`
  would work too; Node's built-in type stripping is not an option on Node 20).
- `build:keycloak` runs `VITE_ENTRY=keycloakify npm run build:prod && npx keycloakify build`
  and produces `dist_keycloak/keycloak-theme-codemie.jar` (Maven, Java 17+).

### Keycloak theme

`src/authentication/keycloak-theme/login/` (`KcPage.tsx`, `i18n.ts`, `pages/Error.tsx`) imports
`keycloakify` at runtime, so it must stay in `dependencies` (`import/no-extraneous-dependencies`).
keycloakify post-processes the built bundle to point `/assets/…` URLs at the Keycloak resources
path; 11.15.0 only matches double-quoted strings, fixed in 11.15.2+.

### Module federation (host)

`src/pages/applications/ApplicationFederationPage.tsx` loads applications of type `module`
through `virtual:__federation__`: `setRemote(slug, {format: 'esm', url: entry})`,
`getRemote(slug, 'CodemieEntryComponent')`, then `.mount(shadowRoot #root, arguments)`. The list
comes from `GET /v1/applications` (backend `customer_config.py`, `resolve_components()` returns
only enabled components). On environments it is read from the ConfigMap
`codemie-customer-config`; applications cannot be overridden from the database.

### Dependencies

- Must update: `vite` 5.4.21 → 8.3.x, `vitest` and `@vitest/coverage-istanbul` 1.6.1 → 5.0.x,
  `@vitejs/plugin-react` 4.6.0 → 6.1.1 (4.x does not support Vite 8), `vite-plugin-svgr`
  4.3.0 → 5.2.0 (4.x calls `transformWithEsbuild`; Vite 8 no longer installs esbuild).
- ERESOLVE blockers: `@a2ui/react@0.10.2` depends on `@a2ui/markdown-it: *`, which now
  resolves to 0.1.2 peering `@a2ui/web_core ^0.11` (we pin 0.10.6); and npm follows the optional
  peer chain `@vitejs/plugin-react@6` → `@rolldown/plugin-babel` →
  `@babel/plugin-transform-runtime@8`, which needs Babel 8 while the project has Babel 7.
- Unused or misplaced: `express` (unused), `vite-svg-loader` (a Vue plugin, referenced only for
  types in `src/vite-env.d.ts`), build-only packages in `dependencies` (`@vitejs/plugin-react`,
  `vite-plugin-prismjs`, `@types/*`).

## 3. Documentation Findings

- `AGENTS.md`, `.ai-run/guides/architecture/architecture.md`,
  `.ai-run/guides/testing/qa-strategy.md` and `testing-patterns.md` name Vite 5, Vitest 1 and
  `vitest.workspace.ts`; they have to follow the upgrade.
- `.ai-run/guides/standards/git-workflow.md`: branch `EPMCDME-XXXX_short-description`, commit
  subject `EPMCDME-XXXX: …`.
- Vite supported-versions policy (vite.dev/releases, 2026-09): only 8.3 gets regular fixes;
  7.3/8.2 important and security fixes; 6.4/8.1 security only; Vite 5 nothing.
- The README states no supported browsers.

## 4. Testing Landscape

### Existing coverage

Baseline on `dcbbea431` (Vitest 1.6.1): **663 files, 6839 passed, 2 skipped**, 93 s. With
`--retry 0` 4 tests fail on `main`: 3 `SettingsForm.{autoFill,resourceReset,sharePointAuth}`
(the mocked `appInfoStore` has no `configs`, so the first test of each file fails and passes on
retry) and 1 flaky `DataSourceCreatePage` xWiki integration test (≈ 3 of 5 runs). Coverage:
1383 `src` files, lines 61.10 %, branches 53.47 %.

`test-harness` sanity-ui against a `vite preview` of `main`: 88 passed, 3 flaky reruns.

### Coverage gaps

- Nothing in the unit suite exercises the production bundle, the Keycloak theme output or the
  federation runtime. These need build-level checks: Keycloak screenshots against a baseline,
  a stub federation remote, smoke screenshots of the built app.
- Entra sign-in needs an Azure app registration and cannot be checked locally.

## 5. Configuration and Environment

- Node: CI (Tekton `BASE_IMAGE`), `Dockerfile.dev` and `Dockerfile.test` use 20.19.6; the
  multistage images build on `dhi.io/node:20-alpine3.23-dev` = 20.20.2. Vite 8 needs
  `^20.19 || >=22.12`, so the images qualify. Node 20 reached EOL on 2026-04-30 and is deprecated
  in the DHI catalog.
- Vitest 5 declares Node `^22.12`, and its Babel 8 (coverage) `^22.18`: on Node 20, `npm ci`
  warns `EBADENGINE` for 19 packages but everything runs.
- Builds run in the CI build job, `multistage.Dockerfile` (`build:prod`),
  `multistage.kc-theme.Dockerfile` (`build:keycloak`), `Dockerfile.test` and the
  `test-harness:*` scripts.
- No feature flags; runtime config is a separate `config.js` from the Helm ConfigMap and is not
  touched by the build.

## 6. Risk Indicators

| Risk | Level | Note |
|---|---|---|
| Federation host runtime inside a Rolldown bundle | medium | `@originjs` 1.4.1 is unmaintained; fallback `@module-federation/vite` or Vite 7 |
| Bundle post-processors and Oxc template literals | medium | keycloakify affected; check every consumer of the built bundle |
| Silent change of supported browsers | medium | Vite 8 raises its default target without any config change |
| Test semantics drift (hook order, fake timers, mock reset) | medium | failures may hide behind `retry: 1` |
| Coverage numbers changing without new tests | low | `coverage.all` removal |
| Lockfile drift | medium | full regeneration pulls unrelated `^` versions |
| Node 20 engines mismatch for Vitest 5 | low | works in practice, needs a follow-up Node ticket |

## 7. Summary for Complexity Assessment

- ~30 files across build config, test setup, ~15 test files, docs and the lockfile.
- One layer (tooling), but it is shared by every build and test in the repository, the Docker
  images and the Keycloak theme.
- Requirements are clear; the open questions were environmental (dedicated stand, `module`
  apps in production, Node version) rather than functional.
- Rollback is a plain revert: no data, API or runtime-config changes.
