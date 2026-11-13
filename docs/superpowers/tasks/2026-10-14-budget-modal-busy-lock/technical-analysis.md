# Technical Research

**Task**: budget popup modal dialog
**Generated**: 2026-10-14
**Research path**: codegraph

**Update 2026-10-19 — RUN-2:** This document records the original research. The root-level `aria-busy` and conditional status insertion described below are superseded by the revised task plan: Popup now marks only its content busy and keeps a persistent status output in the default footer, outside the busy subtree. This allows reassurance to be announced during saving. The dismissal lock and five-second delay are unchanged; screen-reader interoperability still requires manual verification.

---

## 1. Original Context

"Review docs/superpowers/plans/2026-10-14-budget-modal-busy-lock.md and implement this. Proceed with the dirty state of this branch." The referenced plan (read it in full — it is the requirements source) describes: while a budget save is in flight, keep the user in the Update/Create Budget dialog (UnifiedProjectBudgetModal). Add `busy` (and optional `busyHint`) prop to the shared `Popup` component, guarding the single onHide funnel (Cancel, X, Escape, backdrop), set aria-busy, loading state on submit button, keep focus inside; `busy` defaults to false so existing Popup callers are unchanged. UnifiedProjectBudgetModal passes busy={submitting}, switches submit label to `Updating…`/`Creating…`, disables form fields via <fieldset>, shows hint `Large projects can take a little longer to save.` after 5000 ms. Ticket: EPMCDME-14996 (branch EPMCDME-14996_lock-budget-dialog).
Please also validate the plan against the current code: flag anything in the plan that no longer matches the source (prop names, file paths, existing tests, PrimeReact Dialog behaviour, Popup callers).

---

## 2. Codebase Findings

### Existing Implementations
- `src/components/Popup/Popup.tsx` (265 lines) — wraps PrimeReact `Dialog`. No `busy`/`busyHint` today. React import (l.17) is `React, { ReactNode, useEffect, useId, useRef }`. `useFocusTrap(dialogContainerRef, visible ?? false)` at l.93. Custom Escape `useEffect` l.99–109 (fires only when `hideClose`, topmost, visible; deps `[visible, onHide, hideClose, isTopmost]`). `dialogRef` at l.111. Default footer l.171–184: wrapper `flex justify-end gap-4`, Cancel `onClick={onHide}`, submit `disabled={submitDisabled}`. `<Dialog onHide={onHide}>` l.195. `pt.root` has `aria-labelledby`/`aria-describedby`; `pt.content` already sets `tabIndex: -1`; no `pt.closeButton` entry.
- `src/components/Button/Button.tsx` (imported as `CustomButton`) — already has `isLoading`: DOM `disabled={disabled || isLoading}`, `opacity-50` keyed on the `disabled` prop only, `cursor-wait` plus a shimmer overlay on `isLoading`.
- `src/pages/settings/administration/components/UnifiedProjectBudgetModal.tsx` (682 lines) — `submitting` state l.126; `useRef` already imported. `onFormSubmit` l.383–461: guard `if (hasSoftError || sumPctError) return`, `setSubmitting(true)`; the chargeback `catch` calls `setSubmitting(false)` then returns (l.407–408); the budget write's `finally` calls `setSubmitting(false)` (l.459). `isEditMode = !forceCreate` l.467. `<Popup>` l.475–485 with `submitDisabled={submitting || dataLoading || hasSoftError || sumPctError}`. `<form className="space-y-4">` l.489–667.
- The form's children and how each reacts to `<fieldset disabled>`:
  - `Input` and `Textarea`: native controls, so the fieldset disables them.
  - `Select` (Reset Period): a PrimeReact `Dropdown` built from divs. It is gated by its own `disabled` prop.
  - `UserEmailAutocomplete`: PrimeReact AutoComplete with a native input.
  - `Checkbox`: PrimeCheckbox with a native input. Its opacity styling comes from the `disabled` prop only.
  - Native `Button` "Reset to Default".
  - `UnifiedBudgetDragBar`: pointer handlers on divs.
  - `BudgetCategoryTable`: `BudgetAmountInput` with `ariaLabel`.
  - `ChargebackSettings`.

