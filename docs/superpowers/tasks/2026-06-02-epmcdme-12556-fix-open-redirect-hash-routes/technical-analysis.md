# Technical Research

**Task**: security redirect hash routes sanitization url-validation
**Generated**: 2026-06-02T00:00:00Z

---

## 1. Original Context

Fix Open Redirect (CWE-601) SAST vulnerability in src/utils/redirectHashRoutes.ts. The SAST scanner (SnykSAST) flagged that unsanitized input from document.location (specifically the hash) flows into window.location.replace() on line 23, potentially enabling an attacker to redirect users to a malicious external site via a crafted URL hash. The file currently reads:

```typescript
export const redirectHashRoutes = () => {
  const { hash } = window.location
  if (!hash.startsWith('#/')) return

  const [hashPath, hashQuery] = hash.slice(2).split('?')
  const base = window.location.pathname.replace(/\/$/, '')
  const search = hashQuery ? `?${hashQuery}` : window.location.search
  window.location.replace(`${base}/${hashPath}${search}`)
}
```

The fix must sanitize hashPath to prevent crafted inputs (e.g. `#///evil.com`) from redirecting to external origins. Research: (1) how and where redirectHashRoutes is called/used, (2) existing test coverage for this utility, (3) any similar URL sanitization patterns already in the codebase, (4) the router setup to understand the hash-routing migration context, (5) risk of breaking hash-to-path migration if sanitization is too aggressive.

---

## 2. Codebase Findings

### Existing Implementations

- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/src/utils/redirectHashRoutes.ts` — the vulnerable utility (24 lines). Exports a single function `redirectHashRoutes`. Reads `window.location.hash`, strips the `#/` prefix, splits on `?`, then calls `window.location.replace()` with a concatenated URL built from `window.location.pathname` (the base) and the raw `hashPath`.
- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/src/main.tsx` — the single call site. `redirectHashRoutes()` is called at module initialization, synchronously, before `ReactDOM.createRoot` renders the app. This means the redirect fires once on page load — it is a one-shot migration shim, not a recurring operation.
- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/src/router.tsx` — uses `createBrowserRouter` with `basename: import.meta.env.BASE_URL`. All routes are path-based (`/assistants`, `/chats/:id`, etc.). There is no hash router (`createHashRouter`) in use. The `redirectHashRoutes` function exists purely to support users who bookmarked or were linked to legacy Vue-era hash routes (e.g. `/#/assistants/123`) before the migration to browser-history routing.
- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/src/utils/__tests__/redirectHashRoutes.test.ts` — existing test suite with 7 test cases.

### Attack Vector — Exact Mechanism

The guard `if (!hash.startsWith('#/')) return` only checks that the hash begins with `#/`. After `hash.slice(2)`, a crafted hash of `#///evil.com/path` becomes `//evil.com/path`, which is a protocol-relative URL. When prepended with `base` (which is `''` when `pathname` is `/`), the resulting argument to `window.location.replace` is `//evil.com/path` — an absolute external URL navigating the browser to `evil.com`.

Additional vectors:
- `#/\evil.com` — on some browsers a backslash is treated as a forward slash in URL resolution.
- `#/%2F%2Fevil.com` — URL-encoded double slash.

### Architecture and Layers Affected

- **Utility layer** (`src/utils/`): Only `redirectHashRoutes.ts` requires modification.
- **Entry point** (`src/main.tsx`): No changes required; it is a pass-through call site.
- **Test layer** (`src/utils/__tests__/redirectHashRoutes.test.ts`): New attack-vector test cases must be added to cover the fix.

No store, component, API, or routing configuration changes are required. This is a single-file logic fix.

### Integration Points

- The function is invoked exactly once, at application bootstrap in `main.tsx`, before any React rendering.
- It touches `window.location` (read: `hash`, `pathname`, `search`; write: `replace()`).
- It has no imports, no external dependencies, and no internal module dependencies.
- The router (`src/router.tsx`) is initialized after `redirectHashRoutes()` runs — the redirect must complete (or not fire) before the router mounts. This ordering is already correct and should not be disturbed.

### Patterns and Conventions

