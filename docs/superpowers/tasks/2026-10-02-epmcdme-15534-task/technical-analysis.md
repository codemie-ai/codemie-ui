# Technical Research

**Task**: release-popup localStorage UI display testing
**Generated**: 2026-10-02
**Research path**: filesystem

---

## 1. Original Context

Add a testing option in codemie-ui that prevents the release popup from being displayed when the local-storage key disable-release-popup has the value True. When the specified local-storage value is present, it takes precedence over all existing popup display rules. Otherwise, the existing display behavior remains unchanged. Need to modify: codemie-ui release popup display logic and local-storage handling. Tests covering release popup behavior must also be updated.

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/appLevel/AutoPopupManager.tsx` — the single component that decides whether the release popup (P2 priority) is shown. Effect 1 (lines 68-83) sets `activePopup` to `'release'` when `appInfoStore.isOnboardingCompleted()` is true and `appInfoStore.isAppReleaseNew()` is true, after `appInfoStore.loadReleaseNotes()` resolves. This is the only call site that sets the release popup active.
- `src/store/appInfo.ts` — Valtio store (`appInfoStore`) holding `isAppReleaseNew()` (line 297-299: compares `viewedAppReleaseVersion` to `appReleases[0]?.version`), `isOnboardingCompleted()` (lines 301-307, reads `localStorage.getItem(ONBOARDING_COMPLETED_KEY)` as a fallback when profile settings are null), `setViewedAppVersion()`, and `loadReleaseNotes()`.
- localStorage keys currently defined at the top of `appInfo.ts` (lines 53-57): `ONBOARDING_COMPLETED_KEY`, `QUICK_ACTIONS_COLLAPSED_KEY`, `NAVIGATION_EXPANDED_KEY`, `SIDEBAR_EXPANDED_KEY`, `DATASOURCE_PER_PAGE_KEY` — each is a plain string constant read with `localStorage.getItem(...) === 'true'`. No `disable-release-popup` key exists anywhere in the repo (confirmed by grep).
- `src/components/appLevel/Banner.tsx` (lines 57-64) is the closest existing precedent for a localStorage flag that *suppresses* a UI element outright: `if (!message || localStorage.getItem(storageKey) === 'true') { messages.current.clear(); return }` — a direct "localStorage says don't show" gate placed ahead of the normal display logic.

### Architecture and Layers Affected

- **Component layer**: `AutoPopupManager` (`src/components/appLevel/AutoPopupManager.tsx`) — owns the `activePopup` state machine and the JSX for the release `Popup`.
- **Store layer**: `appInfoStore` (`src/store/appInfo.ts`) — owns `isAppReleaseNew()` / `isOnboardingCompleted()`-style boolean predicates and all localStorage key constants for app-level UI toggles.
- No router, API, or DB/ORM layers are implicated — this is a client-only, localStorage-driven, pure-UI-gating feature. No backend endpoint change is involved.

### Integration Points

- `AutoPopupManager` imports `appInfoStore` from `@/store/appInfo` and calls `isOnboardingCompleted()` / `isAppReleaseNew()` directly in its effect condition (line 80: `if (appInfoStore.isOnboardingCompleted() && appInfoStore.isAppReleaseNew())`).
- `appInfoStore.isOnboardingCompleted()` already demonstrates the project's pattern for a localStorage-backed boolean living alongside a profile-settings-backed one, in the same store.
- `profileSettingsStore` (`@/store/userProfileSettings`) supplies `viewedAppReleaseVersion` via `last_viewed_release_version`; this flow is unrelated to the new flag but shares the same effect's conditional.

### Patterns and Conventions

- localStorage keys are declared as module-level `const ..._KEY = 'codemie-...'` strings in the owning store file, not scattered as literals (see `appInfo.ts` lines 53-57). The ticket's key is literally `disable-release-popup` (no `codemie-` prefix shown in the ticket text), which breaks that naming convention if copied verbatim — worth flagging to spec/plan rather than resolving here.
- Boolean predicates reading localStorage follow the `localStorage.getItem(KEY) === 'true'` idiom throughout `appInfo.ts` (`getStoredNavigationExpanded`, `getStoredSidebarExpanded`, `isQuickActionsCollapsed`, `isOnboardingCompleted`).
- `Banner.tsx` shows the convention for a value that *takes precedence and suppresses* rather than one that merely contributes to a condition — checked first, short-circuits the rest of the display logic.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` exists and covers Valtio store conventions but has no section on localStorage key naming or precedence rules (checked via grep — no `localStorage` hits).
- `.ai-run/guides/testing/testing-patterns.md` covers test-timeout/flake triage but has no localStorage-mocking section; conventions are derived from existing tests instead (see Section 4).
- `.ai-run/guides/architecture/architecture.md` not read in depth for this task — the feature stays entirely inside `src/components/appLevel/` and `src/store/appInfo.ts`, both already identified; no cross-cutting architecture question arises.