### Architecture and Layers Affected
- Shared component layer: `src/components/Popup/` (Popup.tsx, `index.ts` bare re-export, `useTopmostDialog.ts`).
- Page layer: `src/pages/settings/administration/components/UnifiedProjectBudgetModal.tsx`. It is rendered 3 times from `src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx`.

### Integration Points
- PrimeReact 10.9.5 `Dialog` (`node_modules/primereact/dialog/dialog.esm.js`):
  - Close button `onClick: onClose` → `props.onHide(event)`.
  - Built-in Escape uses `useGlobalOnEscapeKey` → `onClose`, and is active only when `closable && closeOnEscape`. That is why `hideClose` dialogs need Popup's own handler.
  - Mask `onPointerUp` → `onClose` when `dismissableMask && modal && target === mask && !pointerRef.current`. `pointerRef` is set by `pointerdown` on the dialog.
  - Result: all four dismissal paths reach the Dialog `onHide` prop, plus Popup's own Escape handler and the Cancel button.
  - The `ptm('closeButton')` pass-through key exists. It is merged with `mergeProps`, so a pt `className` or `aria-disabled` does not replace `onClick`.
  - The ref exposes `getContent()`, `getElement()`, `getCloseButton()` and `getMask()`. The close button's aria-label is "Close".
- Stores used by the modal: `projectsStore.updateProject` (chargeback, written first), then `projectBudgetsStore.updateProjectBudgetGroup` or `createProjectBudgetGroup`.
- `ModalAnnouncerHost` inside Popup is a plain `sr-only` div with no role. In the app, `ToasterAnnouncer` portals its live region into it.

