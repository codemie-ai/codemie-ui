# Spec — Upgrade Vite 5 → 8 and Vitest 1 → 5

**Ticket**: EPMCDME-15243
**Branch**: `EPMCDME-15243_upgrade-vite-8`
**Repository**: `codemie-ui`

## Problem

`codemie-ui` builds on Vite 5.4, which gets no fixes of any kind, including security fixes.
Its dev server listens on all interfaces (`server.host: true`), so dev-server advisories apply.
Vitest 1 and the Vite plugins are frozen with it: `@vitejs/plugin-react` 6 needs Vite 8, and
Vitest 5 needs Vite 6.4+. Each skipped major adds to the eventual jump.

Separately, the project does not state which browsers it supports. JS syntax, CSS prefixes and
the allowed JS APIs each follow a different default, and Vite 8 would change the JS one
silently.

## Solution

One MR moves straight to Vite 8 and Vitest 5; an intermediate stop at 6 or 7 would repeat the
test and lockfile work.

### Packages

- `vite` 8.3.1, `vitest` and `@vitest/coverage-istanbul` 5.0.2, `@vitejs/plugin-react` 6.1.1,
  `vite-plugin-svgr` 5.2.0 — exact versions.
- Add `vite-node` 6.0.0 (dev) for `a2ui:manifest`.
- `overrides`: `@a2ui/markdown-it` 0.1.1 and `@babel/plugin-transform-runtime` `^7.29.0`, the
  two ERESOLVE blockers.
- `keycloakify` 11.15.0 → 11.15.14: 11.15.0 does not rewrite asset URLs in template literals,
  which Vite 8's Oxc minifier emits, so the login theme loses its background images.
- The lockfile is updated package by package, never regenerated.

### Tests

- `vitest.workspace.ts` → `test.projects` in `vite.config.ts` (`unit`, `integration`).
- `vitest-env-integration.ts` → `vitest/runtime` and `viteEnvironment`.
- Keep the Vitest 1 behaviour the suite was written for: `sequence.hooks: 'parallel'` and
  `fakeTimers.toFake` limited to timers and `Date`.
- Constructor mocks become functions; `Mock`/`vi.fn` generics move to the Vitest 5 syntax;
  jest-dom matchers are added through Vitest's `Matchers` interface.
- `coverage.include: ['src/**/*.{ts,tsx}']` keeps untested files in the report.
- Fix the tests that only passed on retry (`SettingsForm` ×3, `DataSourceCreatePage` xWiki), so
  the suite passes with `--retry 0`.

### Browsers and ES level

- `package.json` `browserslist`: `chrome >= 119`, `edge >= 119`, `firefox >= 128`,
  `safari >= 17.4`, `ios_saf >= 17.4` (the ES2024 level; `ios_saf` only for iPad Safari).
- `build.target` derived from it through `browserslist-to-esbuild` (dev); the Keycloak theme
  build uses the same target; `autoprefixer` reads the list directly.
- `tsconfig.json` `target`/`lib` `ES2020` → `ES2024`; remove the four `@ts-expect-error`
  directives that become unused.

### Cleanup

`rollupOptions` → `rolldownOptions`; `"type": "module"` (with `postcss.config.js` on
`export default` and `import.meta.dirname` in `vite.config.ts`); drop the ignored
`scss.api` option and the ignored top-level `types` key in `tsconfig.json`; move
`@vitejs/plugin-react`, `vite-plugin-prismjs` and `@types/*` to `devDependencies`
(`keycloakify` stays: the login theme imports it); remove `express` and `vite-svg-loader`.

### What does not change

Application code apart from the four `@ts-expect-error` lines, the runtime config
(`config.js`), the federation plugin (`@originjs` 1.4.1), `vite-plugin-prismjs`, Node versions
in CI and Docker (20.19.6 / 20.20.2).

## Deviation from the ticket

- AC 20–22 (browser list, ES2024, cleanup) were added by the assignee; cleanup moved from Out of
  Scope into scope.