### Architectural Decisions

- The `AutoPopupManager` file header (lines 36-44) is itself a recorded design decision: a documented strict P1/P2/P3 priority ordering for all automatic popups, with P3 explicitly suppressed while P1/P2 are active. A `disable-release-popup` override needs to be reasoned about against this documented priority system, not just against the release-popup branch in isolation.

### Derived Conventions

- New localStorage-backed display predicates are added as a named method on `appInfoStore` (e.g. alongside `isAppReleaseNew`, `isOnboardingCompleted`), not inlined in the component — consistent with every existing predicate in `appInfo.ts`.
- A key that unconditionally suppresses a popup is checked first in the component's gating logic, as `Banner.tsx` does, rather than folded into the existing boolean expression.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/appLevel/__tests__/AutoPopupManager.test.tsx` — unit test (mocks `valtio`, `@/store/appInfo`, `@/store/onboarding`, `@/store/userProfileSettings`, `@/store/user`, `@/hooks/useVueRouter`, `react-router`, and `@/components/Popup`). Covers: profile-settings fetch race for the release popup (3 tests, lines 125-170), and tour/popup behavior on phones vs. desktop (4 tests, lines 172-242). It mocks `appInfoStore.isAppReleaseNew` and `isOnboardingCompleted` as plain `vi.fn()`s — it does **not** touch real `localStorage` at all, since the whole store is mocked.
- `src/store/__tests__/appInfo.test.ts` — unit tests for `appInfo.ts` covering `loadAppInfo`, `loadReleaseNotes`, `fetchToolConfigs`, `getLLMModels`, config refetch, etc. No test currently exercises `isAppReleaseNew()`, `isOnboardingCompleted()`, or any localStorage-backed predicate directly.
- `src/store/__tests__/appInfo.mobileShell.test.ts` — covers mobile/navigation/sidebar state, not release-popup logic.
- `src/components/appLevel/__tests__/Banner.test.tsx` — demonstrates the project's localStorage-mocking idiom for a suppress-this-UI flag: replaces `global.localStorage` with a plain in-memory object backed by `vi.fn()` getters/setters (lines 50-64), then asserts both `getItem` calls and `setItem` calls with specific keys/values.

### Testing Framework and Patterns

- Vitest, two projects: `unit` (mocked Valtio/stores, `src/setupTests.unit`) and `integration` (real Valtio + real stores + mocked API, `*.integration.test.*` suffix, `src/setupTests.integration`) — defined in `vitest.workspace.ts`.
- `AutoPopupManager.test.tsx` is a `unit` project test (no `.integration.` suffix) — it mocks the whole store, so a real-localStorage assertion would need either a new integration test or a mock extension (`mockAppInfoStore` already stubs `isAppReleaseNew`/`isOnboardingCompleted`; a `disable-release-popup` check could be added the same way if it lives in the store, or tested via `global.localStorage` stubbing like `Banner.test.tsx` if checked directly in the component).
- `vi.hoisted()` is used throughout for mock store objects that must exist before `vi.mock()` factory evaluation (`AutoPopupManager.test.tsx` lines 25-57).

### Coverage Gaps

- No existing test exercises `appInfoStore.isAppReleaseNew()` or `isOnboardingCompleted()` against real `localStorage` — both are only ever exercised through mocks. A new `disable-release-popup` predicate would be the first localStorage-direct test for this store's popup-related state unless it follows the `Banner.test.tsx` mocking style.
- No test currently asserts what happens when `localStorage` is unavailable/throws (e.g., private browsing) for any of the existing popup-adjacent predicates — the task doesn't request this, noted only as an existing gap, not a requirement.

---

## 5. Configuration and Environment

### Environment Variables