- No existing URL-origin validation helper exists in `src/utils/`. The closest pattern in the codebase is in `src/hooks/useAuthCallbackListener.ts`, which uses `new URL(configured).origin` in a `try/catch` block to safely parse and compare origins before trusting a message event. This `new URL()` + origin comparison is the established safe-parse idiom in this codebase.
- `DOMPurify` is available (version `3.2.5`) and used in several markdown and editor components, but its scope is HTML sanitization, not URL path sanitization — it is not appropriate here.
- `URLSearchParams` is used in `src/utils/filters.ts` and `src/utils/api.ts` for query-string handling.
- The recommended fix approach — stripping leading slashes from `hashPath` before use — is a simple, no-dependency solution. An alternative is constructing a full URL with `new URL(path, window.location.origin)` and verifying its `.origin` matches `window.location.origin` before calling `replace()`. Both approaches are consistent with patterns already present in the codebase.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` exists and contains the following categories: architecture, components, development, onboarding, patterns, standards, styling, testing, plus `project.md` and `quality-gates.md`. None of the guides address URL sanitization or open-redirect prevention specifically. The security domain is not covered by any guide file.

### Architectural Decisions

No ADR or inline `DECISION:` comment addresses open-redirect mitigation. The `redirectHashRoutes` function itself has no explanatory comments about its purpose (Vue-to-React hash migration shim) beyond the license header.

### Derived Conventions

From `src/hooks/useAuthCallbackListener.ts` lines 57–70: the codebase uses `new URL(str).origin` wrapped in `try/catch` as the safe way to parse and validate URLs when origin isolation is required. This is the most relevant precedent for the fix.

From test file conventions observed across `src/utils/__tests__/`: tests use `vi.stubGlobal('window', { location: { ... } })` to mock `window.location`, follow the Arrange/Act/Assert (AAA) pattern with comments, and use `describe`/`it` blocks with `beforeEach`/`afterEach` for setup and teardown.

---

## 4. Testing Landscape

### Existing Coverage

File: `/Users/mykola_nehrych/WebstormProjects/codemie-ui/src/utils/__tests__/redirectHashRoutes.test.ts`

Seven existing test cases covering:
1. Happy path: `#/assistants/123` with root pathname → `window.location.replace('/assistants/123')`
2. Guard: hash not starting with `#/` → no call
3. Guard: empty hash → no call
4. Query-param extraction from hash: `#/assistants?tab=chat` → `?tab=chat` used, not `window.location.search`
5. Sub-path deployment: pathname `/codemie/` with trailing slash stripped → `/codemie/assistants/123`
6. Root pathname with no double slash produced
7. Fallback to `window.location.search` when hash has no query params

None of the seven test cases cover the attack vectors:
- `#///evil.com` (protocol-relative redirect)
- `#//evil.com`
- `#/\evil.com` (backslash-based redirect)
- `#/%2F%2Fevil.com` (URL-encoded slashes)
- Sub-path deployment + `#///evil.com` (where base is not empty)

### Testing Framework and Patterns

- **Framework**: Vitest (`vitest` 1.6.1) with jsdom environment (configured in `vite.config.ts`).
- **Libraries**: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`.
- **Mocking**: `vi.stubGlobal` / `vi.unstubAllGlobals` for browser globals. `vi.fn()` for spy functions. Cleaned with `vi.clearAllMocks()` in `beforeEach`.
- **Pattern**: AAA with inline comments (`// Arrange`, `// Act`, `// Assert`). `describe`/`it` naming.
- **Test runner commands**: `npm run test:unit` (unit project), `npm run test:integration` (integration project).
- The test file is already correctly structured; new test cases should follow the same `stubLocation` helper and AAA pattern.

### Coverage Gaps

- No test for protocol-relative path attack: `#///evil.com` → must be added.
- No test for double-slash attack: `#//evil.com` → must be added.
- No test for backslash variant: `#/\evil.com` → should be added.
- No test for URL-encoded slash attack: `#/%2Fevil.com` or `#/%2F%2Fevil.com` → should be added.
- No test confirming the sanitized path still navigates correctly when legitimate paths contain multiple segments: `#/assistants/123/edit` with sub-path base → should verify post-fix behavior is unchanged.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_SUFFIX` (read in `vite.config.ts` line 70): sets the Vite `base` option, which determines `import.meta.env.BASE_URL`. This value is passed as `basename` to `createBrowserRouter` and also determines `window.location.pathname` in sub-path deployments (e.g. `/codemie/`). The `redirectHashRoutes` function uses `window.location.pathname` as the base prefix — this is directly affected by `VITE_SUFFIX` and is already tested via the "strip trailing slash" test case.
- No other environment variables are relevant to this function.

### Configuration Files

- `vite.config.ts`: Defines test environment as `jsdom` — this is why `vi.stubGlobal` works for mocking `window`.
- No feature flags or runtime toggles govern `redirectHashRoutes`.

### Feature Flags and Deployment Concerns

- No feature flags. The function is always called at bootstrap.
- Sub-path deployment (via `VITE_SUFFIX`) is an active concern: the existing test case for `/codemie/` pathname confirms this is a real deployment scenario. The sanitization fix must not break this case — specifically, legitimate paths like `/codemie/#/assistants/123` must still redirect to `/codemie/assistants/123`.
- The fix does not require any migration, environment change, or deployment configuration update.