### Patterns and Conventions
- All modals go through `Popup` (`.ai-run/guides/patterns/modal-patterns.md`, which forbids using `Dialog` directly).
- Popup callers are numerous (more than 70 files; codegraph caps the listing). Examples: `BudgetModal.tsx`, `CreateUserPopup.tsx`, `NewIntegrationPopup.tsx`, `ChangeRolePopup.tsx`, `EditIndexPopup.tsx` (`hideFooter`, `dismissableMask={false}`). Many callers disable only submit via `isSubmitting`.
- The 4 follow-up files named in the plan all exist at the stated paths.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/patterns/modal-patterns.md` — the Popup props reference. It lists `submitDisabled` and others; it has no busy or loading prop. Pattern 2 shows a custom footer with a `Saving…` label as the current way to show loading.
- `.ai-run/guides/testing/testing-patterns.md` and `local-verification.md` exist and are referenced by the plan.

### Architectural Decisions
- Popup comment l.113–116: `focusOnShow` stays false on purpose, to avoid a double focus trap with `useFocusTrap`.
- Modal comment l.388–391: the save order fails fast with no rollback (chargeback first, then budget).

### Derived Conventions
- EPAM Apache-2.0 license header on every new `.ts`/`.tsx` file.
- Unit tests sit next to the code in `__tests__/`. Popup is mocked in page-level modal tests.

---

## 4. Testing Landscape

### Existing Coverage
- `src/components/Popup/__tests__/Popup.test.tsx` covers:
  - render, submit, disabled submit, Cancel → onHide, Escape → onHide, custom text, hideFooter, hideClose, headerContent, footerContent and className;
  - focus management (focus goes to Close on open, restore to the trigger, stacked dialogs);
  - stacked-dialog Escape and the focus trap.
  - It has no backdrop test. `let user` is module-level and the imports have no `act` or `afterEach`.
- `src/pages/settings/administration/components/__tests__/UnifiedProjectBudgetModal.chargeback.test.tsx` — 9 tests. It mocks `@/components/Popup` (renders only submit; ignores `busy`, `onHide` and Cancel), the feature-flag hooks, the stores, the toaster, DragBar and CategoryTable. The "stops at a failed chargeback save" test asserts `getByRole('button', { name: 'Update Budget' })` after the failure.
- `UserEmailAutocomplete`, `Checkbox` and `Autocomplete` each have their own tests.

### Testing Framework and Patterns
- Vitest, React Testing Library and `@testing-library/user-event`. Projects `unit` and `integration` (`npm run test:unit`). Gates: `npm run typecheck` (`tsc --noEmit`) and `npm run lint`. Both scripts exist.

### Coverage Gaps
- No test exercises the modal while a save is in flight, or a double submit.
- No Popup test covers a backdrop dismissal.
- `UnifiedBudgetDragBar` and `BudgetCategoryTable` have no direct tests found.

---

## 5. Configuration and Environment

### Environment Variables
- None relevant to this feature area.

### Configuration Files
- `vite.config.ts` (`test.projects`, `maxWorkers`, `CI_COVERAGE_TEST_TIMEOUT_MS`). The working tree also has an unrelated modified file, `.codemie/codemie-cli.config.json`.

### Feature Flags and Deployment Concerns
- The modal reads `useProjectChargebackEnabled`, `useFeatureFlag('features:costCenters')`, `useBudgetSoftLimitNotificationEnabled` and `useBudgetSoftLimitEmailEnabled`. The chargeback write happens only when the chargeback flag is on **and** `canManageBudgets` is true.

---

## 6. Risk Indicators

Where the plan does not match the source:
- **Ticket and branch:** the plan says `EPMCDME-XXXX` and branch `EPMCDME-XXXX_budget-modal-busy-lock`. The actual values are `EPMCDME-14996` and `EPMCDME-14996_lock-budget-dialog`. Every commit message in the plan needs the real key.
- **Task 2 Step 5 overclaims.** The chargeback test does not show that `submittingRef` is reset. It never submits a second time. It only checks the `Update Budget` label afterwards, which proves the `submitting` *state* was reset (the label is derived from it), not the ref. A missing `submittingRef.current = false` in the chargeback `catch` would pass every planned test.
- **Fieldset coverage.** Task 3 Step 5 names the DragBar and CategoryTable.
  - `BudgetCategoryTable` uses `BudgetAmountInput`, which is probably native and so likely covered by the fieldset.
  - The plan misses the **Reset Period `Select`**. It is a PrimeReact `Dropdown` made of divs, gated only by its own `disabled` prop, so `<fieldset disabled>` will probably not stop it from opening or changing.
  - `UnifiedBudgetDragBar` uses pointer events on divs and will stay draggable.
  - `Checkbox` will lose input but keep its enabled styling, because its opacity comes from the `disabled` prop.
- **Default footer markup changes for every caller.** The wrapper goes from `flex justify-end gap-4` to `flex w-full items-center justify-end gap-4`. Behaviour is unchanged when `busy=false`, but the DOM and classes change for every Popup that uses the default footer.

Other risks:
- **Possible flake in the double-submit test** (plan Task 2 test 3). It calls `getByRole('button', { name: 'Updating…' })` synchronously right after `await userEvent.click`. RHF `handleSubmit` with `yupResolver` validates asynchronously, so `setSubmitting(true)` may not have rendered yet. `findByRole` would be safer.
- **Label is driven by `forceCreate`, not by whether a group exists.** `isEditMode = !forceCreate`, so a project with no group and `forceCreate=false` shows "Update Budget" / "Updating…" while it creates. This is existing behaviour, and the plan keeps it.
- **Focus-on-busy effect when `busy` is already true at mount.** If `busy` starts true before PrimeReact mounts the content (`maskVisibleState` is set in an effect), `getContent()` may be null and the effect will not run again. The planned test toggles idle → busy, so it would not catch this.
- **Backdrop control test.** It depends on the mask carrying `.p-dialog-mask` in styled mode, and on no `pointerdown` having reached the dialog first (`pointerRef`).
- **Two polite live regions in the app.** With `ToasterAnnouncer` mounted, the dialog holds both its live region and the new `role="status"` hint. Popup unit tests do not mount the announcer, so `getByRole('status')` stays unique there.
- Speculative: `.ai-run/guides/patterns/modal-patterns.md` § Popup Props Reference would not list `busy`/`busyHint` until someone updates it.

---

## 7. Summary for Complexity Assessment

Two layers are touched: the shared `Popup` (`src/components/Popup/Popup.tsx` and its test) and one page modal (`UnifiedProjectBudgetModal.tsx`, plus one new test file). That is four files, matching the plan's File Structure. Every path, line range, prop name and hook the plan references is present in the current source:
- `submitting`, `setSubmitting` and both reset sites;
- `useFocusTrap`, the `hideClose` Escape effect and `dialogRef`;
- `CustomButton.isLoading`;
- the chargeback test's Popup mock.

PrimeReact 10.9.5 behaves as the plan assumes. Close icon, built-in Escape and backdrop all call the Dialog `onHide` prop. The `hideClose` Escape path goes through Popup's own handler. `pt.closeButton` is a valid merge key. `getContent()` returns a node that is already focusable (`tabIndex: -1`).

The change is low in novelty: one guard callback, a timer effect and a focus effect in Popup, plus a re-entry ref, label switching and a fieldset in the modal. The main hazard is how widely Popup is used. There are many callers (more than 70 files). `busy` defaults to false and keeps behaviour identical, but the default footer wrapper's classes change for all of them. Existing Popup tests should still pass because none sets `busy`.

Test coverage is reasonable. Popup has a broad unit suite and the modal has a chargeback suite with a mocked Popup. The gaps are the in-flight state and the backdrop path, and the plan adds tests for both.

Points needing attention:
- the ticket key and branch name in the plan are stale;
- the plan wrongly claims the existing test proves the ref is reset;
- the Reset Period `Select` and the drag bar will probably stay interactive despite the fieldset;
- the double-submit test may race against RHF's async validation.

---

## 8. External References

- `docs/superpowers/plans/2026-10-14-budget-modal-busy-lock.md` — resolved, read in full (untracked file on the branch). Key facts:
  - Exact copy: `Updating…` / `Creating…`, `Large projects can take a little longer to save.`, and `BUSY_HINT_DELAY_MS = 5000`, exported from `Popup.tsx`.
  - New Popup props: `busy?: boolean` and `busyHint?: ReactNode`.
  - Guard: `handleHide = useCallback(() => { if (busy) return; onHide() }, [busy, onHide])`. It replaces `onHide` in the Escape effect, on Cancel and on `<Dialog onHide>`.
  - `pt.root['aria-busy'] = busy || undefined`, and `pt.closeButton = { 'aria-disabled': busy || undefined, className: cn(busy && 'opacity-50 cursor-not-allowed') }`.
  - Footer: Cancel `disabled={busy}`, submit `isLoading={busy}`, and the hint as `<p role="status">` once `showBusyHint` is true.
  - Focus effect: `if (busy && visible) dialogRef.current?.getContent()?.focus()`.
  - Modal: a `submittingRef` re-entry guard reset next to both `setSubmitting(false)` calls; `submitDisabled={dataLoading || hasSoftError || sumPctError}` (drops `submitting`); `busy={submitting}`; the `busyHint` string; and `<fieldset disabled={submitting} className="m-0 min-w-0 space-y-4 border-0 p-0">` inside a `<form>` that loses its `space-y-4`.
  - Tests: 11 new tests in a `Popup — busy` describe block, and 3 tests in the new `UnifiedProjectBudgetModal.busy.test.tsx`.
  - Gates: `npm ci`, `npm run typecheck`, `npm run lint`, `npx vitest run --project unit src/components/Popup src/pages/settings/administration/components`, then a browser check.
  - Out of scope: follow-up adoption in the 4 named popups.