- No `VITE_*` or `window._env_` environment variable governs popup display; grep of `import.meta.env|window._env_` across `src` for popup/release terms returned nothing. This is a localStorage-only toggle per the ticket, not a build-time or runtime env flag.

### Configuration Files

- No `config/`, `settings.py`-equivalent, or `.env.example` entries relate to release-popup display. Release content itself comes from `src/configs/releaseNotes.json` (read by `appInfoStore.loadReleaseNotes`), which is unrelated to the display-suppression logic the ticket asks for.

### Feature Flags and Deployment Concerns

- No existing feature-flag mechanism gates the release popup; `isAppReleaseNew()` / `isOnboardingCompleted()` are the only two gates today. The ticket's `disable-release-popup` key is explicitly described as a "testing option," which matches the pattern of a developer/QA-only localStorage override rather than a customer-facing config entry (`appInfoStore.configs` / `CONFIG_KEYS`) — none of the `CONFIG_KEYS` entries in `src/constants/configKeys.ts` relate to popups.

---

## 6. Risk Indicators

- The ticket's literal key name `disable-release-popup` does not match the `codemie-<kebab>` naming convention used by every other localStorage key in `appInfo.ts` (`codemie-onboarding-completed`, `codemie-navigation-expanded`, etc.) — spec/plan should decide whether to keep the ticket's exact string (likely required if QA tooling already references it) or adapt the constant name while keeping the literal key value.
- Speculative: the override will most likely be implemented as a new predicate on `appInfoStore` (mirroring `isOnboardingCompleted`) checked first in `AutoPopupManager`'s Effect 1, but it could instead be read directly inside the component (mirroring `Banner.tsx`) — the choice changes which existing unit test (`appInfo.test.ts` vs. `AutoPopupManager.test.tsx`) needs the real-localStorage test added and how it must be mocked.
- `AutoPopupManager.test.tsx` currently mocks the entire `@/store/appInfo` module (line 75-77), so if the new flag lives in the store, the existing mock object (`mockAppInfoStore`) will need a new stub method added everywhere the test file resets mocks (two `beforeEach` blocks, lines 126-136 and 190-201) — missing one of those blocks would make a test pass only in isolation.
- The documented P1/P2/P3 popup priority system in `AutoPopupManager.tsx` (lines 36-44) only orders popups against each other; there is no existing single "kill switch" concept, so the new override's exact placement (gate P2 only, or short-circuit the whole effect) is a design decision for spec/plan, not something the current code already answers.
- No test today exercises a real (unmocked) `localStorage` read for any popup-related predicate — the closest precedent (`Banner.test.tsx`) stubs `global.localStorage` with a hand-rolled object rather than using a shared test utility, so there is no shared helper to reuse without duplicating that pattern.

---

## 7. Summary for Complexity Assessment

This task touches exactly two files directly — `src/components/appLevel/AutoPopupManager.tsx` (component layer, release-popup gating in Effect 1) and `src/store/appInfo.ts` (store layer, where every other localStorage-backed display predicate for this app already lives) — plus their existing unit tests, `AutoPopupManager.test.tsx` and `appInfo.test.ts`. No router, API, backend, or database layer is involved; this is a pure client-side localStorage read that must take precedence over the existing `isAppReleaseNew()` / `isOnboardingCompleted()` gate.

Technical novelty is low: the project already has two directly analogous patterns to follow — `appInfoStore.isOnboardingCompleted()` for a localStorage-backed boolean predicate living in the store, and `Banner.tsx`'s suppress-first `localStorage.getItem(storageKey) === 'true'` check for a flag that overrides existing display logic outright. Neither requires new infrastructure, dependencies, or build/deploy changes.

Test coverage posture is the main area needing care rather than risk: existing tests for the release popup (`AutoPopupManager.test.tsx`) mock the store entirely and never touch real `localStorage`, so adding the override will require either extending the mocked store object consistently across two separate `beforeEach` blocks in that file, or adding a `Banner.test.tsx`-style real-`localStorage` stub if the check is read directly in the component — plus new assertions in `appInfo.test.ts` if the predicate lands in the store. The one open design question — exact key-naming convention versus the ticket's literal string, and whether the check short-circuits the whole effect or just the release branch — is noted as speculative risk, not a blocker, since it does not change the file surface, only the implementation detail.

---

## 8. External References

None named by the task.
