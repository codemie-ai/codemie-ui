# Technical Research

**Task**: onboarding flow, onboarding tours, step sequencing, profile settings, onboarding popup
**Generated**: 2026-07-22T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Jira ticket EPMCDME-11360 (Bug, Priority: Major, Frontend, repo: codemie-ui).

Summary: Onboarding flow: 'Onboarding Tours' step is skipped and 'Your Profile & Settings' appears instead.

Description: During onboarding flow the expected step "Onboarding Tours" is not shown; instead the flow skips it and shows "Your Profile & Settings". This breaks the onboarding sequence and prevents users from discovering onboarding tours.

Steps to reproduce:
1. Open test environment.
2. Observe the onboarding popup.
3. Start the onboarding flow.
4. Proceed through the flow until the step where "Onboarding Tours" is expected.
5. Observe that "Onboarding Tours" step is skipped and "Your Profile & Settings" appears instead.

Expected result:
- "Onboarding Tours" step is displayed in the onboarding flow in the correct order.
- "Your Profile & Settings" step is displayed only in its intended position (not as a replacement for "Onboarding Tours").

Acceptance criteria:
- Onboarding flow includes "Onboarding Tours" step and it is not skipped.
- "Your Profile & Settings" does not replace "Onboarding Tours".
- Step order matches the designed onboarding flow.
- Verified in test environment.

---

## 2. Codebase Findings

### Existing Implementations

**Flow definition (primary suspect)**
- `src/configs/onboarding/navigationIntroduction.tsx` — defines `navigationIntroductionFlow`, the main new-user welcome flow. Contains all 30+ steps including the two steps central to this bug.
- `src/configs/onboarding/index.ts` — barrel re-export for all six flow configs.
- `src/store/onboarding.ts` — `onboardingStore` (valtio proxy). Holds the complete step-execution engine: `startFlow`, `nextStep`, `prevStep`, `skipFlow`, `completeFlow`. The `allowedSteps` array (built once in `startFlow` by evaluating per-step `condition` callbacks) is the only mechanism that can silently remove a step from the flow.

**Step-level detail — the two affected steps**

Step 18 ("Onboarding Tours"), file `src/configs/onboarding/navigationIntroduction.tsx` lines 366–374:
```typescript
// Step 18: Onboarding Tours Section (Conditional - future)
{
  id: 'onboarding-tours-section',
  actionType: 'Highlight',
  title: 'Onboarding Tours - Interactive Learning',
  target: '[data-onboarding="help-onboarding-section"]',
  delay: 300,
  description: `Access all interactive onboarding tours...`,
},
```
- No `condition` property. Passes the `startFlow` filter unconditionally.
- Targets `[data-onboarding="help-onboarding-section"]`.

Tech step between step 18 and step 19 (`src/configs/onboarding/navigationIntroduction.tsx` lines 376–393):
```typescript
{
  id: 'expand-profile-menu',
  actionType: 'CodeExecution',
  execute: () => {
    const profileButton = document.querySelector('[data-onboarding="profile-button"]')
    if (profileButton instanceof HTMLElement) profileButton.click()
  },
  ...
},
```
This is a `CodeExecution` step and is silently executed by `runTechnicalStep` inside the `nextStep` loop. It runs immediately when the user advances FROM step 18, not before step 18 is shown.

Step 19 ("Your Profile & Settings"), `src/configs/onboarding/navigationIntroduction.tsx` lines 394–407:
```typescript
{
  id: 'profile-section',
  actionType: 'Highlight',
  title: 'Your Profile & Settings',
  target: '[data-onboarding="profile-expand-content"]',
  ...
},
```

**Target element for step 18**
- `src/pages/help/components/OnboardingToursSection.tsx` line 33:
  ```tsx
  <section data-onboarding="help-onboarding-section" ...>
  ```
  This `data-onboarding` attribute is the sole DOM anchor for step 18. If this element is absent from the DOM when the step is active, the `OnboardingTooltip` renders with `visibility: hidden` and `OnboardingSpotlight` renders nothing — the step is effectively invisible even though it is technically the active step.

**Rendering location on the Help page**
- `src/pages/help/HelpPage.tsx` lines 241–245:
  ```tsx
  <div className="mt-4">
    <OnboardingToursSection key="onboarding-tours" />
  </div>
  ```
  This is rendered OUTSIDE the `sections.map()` grid. The comment at HelpPage line 103 states: _"Onboarding Tours section will be rendered separately (not part of the sections array since it has custom rendering)"_. This confirms a recent structural refactor.

