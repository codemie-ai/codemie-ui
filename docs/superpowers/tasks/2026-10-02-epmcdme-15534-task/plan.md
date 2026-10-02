# Release-Popup Disable Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `localStorage`-backed testing override that unconditionally prevents the release popup from showing, taking priority over the existing onboarding/new-release gating.

**Architecture:** Add a new boolean predicate `isReleasePopupDisabled()` to `appInfoStore` (same pattern as `isOnboardingCompleted()`), then check it first in `AutoPopupManager`'s Effect 1 so it short-circuits only the P2 (release) branch — P1 (onboarding) and P3 (first-visit page) stay untouched.

**Tech Stack:** React, TypeScript, Valtio, Vitest + React Testing Library (`unit` project, mocked stores).

## Global Constraints

- localStorage key is the ticket's literal string `disable-release-popup` — do **not** adapt it to the `codemie-<kebab>` prefix convention used by other keys in `appInfo.ts`; QA tooling likely references the literal string.
- The override must suppress the release popup regardless of `isOnboardingCompleted()` / `isAppReleaseNew()` — it must never be folded into their boolean expression in a way that a `false` of theirs could still let the popup show when the override is active.
- The override gates the release popup (P2) only — Effect 1's onboarding branch (P1) and Effect 2's page-popup branch (P3) in `AutoPopupManager.tsx` must stay byte-identical.
- No new dependency, no new localStorage-mocking helper — reuse the real-`localStorage` idiom already used in this repo's store tests.
- Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] When `localStorage.getItem('disable-release-popup')` is `'True'` (case-insensitive), the release popup is never shown.
- [ ] The override takes priority over `isOnboardingCompleted()` and `isAppReleaseNew()` — it suppresses the popup even when both of those would otherwise allow it.
- [ ] When the key is absent, empty, or holds any other value, the release popup's existing display rules are unchanged.
- [ ] Automated tests cover both the override-active and override-inactive paths.

---

### Task 1: `appInfoStore.isReleasePopupDisabled()` predicate

**Files:**
- Modify: `src/store/appInfo.ts:53-57` (add key constant), `src/store/appInfo.ts:297-307` (add method next to `isAppReleaseNew`/`isOnboardingCompleted`)
- Test: `src/store/__tests__/appInfo.test.ts` (new `describe` block; file already imports the real `appInfoStore` via `await import('@/store/appInfo')` at line 98 — no store mocking needed)

**Interfaces:**
- Produces: `appInfoStore.isReleasePopupDisabled(): boolean` — reads `localStorage.getItem('disable-release-popup')`, returns `true` iff the value lower-cased equals `'true'`.

Test-first: yes — `appInfoStore.isReleasePopupDisabled` does not exist yet; a test calling it fails on "not a function" before the method is added.

- [ ] **Step 1: Write the failing tests** in a new `describe('appInfoStore.isReleasePopupDisabled', ...)` block in `appInfo.test.ts`, with an `afterEach` that calls `localStorage.removeItem('disable-release-popup')`:

```ts
it('returns false when the key is absent', () => {
  expect(appInfoStore.isReleasePopupDisabled()).toBe(false)
})

it('returns true when the key is "True"', () => {
  localStorage.setItem('disable-release-popup', 'True')
  expect(appInfoStore.isReleasePopupDisabled()).toBe(true)
})

it('returns false when the key holds an unrelated value', () => {
  localStorage.setItem('disable-release-popup', 'False')
  expect(appInfoStore.isReleasePopupDisabled()).toBe(false)
})
```

- [ ] **Step 2: Run to confirm failure** — `npx vitest run --project unit src/store/__tests__/appInfo.test.ts`. Expected: FAIL, `isReleasePopupDisabled is not a function`.
- [ ] **Step 3: Add the key constant** below `DATASOURCE_PER_PAGE_KEY` at `src/store/appInfo.ts:57`: `const DISABLE_RELEASE_POPUP_KEY = 'disable-release-popup'`.
- [ ] **Step 4: Add the predicate** immediately after `isAppReleaseNew()` (`src/store/appInfo.ts:297-299`):

```ts
isReleasePopupDisabled() {
  return localStorage.getItem(DISABLE_RELEASE_POPUP_KEY)?.toLowerCase() === 'true'
},
```

- [ ] **Step 5: Run to confirm pass** — same command as Step 2. Expected: PASS, all three new cases plus every pre-existing case in the file.
- [ ] **Step 6: Commit.**

---