---

## 6. Risk Indicators

- **Confirmed vulnerability**: `hashPath` is taken verbatim from `window.location.hash` and concatenated into `window.location.replace()`. A hash value of `#///evil.com` causes `base` (`''` at root) + `/` + `//evil.com` = `//evil.com`, which is a valid external redirect URL in all browsers.
- **Backslash vector on some browsers**: `#/\evil.com` — browsers may normalize `\` to `/` before processing the URL in `window.location.replace`. This vector should be tested after the fix is applied.
- **URL-encoded slash vector**: `hashPath` is not decoded before use — `%2F` sequences do not constitute a leading-slash attack through string concatenation; however, if a `decodeURIComponent` step were ever added upstream, it would reopen this path. The fix approach should not rely solely on string-level slash stripping if the codebase ever normalizes encoding.
- **No existing test coverage for any attack vector**: all seven current tests cover only benign inputs. The security regression tests must be added alongside the fix.
- **No documentation for the function's purpose**: the hash-routing migration context is entirely undocumented — no comment in `redirectHashRoutes.ts`, no ADR, no guide. A developer unfamiliar with the Vue migration history could inadvertently remove or weaken the sanitization later. An explanatory comment should be added with the fix.
- **Single call site, no abstraction**: `redirectHashRoutes` is called directly in `main.tsx` without any wrapper or configuration. If future requirements arise to re-run or conditionally run the redirect, the tight coupling to `window.location` makes the function hard to test in isolation without the existing `vi.stubGlobal` pattern.
- **Minimal attack surface for sanitization over-reach**: the function only runs once on page load and only when the hash starts with `#/`. Legitimate hash paths consist of route segments matching the registered routes in `router.tsx` (e.g. `assistants`, `chats`, `skills`, etc.) — none begin with `/`. Stripping leading slashes from `hashPath` cannot break any legitimate navigation target.

---

## 7. Summary for Complexity Assessment

This task is a low-complexity, single-file security patch touching exactly two source files: the utility being fixed (`src/utils/redirectHashRoutes.ts`) and its test file (`src/utils/__tests__/redirectHashRoutes.test.ts`). The utility layer is isolated — no stores, components, routes, or API integrations are involved. The call site in `main.tsx` requires no change.

The task follows an established fix pattern visible elsewhere in the codebase. The recommended remediation is to strip leading slashes from `hashPath` before building the redirect URL, ensuring the constructed path is always relative. Concretely: `hashPath.replace(/^\/+/, '')` eliminates the `//evil.com` vector by collapsing all leading slashes. An alternative — constructing `new URL(path, window.location.origin)` and asserting `.origin === window.location.origin` before proceeding — is more robust against encoded-slash variants but is slightly more complex and introduces a `try/catch`. Either approach is consistent with patterns already in the codebase. The stripping approach is the most targeted and least likely to introduce regressions.

Test coverage posture for the affected area is good in the happy-path dimension (7 existing cases, all passing, structured with a reusable `stubLocation` helper) but has a complete gap on the security dimension — zero tests for any attack vector. The fix must be accompanied by at least three new test cases: protocol-relative (`#///evil.com` at root), protocol-relative with sub-path base (`#///evil.com` with `/codemie/` pathname), and backslash variant (`#/\evil.com`). No integration tests are needed. The quality gate is: `npm run lint`, `npm run typecheck`, `npm run test:unit`.

Key risk factors for complexity scoring: (1) the fix logic itself is trivial (one-line change), (2) the test additions are straightforward extensions of the existing test pattern, (3) there is zero risk of breaking other modules since the function has no internal dependencies, (4) the only deployment concern (sub-path base via `VITE_SUFFIX`) is already covered by an existing test case that must continue to pass. Overall, this is a Level 1 (simple) change — one logic file, one test file, no architectural decisions required.