**Condition evaluation engine (`startFlow`)**
- `src/store/onboarding.ts` lines 102–106:
  ```typescript
  const conditionResults = await Promise.all(
    flow.steps.map((step) => (step.condition ? step.condition() : Promise.resolve(true)))
  )
  const allowedSteps = flow.steps.filter((_, i) => conditionResults[i])
  ```
  Conditions are evaluated once, up-front, at the moment `startFlow` is called (typically on page load, before navigation to the Help page). Steps without a `condition` always resolve to `true`. The `onboarding-tours-section` step has no `condition`, so it will always appear in `allowedSteps`.

**`nextStep` skipping logic**
- `src/store/onboarding.ts` lines 152–191. Only `CodeExecution` and `Navigation` steps are silently advanced through. A `Highlight` step is never skipped by `nextStep`; it always causes `currentStepIndex` to be set and the function to return.

**Tooltip visibility gating**
- `src/components/Onboarding/OnboardingTooltip.tsx` lines 146–164:
  ```typescript
  const tooltipReady = !step.target || (targetElement !== null && isPositioned)
  // ...
  style={{ ...tooltipStyle, visibility: tooltipReady ? 'visible' : 'hidden' }}
  ```
  If `targetElement === null` (element not found in DOM), `tooltipReady` is `false` and the tooltip is `visibility: hidden`. The tooltip DOM node still exists, centered on the screen, with fully interactive buttons.

**Spotlight guard**
- `src/components/Onboarding/OnboardingSpotlight.tsx` line 69:
  ```typescript
  if (!position) return null
  ```
  If the target element is absent, no spotlight is rendered at all. The user sees only the dimmed full-screen backdrop with no visible tooltip and no highlight ring.

**`data-onboarding` attribute mapping in HelpPage**
- `src/pages/help/HelpPage.tsx` lines 207–220:
  ```typescript
  const getDataOnboardingAttribute = (title: string) => {
    switch (title) {
      case 'AI Help':          return 'help-ai-section'
      case 'Learning Resources': return 'help-learning-section'
      case 'Product Updates':  return 'help-updates-section'
      case 'Platform Policies': return 'help-policies-section'
      default:                 return ''
    }
  }
  ```
  There is NO case for `'Interactive Tours'`. This is intentional: `OnboardingToursSection` is rendered outside the `sections` loop and applies its own `data-onboarding` attribute directly. This is correct in the current code.

### Architecture and Layers Affected

| Layer | Component / File | Role in Bug |
|---|---|---|
| Config / Step Definition | `src/configs/onboarding/navigationIntroduction.tsx` | Defines step 18 and its DOM target |
| State / Store | `src/store/onboarding.ts` | `startFlow` filter; `nextStep` sequencing |
| UI — Overlay | `src/components/Onboarding/OnboardingOverlay.tsx` | Renders tooltip + spotlight per step |
| UI — Tooltip | `src/components/Onboarding/OnboardingTooltip.tsx` | Visibility guard when target is null |
| UI — Spotlight | `src/components/Onboarding/OnboardingSpotlight.tsx` | Position polling; null-guard on missing element |
| Page — Help | `src/pages/help/HelpPage.tsx` | Renders `OnboardingToursSection`; applies `data-onboarding` via `getDataOnboardingAttribute` |
| Component — Tours | `src/pages/help/components/OnboardingToursSection.tsx` | Holds `data-onboarding="help-onboarding-section"` anchor |

### Integration Points

- `onboardingStore` ← consumed by `OnboardingProvider`, `OnboardingOverlay`, `AutoPopupManager`, `OnboardingToursSection`, `OnboardingFlowCard`
- `[data-onboarding="help-onboarding-section"]` attribute — tight coupling between `navigationIntroduction.tsx` (string literal in `target`) and `OnboardingToursSection.tsx` (attribute on the `<section>` element). Any rename or removal of the attribute on either side breaks the step silently.
- `expand-profile-menu` CodeExecution step uses `document.querySelector('[data-onboarding="profile-button"]')` — DOM coupling to the Navigation component.
- `AutoPopupManager` (`src/components/appLevel/AutoPopupManager.tsx`) triggers `navigationIntroductionFlow` on first SSO user load via `onboardingStore.startFlow(NAVIGATION_INTRODUCTION_FLOW_ID)`.

### Patterns and Conventions

- Steps are classified as user-visible (`Modal` | `Highlight`) or technical (`CodeExecution` | `Navigation`) via the `isTechnicalStep` / `isUserVisibleStep` type guards in `src/types/onboarding.ts`.
- Technical steps are silently executed and never rendered in the overlay.
- Each `Highlight` step targets a DOM element via a CSS selector string or a callback function. The selector must match a `data-onboarding="<id>"` attribute on a live DOM element at the time the step is shown.
- Per-step `condition` callbacks are evaluated once at `startFlow` time, not at step-transition time. Conditions that depend on DOM state (e.g., `findNavLinkByText`, `userStore.user?.isAdmin`) will reflect the page's state at the moment the flow starts.
- `delay` on a step defers the `currentStepIndex` update; the overlay remains on the previous step's UI during the delay window.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No `.ai-run/guides/` directory found in the `codemie-ui` repository (the guides listed in `AGENTS.md` appear to describe the backend `codemie-dev01` repo, not the frontend). No `docs/` directory with architecture notes for the onboarding system was found.

