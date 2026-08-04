# Plan: EPMCDME-11360 — Fix Onboarding Tours step skip

## Requirements

**Bug**: During the onboarding flow, the "Onboarding Tours" step (step 18) is silently skipped and "Your Profile & Settings" (step 19) appears instead.

**Root cause**: The `delay: 300` on step 18 creates a window where the overlay appears frozen (still showing step 17's content). After the delay resolves, step 18 becomes active but the tooltip is briefly `visibility: hidden` while Floating UI computes its position (~1-2 frames). Total invisible window ≈ 300-800ms. A user who double-clicks Next during this window triggers a second concurrent `nextStep()` call. The second call sees `currentStepIndex` already at step 18 (set by the first call) and immediately advances to step 19, bypassing step 18 entirely. The store has no guard against concurrent `nextStep()` / `prevStep()` calls.

**Acceptance criteria**:
- `onboarding-tours-section` step appears at the correct position in the flow and is not skipped.
- `profile-section` ("Your Profile & Settings") does not replace it.
- A rapid double-click on Next cannot skip any step.
- Step order matches the designed flow.

---

## Tasks

### T1 — Add `isTransitioning` guard to `nextStep()` and `prevStep()` in onboarding store

**File**: `src/store/onboarding.ts`

**What**: Add `isTransitioning: boolean` to the store proxy. At the start of `nextStep()` and `prevStep()`, if `isTransitioning` is `true`, return immediately (no-op). Otherwise set to `true`, run the existing logic, then reset to `false`. Also reset in `stopFlow()`, `skipFlow()`, and `completeFlow()` to guard against edge-case state leaks.

**Test-first**: yes — write a test in `src/store/__tests__/onboarding.restoreUrl.test.ts` (or a new sibling file) that:
1. Starts a synthetic flow with a step that has a `delay`.
2. Calls `nextStep()` twice concurrently (without awaiting the first).
3. Asserts `currentStepIndex` ends at 1 (the delayed step), NOT 2.

### T2 — Remove stale `delay: 300` from step 18 in navigationIntroduction.tsx

**File**: `src/configs/onboarding/navigationIntroduction.tsx`

**What**: Remove the `delay: 300` property from the `onboarding-tours-section` step. The Help page has been rendered since step 14 (`navigate-to-help` tech step), so `OnboardingToursSection` and its `data-onboarding="help-onboarding-section"` attribute are present in the DOM before step 18 fires. The delay is vestigial (left from a "Conditional - future" note that was never completed). Also update the stale inline comment from `// Step 18: Onboarding Tours Section (Conditional - future)` to `// Step 18: Onboarding Tours Section`.

**Test-first**: no — this is a config change. The T1 step-sequence test covers the resulting correct behavior.

### T3 — Add step-sequence regression test

**File**: `src/store/__tests__/onboarding.stepSequence.test.ts` (new file)

**What**: Using the real `navigationIntroductionFlow` (not a mock), assert that:
1. `nextStep()` from `product-updates-section` reaches `onboarding-tours-section` as the next user-visible step (not `profile-section`).
2. The `allowedSteps` array built by `startFlow` includes `onboarding-tours-section` at an index between `product-updates-section` and `profile-section`.

**Test-first**: yes — write the failing test first (fails because currently step 18 is skippable via race), then T1 + T2 make it pass.

### T4 — Add `data-onboarding` attribute regression test for OnboardingToursSection

**File**: `src/pages/help/components/__tests__/OnboardingToursSection.test.tsx` (new file)

**What**: Render `OnboardingToursSection` with a mocked `onboardingStore.getAllFlows()` returning 1+ flows. Assert that `data-onboarding="help-onboarding-section"` is present on the rendered `<section>` element. This pins the attribute so a future refactor can't silently remove it.

**Test-first**: yes — write the test first (it may already pass or fail depending on mock setup), implement only if needed.