- The keycloakify bump and the flaky-test fixes are not in the ticket; both were needed to make
  the ticket's own checks (AC 7, 13) pass.
- Vitest 5 declares Node `^22.12`, but the ticket keeps Node 20. It runs on 20.19.6 with
  `EBADENGINE` warnings; the Node upgrade is a follow-up.

## Acceptance criteria

1. `vite` 8.x, `vitest` 5.x, `@vitest/coverage-istanbul` 5.x, `@vitejs/plugin-react` 6.x,
   `vite-plugin-svgr` 5.x.
2. `vite-node` is added for `a2ui:manifest`, subject to approval.
3. `vitest.workspace.ts` is replaced with `test.projects`.
4. `vitest-env-integration.ts` uses the new environment API.
5. Tests broken by the new mocking rules and stricter types are fixed; `tsc` is clean.
6. The lockfile is updated package by package.
7. All unit and integration tests pass.
8. The Test Files count is unchanged, and the MR quotes before/after.
9. The production build passes on Node 20.19+.
10. The Keycloak theme build passes on Node 20.19+.
11. `npm run build:keycloak` produces `dist_keycloak/keycloak-theme-codemie.jar`.
12. The `multistage.kc-theme.Dockerfile` image builds.
13. Keycloak shows the CodeMie login page.
14. Login works end to end, including Entra sign-in and OTP pages.
15. Module federation is verified: a `module` application opens via `/applications/<slug>` and
    the remote loads and works.
16. DevOps confirms whether any environment still uses `module` applications.
17. If federation does not work, stop and choose `@module-federation/vite` or Vite 7.
18. Manual smoke passes: chat, text editors (mentions, image paste), code/YAML editor, workflow
    graph, highlighting, toasts, SVG icons.
19. `npm run test-harness` passes against the dedicated environment.
20. Supported browsers are declared in `browserslist` and applied to `build.target`,
    `autoprefixer` and the Keycloak theme build.
21. `tsconfig.json` `target` and `lib` are `ES2024`; `tsc` passes with no new errors.
22. Cleanup: `rolldownOptions`, `"type": "module"`, build-only packages in `devDependencies`,
    `express` and `vite-svg-loader` removed, the two `overrides` in place.
23. The MR records the verification results, including the browser list and resulting
    `build.target`.

## Non-goals

- Node 20 → 22/24 (a follow-up; Node 24.11+ and 26 were checked and work unchanged).
- Replacing `vite-plugin-prismjs` (works on Vite 8; 22 % of build time, separate ticket).
- React Compiler (not tied to Vite; needs a Rules-of-React audit first).
- a2ui 0.11 (breaks our accessibility wrapper props; separate ticket).
- Code splitting of the single 7.5 MB chunk.
- `build.target` or `lib` above ES2024.
- Mobile layout: mobile browsers are not officially supported.
- The other findings of the dependency audit (unused packages, advisories, majors).

## Testing

- Full suite with `--retry 0` and coverage, compared with `main`.
- `tsc` (app and `tsconfig.node.json`), full `npm run lint`.
- Build time and bundle size against the `main` baseline.
- Keycloak login/OTP screenshots against a `main` baseline; smoke screenshots of 15 pages behind
  login; federation with a stub remote and with the real `technology-copilot` remote.
- `test-harness` sanity-ui against `vite preview` builds of `main` and the branch.
- Node 20.19.6 (arm64 and amd64), 20.20.2, 24.21 and 26.10 in Docker.

## Open Items

- AC 15/17 (proposed, awaiting the assignee's decision): production has no enabled `module`
  application (`technology-copilot` is `enabled: false`), and both the stub and the real
  production remote behave the same on `main` and on the branch. Proposed: AC 15 is covered by
  these local checks, the stand check becomes optional, and AC 17 does not apply.
- AC 12, 14 (Entra), 18 and 19 on the dedicated environment, then QA.