Conventions were derived from code exploration.

### Architectural Decisions

- **Comment evidence of planned condition** — `// Step 18: Onboarding Tours Section (Conditional - future)` in `navigationIntroduction.tsx`. This is the only in-code note that flags this step as incomplete or in a transitional state. It was left when the step was added and signals that a `condition` callback was intended but not yet implemented.
- **`OnboardingToursSection` renders separately** — the comment in `HelpPage.tsx` ("Onboarding Tours section will be rendered separately") documents a deliberate refactor away from the `sections` array pattern. This refactor moved the `data-onboarding` attribute responsibility from `getDataOnboardingAttribute()` to the component itself.

### Derived Conventions

- All DOM anchor points for `Highlight` steps use the `data-onboarding="<id>"` attribute pattern.
- `HelpSection` returns `null` when `items.length === 0`, which means sections with no items do not emit their `data-onboarding` attribute. `OnboardingToursSection` unconditionally renders its attribute (flows are always populated).
- The step comment numbering in `navigationIntroduction.tsx` has a known inconsistency: after the `onboarding-tours-section` insertion, the inline comments jump from "Step 24: Administration Tab" directly to "Step 26: Navigation Expansion Control" (skipping 25), and the final completion step is re-numbered "Step 24: Completion" — a duplicate. This indicates the step was inserted after the original comment series was written, confirming it is a recent addition.

---

## 4. Testing Landscape

### Existing Coverage

- `src/store/__tests__/onboarding.restoreUrl.test.ts` — tests the URL restore behavior of `skipFlow` / `completeFlow`. Mocks the entire `@/configs/onboarding` module with two synthetic flows. Does NOT test the `navigationIntroductionFlow` step array or step sequencing.
- `src/pages/help/__tests__/HelpPage.test.tsx` — renders `HelpPage` and checks section visibility. Verifies "AI Help", "Learning Resources", "Product Updates", and "Platform Policies" sections. Does NOT check `OnboardingToursSection` rendering, the `data-onboarding="help-onboarding-section"` attribute, or the section's visibility when the onboarding flow is active.
- `src/pages/help/components/__tests__/HelpItem.test.tsx`, `HelpSection.test.tsx` — unit tests for the two sub-components; no onboarding-flow coverage.

### Testing Framework and Patterns

- Vitest + React Testing Library (from test file imports)
- Valtio stores are mocked by overriding `proxy` to return a plain object; `useSnapshot` is stubbed per-store
- `vi.hoisted` / `vi.mock` used extensively for store and router isolation

### Coverage Gaps

- **No test verifies the `navigationIntroductionFlow` step array**: specifically, that `onboarding-tours-section` exists, is in the correct position, has the correct `target`, and has no `condition`.
- **No test verifies that `OnboardingToursSection` renders `data-onboarding="help-onboarding-section"`** when `flows.length > 0`.
- **No integration test walks the step sequence**: there is no test that calls `nextStep()` from `product-updates-section` and asserts that the subsequent active step is `onboarding-tours-section` (not `profile-section`).
- **`OnboardingTooltip` visibility gating is untested**: no test checks that `visibility: hidden` is applied when the target element is absent.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables directly gate the onboarding flow or the `onboarding-tours-section` step. `import.meta.env.BASE_URL` is used only in `maybeRestoreEntryUrl` (URL restore logic, not step sequencing).

### Configuration Files

- `src/store/onboarding.ts` imports the six flow configs statically. The `flows` constant is a module-level array (`const flows: OnboardingFlow[] = [...]`) that is never empty after module initialization.
- `src/store/appInfo.ts` provides `isOnboardingCompleted()` / `completeOnboarding()` — the flow's `onComplete` calls `appInfoStore.completeOnboarding()`. This writes to localStorage and controls whether the P1 auto-popup fires again.

### Feature Flags and Deployment Concerns

- No feature flags gate the `onboarding-tours-section` step or the `navigationIntroductionFlow`.
- The `isEnterpriseEdition()` utility gates only the `spending-card` step (step 21), not step 18.
- `userStore.user?.isAdmin` gates only the `administration-tab` step (step 24), not step 18.

---

## 6. Risk Indicators

