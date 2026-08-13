# Technical Research

**Task**: welcome tour analytics onboarding tour-step
**Generated**: 2026-08-03T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Welcome tour freezes on step 11 when the Analytics section is highlighted. The user cannot proceed through the tour or interact with the page using the mouse. After reloading the page, the Welcome tour start screen is displayed again (tour progress not completed or properly resumed). Bug in EPMCDME-13785.

---

## 2. Codebase Findings

### Existing Implementations

- `src/configs/onboarding/navigationIntroduction.tsx` — defines the "Navigation & Core Features Tour" flow; contains the `analytics` and `prebuilt-assistants` steps; **Bug 1 lives here**: `prebuilt-assistants` condition uses `div[class*="flex"]` which always matches
- `src/store/onboarding.ts` — flow registry, `startFlow`, `nextStep`, `prevStep`, `completeFlow`, `skipFlow`; evaluates step conditions upfront at `startFlow` time and caches in `activeSteps`
- `src/components/Onboarding/OnboardingOverlay.tsx` — renders `fixed inset-0 z-[1200] pointer-events:auto` overlay for every Highlight step; houses `OnboardingSpotlight` and `OnboardingTooltip`
- `src/components/Onboarding/OnboardingSpotlight.tsx` — tracks target element position; **Bug 3 lives here**: `updatePosition` only calls `setPosition` when element found, never clears stale position
- `src/components/Onboarding/OnboardingTooltip.tsx` — uses floating-ui to position tooltip; renders with `visibility:hidden` when `tooltipReady = false` (target not found OR `isPositioned = false`); still occupies no pointer events, so the overlay below intercepts everything
- `src/components/appLevel/AutoPopupManager.tsx` — triggers `startFlow('navigation-introduction')` when user loads; starts before Navigation is mounted if `isConfigFetched` is false
- `src/components/Navigation/Navigation.tsx` — renders `<header>` with nav links; Analytics nav link only added when `isEnterpriseEdition()` is true
- `src/components/Navigation/NavigationAssistants.tsx` — renders the element with `data-onboarding="prebuilt-assistants"`; returns `null` when `assistantItems.length === 0` (**Bug 2**: target may not exist on DOM when step activates)
- `src/utils/onboarding.ts` — `findNavLinkByText` queries `header nav a, header a`
- `src/store/appInfo.ts` — `isConfigFetched` flag; `completeOnboarding()` writes `localStorage['codemie-onboarding-completed'] = 'true'` (only reached via `completeFlow`/`skipFlow`)
- `src/App.tsx` — Navigation renders only when `user && isConfigFetched`; AutoPopupManager renders when `user` only

### Architecture and Layers Affected

- **Config layer** (`src/configs/onboarding/`): step definitions, conditions, targets
- **Store layer** (`src/store/onboarding.ts`, `src/store/appInfo.ts`): state management for flow progress and completion
- **Component layer** (`src/components/Onboarding/`): overlay, spotlight, tooltip rendering
- **Navigation layer** (`src/components/Navigation/`): provides the DOM target elements the tour resolves at runtime

### Integration Points

- `isEnterpriseEdition()` → controls whether the Analytics nav link (and thus the analytics step) is included
- `getHelpAssistants()` (last call in `useInitialDataFetch`) → provides data that determines whether `NavigationAssistants` renders its element
- `localStorage['codemie-onboarding-completed']` → persists completion state across reloads
- `@floating-ui/react` `autoUpdate` → re-positions tooltip on DOM changes; fails silently when target is null

### Patterns and Conventions

- Step conditions must be consistent with their `target` selector — the condition should return `false` if `document.querySelector(target)` would return `null`
- `OnboardingSpotlight.updatePosition` pattern: find element → if found, setPosition; **missing** else branch to clear stale position
- Conditions evaluated upfront at `startFlow` with `Promise.all`; result cached in `activeSteps` — but async data (help assistants) may not yet be loaded when `startFlow` runs

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/onboarding/flow-creation-guide.md` — covers flow spec authoring; notes that conditional steps must be marked `(Conditional)` and conditions must accurately gate the step; does not cover the `OnboardingSpotlight` stale-position edge case

### Architectural Decisions

- Remote branch `origin/EPMCDME-13398` (commit `d712e8055`) already fixes Bugs 1 and 2: (a) fixes `prebuilt-assistants` condition to check `[data-onboarding="prebuilt-assistants"]` directly; (b) moves `data-onboarding="prebuilt-assistants"` from `NavigationAssistants` to `NavigationPinnedSection`. **NOT yet on `main`.**
- Remote branch `origin/EPMCDME-11360_fix-onboarding-tours-step-skip` (commit `cbd3e183e`) adds try/finally exception safety and concurrent-call guard to `nextStep`/`prevStep`. **NOT yet on `main`.**

### Derived Conventions

- Step condition and `target` selector must reference the same DOM element — condition gates inclusion, target is what the spotlight/tooltip bind to
- `OnboardingSpotlight` should call `setPosition(null)` in its else branch when element not found, to prevent stale highlight from persisting across step transitions

---

## 4. Testing Landscape

### Existing Coverage

- `src/store/__tests__/onboarding.restoreUrl.test.ts` — covers URL restore on `skipFlow`/`completeFlow`; does NOT cover step transition rendering or spotlight state

### Testing Framework and Patterns

- Vitest (workspace config `vitest.workspace.ts`)
- Valtio store tested directly with mocked modules; DOM not used in current onboarding tests

### Coverage Gaps

- No tests for `OnboardingSpotlight` position retention when target not found
- No tests for `prebuilt-assistants` condition accuracy (always-true bug untested)
- No integration test for the analytics→prebuilt-assistants step transition
- No test verifying `tooltipReady` state when step target disappears between steps
- No test for `OnboardingOverlay` blocking interaction when tooltip is hidden but overlay is full-screen

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_ONBOARDING_ASSISTANT_SLUG` — slug for the onboarding assistant used by `NavigationAssistants`
- `VITE_CHATBOT_ASSISTANT_SLUG` — slug for the chatbot assistant