### Task 2: Wire the override into `AutoPopupManager` Effect 1

**Files:**
- Modify: `src/components/appLevel/AutoPopupManager.tsx:79-82`
- Modify: `src/components/appLevel/__tests__/AutoPopupManager.test.tsx:37-43` (mock store shape), `:130-131` and `:194-195` (both `beforeEach` resets), and the first `describe` block (new test cases)

**Interfaces:**
- Consumes: `appInfoStore.isReleasePopupDisabled(): boolean` (Task 1).

Test-first: yes — the two new assertions below fail against today's Effect 1, which has no override check, before the component change lands.

- [ ] **Step 1: Extend the mock store and both resets.** Add `isReleasePopupDisabled: vi.fn(() => false)` to the `mockAppInfoStore` object literal (`AutoPopupManager.test.tsx:37-43`), and add the line `mockAppInfoStore.isReleasePopupDisabled = vi.fn(() => false)` to both `beforeEach` blocks (after the `isAppReleaseNew` reset at line 131 and at line 195), so every existing test keeps the override inactive by default.
- [ ] **Step 2: Write the failing tests** in the `'AutoPopupManager — release popup vs. profile-settings fetch race'` describe block, reusing the same `profileSettings` fixture as the existing "shows the release popup once the profile-settings fetch resolves successfully" test:

```ts
it('does not show the release popup when the disable-release-popup override is active, even though all other conditions allow it', () => {
  mockAppInfoStore.isReleasePopupDisabled = vi.fn(() => true)
  mockProfileSettingsStore.profileSettings = {
    user_id: 'user-123',
    theme: 'system',
    onboarding: { completed: true, completed_flows: [], visited_pages: [] },
    recent_assistant_ids: [],
    last_viewed_release_version: '2.40.0',
  }
  mockProfileSettingsStore.error = null

  renderWithRouter()

  expect(screen.queryByRole('dialog', { name: 'New CodeMie Release' })).not.toBeInTheDocument()
})

it('still shows the release popup when the override is inactive and existing rules allow it', () => {
  mockAppInfoStore.isReleasePopupDisabled = vi.fn(() => false)
  mockProfileSettingsStore.profileSettings = {
    user_id: 'user-123',
    theme: 'system',
    onboarding: { completed: true, completed_flows: [], visited_pages: [] },
    recent_assistant_ids: [],
    last_viewed_release_version: '2.40.0',
  }
  mockProfileSettingsStore.error = null

  renderWithRouter()

  expect(screen.getByRole('dialog', { name: 'New CodeMie Release' })).toBeInTheDocument()
})
```

- [ ] **Step 3: Run to confirm the first new test fails** — `npx vitest run --project unit src/components/appLevel/__tests__/AutoPopupManager.test.tsx`. Expected: the override test FAILs (dialog is present), the inactive-override test passes already.
- [ ] **Step 4: Update Effect 1** (`AutoPopupManager.tsx:79-82`) to check the override first:

```ts
appInfoStore.loadReleaseNotes()
if (
  !appInfoStore.isReleasePopupDisabled() &&
  appInfoStore.isOnboardingCompleted() &&
  appInfoStore.isAppReleaseNew()
) {
  setActivePopup('release')
}
```

- [ ] **Step 5: Run to confirm pass** — same command as Step 3. Expected: PASS, all tests in the file including both new cases and the pre-existing 7.
- [ ] **Step 6: Commit.**

---

## Negative-constraint pass

- "This override has the highest priority and suppresses the popup regardless of the existing display rules" → Task 2 Step 4 places `!appInfoStore.isReleasePopupDisabled()` as a top-level `&&` operand, so a `true` override forces the whole condition `false` no matter what `isOnboardingCompleted()` / `isAppReleaseNew()` return. No task evaluates the override as subordinate to the other two.
- "leaving other popups controlled by existing priority rules" (scope note) → only Effect 1's release branch (`AutoPopupManager.tsx:79-82`) changes; Effect 1's onboarding branch (P1, lines 72-77) and Effect 2's page-popup branch (P3) are untouched by both tasks.
- "Use the ticket's literal string `disable-release-popup`" → Task 1 Step 3 defines the constant with that exact value, not the `codemie-` prefix every other key in the file uses.
- No task adds a whole-suite lint/build/test gate, a code-review step, or a commit-message format — each task ends at its own component/predicate test passing, per the calling flow's own gate.
- negative-constraints: all stated constraints above are covered; none were found unaddressed.