- **`[data-onboarding="help-onboarding-section"]` is a fragile coupling** — the attribute string is a plain string literal in two separate files with no shared constant. If `OnboardingToursSection.tsx` is renamed, refactored, or the attribute is removed/renamed, the step silently degrades to an invisible Highlight with a hidden tooltip and no spotlight. This is the primary failure mode.

- **Root cause in current code: step 18 is technically correct but recently added** — the comment `(Conditional - future)` and the broken comment-numbering sequence (duplicate "Step 24", jump from 24 to 26) confirm the `onboarding-tours-section` step was inserted into an already-complete flow definition. The `data-onboarding="help-onboarding-section"` attribute on `OnboardingToursSection` was added as the matching DOM anchor. If the attribute addition and the step addition were not deployed atomically — specifically if the step was deployed without the matching DOM attribute — users would see an invisible Highlight step (dark overlay only, no tooltip, no spotlight) and could advance past it by clicking the hidden "Next" button centered on screen.

- **Silent degradation with invisible step** — when the target element is not found, `OnboardingTooltip` renders `visibility: hidden` at `position: fixed; top: 50%; left: 50%`. The "Next" button is invisible but fully interactive. A user can inadvertently click it or advance via `ArrowRight` keyboard shortcut, making the step appear to have been "skipped" while it was technically the active step.

- **No condition guard for DOM readiness** — the step has a `delay: 300` but no `condition` to verify that `[data-onboarding="help-onboarding-section"]` is present in the DOM before the step is activated. A `condition: () => !!document.querySelector('[data-onboarding="help-onboarding-section"]')` would guard against silent invisible-step situations, but the comment `(Conditional - future)` suggests this was deferred.

- **300ms delay window is a potential double-advance trigger** — during the 300ms delay after the user clicks "Next" from `product-updates-section`, `currentStepIndex` has not been updated yet. A second `nextStep()` call within this window (e.g., double-click, keyboard `ArrowRight`) would start a second coroutine from the same `product-updates-section` index. Both coroutines would land on `onboarding-tours-section` independently. However, in a pathological sequence (three rapid Next triggers), after the first two set `currentStepIndex` to `onboarding-tours-section`, a third trigger would advance to `profile-section` immediately, effectively skipping step 18's visible duration.

- **No `OnboardingToursSection` render test in `HelpPage.test.tsx`** — the test verifies sections at heading level but does not assert the presence of `data-onboarding="help-onboarding-section"` in the rendered DOM, leaving no regression guard for future refactors.

- **`getDataOnboardingAttribute` has no case for onboarding tours** — intentional, but undocumented. A future developer adding `OnboardingToursSection` back to the sections array would get `data-onboarding=""` (empty string from `default` case), silently breaking the step.

- **Comment numbering mismatch in `navigationIntroduction.tsx`** — inline comments label the navigation expansion step as "Step 26" and the final completion modal as "Step 24" (second use). This is a maintenance risk: it signals the step was added hastily without updating all inline numbering.

---

## 7. Summary for Complexity Assessment

The bug lives in the intersection of `src/configs/onboarding/navigationIntroduction.tsx` (step definition) and `src/pages/help/components/OnboardingToursSection.tsx` (DOM anchor). The `onboarding-tours-section` Highlight step exists in the flow at the correct position and has no condition filter that would exclude it from `allowedSteps`. The DOM target `[data-onboarding="help-onboarding-section"]` is present on `OnboardingToursSection`. However, the most probable root cause of the reported bug is a non-atomic deployment: the step and its matching DOM attribute were added at separate times, so in the test environment the step may exist without its target element, or vice versa. When the target is absent, the step is active but completely invisible — the `OnboardingTooltip` is `visibility: hidden` and `OnboardingSpotlight` returns null — leaving only the dark backdrop. Users can advance through the invisible step via the hidden "Next" button or the `ArrowRight` keyboard shortcut, directly activating `expand-profile-menu` (CodeExecution, silent) then `profile-section` ("Your Profile & Settings").

The fix is confined to two files: `navigationIntroduction.tsx` (add a DOM-presence condition or ensure the step is in sync with the component) and `OnboardingToursSection.tsx` (ensure the `data-onboarding="help-onboarding-section"` attribute is always present and stable). No routing changes, no store logic changes, and no new architectural patterns are required. The `delay: 300` on the step should be reviewed since it creates a window where rapid user input can interact with the wrong step index.

Test coverage for this scenario is minimal: no existing test walks the `nextStep` sequence from `product-updates-section` to `onboarding-tours-section`, and no test asserts the `data-onboarding` attribute on `OnboardingToursSection`. Adding a step-sequence unit test in the store and a render attribute test for `OnboardingToursSection` would prevent regression. Overall complexity is low (1–2 file changes, no new patterns), but the invisible-step failure mode is a medium-risk UX defect because it silently degrades without any error log.