### Configuration Files

- `config/customer/customer-config.yaml` — local config; does NOT set `features:enterpriseEdition` → `isEnterpriseEdition()` returns `false` locally, Analytics link hidden, bug does NOT reproduce locally

### Feature Flags and Deployment Concerns

- `features:enterpriseEdition` — **required for bug to manifest**; adds Analytics nav link; absent in local config
- Bug only visible on production/staging deployments with Enterprise Edition enabled

---

## 6. Risk Indicators

- **Bug only reproduces on enterprise deployments**: Local config doesn't set `features:enterpriseEdition`, so manual testing requires a non-default config or mocking `isEnterpriseEdition()` in tests.
- **Stale-position fix in `OnboardingSpotlight`**: Adding the `else { setPosition(null) }` branch changes behavior for all steps, not just `prebuilt-assistants` — regression risk for other steps that may also transition through brief element-not-found states.
- **Pre-existing partial fixes on unmerged branches**: `EPMCDME-13398` and `EPMCDME-11360` contain related fixes not yet on `main`. This task's fix must be consistent with or supersede those branches' approach. Risk of conflicts if those branches land before this MR.
- **Condition evaluated at `startFlow` vs. runtime**: Even with a corrected condition, if `startFlow` runs before `NavigationAssistants` mounts (help assistants not yet loaded), the step will be correctly excluded — but this means the step silently disappears. Acceptable behavior per spec but worth noting.
- **`OnboardingTooltip` uses `visibility:hidden` not `display:none`**: When tooltip is not ready, it still occupies space in the z-stack. The overlay remains full-screen and pointer-events:auto. No fix needed here if the root cause (step shown when target absent) is fixed.
- **No DOM-based tests**: Current test suite doesn't exercise spotlight/tooltip rendering. New tests will need DOM setup or mocking.

---

## 7. Summary for Complexity Assessment

The freeze is caused by three cooperating bugs in the welcome tour's `prebuilt-assistants` step. First, the step's condition (`div[class*="flex"]`) always evaluates to `true`, so the step is always included in `activeSteps` regardless of whether the actual target element exists. Second, `NavigationAssistants` (which renders the `data-onboarding="prebuilt-assistants"` attribute) returns `null` when help assistants haven't loaded yet — creating a window where the step is active but its DOM target is absent. Third, `OnboardingSpotlight.updatePosition` never calls `setPosition(null)` when the target element is not found, so the spotlight retains the previous step's (Analytics nav link) position. Combined: the overlay renders full-screen (pointer-events:auto) with the analytics highlight still visible, the tooltip hidden (visibility:hidden, no buttons), and no way for the user to proceed.

The fix surface is narrow: `src/configs/onboarding/navigationIntroduction.tsx` (fix the `prebuilt-assistants` condition) and `src/components/Onboarding/OnboardingSpotlight.tsx` (add else-branch to clear stale position). The `NavigationAssistants` target attribute location may also need adjustment (moving to `NavigationPinnedSection` as done in the unmerged `EPMCDME-13398` branch), depending on whether the fix strategy focuses on condition accuracy or on DOM stability. Two unmerged remote branches (`EPMCDME-13398`, `EPMCDME-11360`) already address Bugs 1 and 2; this task's fix should be reviewed against their approach to avoid duplication or conflict.

Testing is the main complexity driver: no existing DOM-based tests cover the spotlight/tooltip interaction, so new vitest tests will need DOM setup. The bug does not reproduce locally due to the `features:enterpriseEdition` flag being absent, meaning test coverage is the primary validation mechanism. File change surface is small (2–3 files), but the enterprise-only reproduction constraint and the existing-unmerged-fix landscape require care.
