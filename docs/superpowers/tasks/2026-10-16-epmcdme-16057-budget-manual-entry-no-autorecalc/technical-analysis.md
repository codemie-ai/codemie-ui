# Technical Research

**Task**: budget distribution allocation validation
**Generated**: 2026-10-16
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16057 (Bug, Major): Budget distribution: manual value entry in Platform/CLI/Premium fields auto-recalculates other fields

Description: When a numeric value is typed into the Platform, CLI, or Premium budget fields, the system automatically recalculates the other fields so that the total always equals a fixed sum (e.g., 1000). This produces confusing and unexpected results. For example, setting one field to 0 causes another field to jump to 100. Drag-and-drop should remain the primary input method. Typed values should not be overwritten automatically.

Preconditions: The user can create or edit a project budget (Create Budget / Update Budget popup). The budget form shows the Distribution bar with Platform, CLI, and Premium Models fields.

Steps to Reproduce: 1. Open the Create Budget or Update Budget popup. 2. Set a Total Budget with a fixed total (e.g., 1000). 3. Type a numeric value into one of the Platform, CLI, or Premium fields (for example, enter 0). 4. Observe the values of the other two fields.

Expected Result: Typing a value changes only that field. The other fields are not recalculated. If the category total is under or over the limit, the user sees a warning, and no values are changed automatically.

Actual Result: The other fields are recalculated automatically to keep the total at the fixed sum. For example, setting one field to 0 makes another field jump to 100.

Affected Areas: Create Budget / Update Budget popup (Distribution bar); Platform, CLI, and Premium Models allocation inputs; Drag-and-drop allocation slider; Budget form validation.

Acceptance Criteria:
1. Typing a value into the Platform, CLI, or Premium field does not change the values of the other category fields.
2. Setting any category field to 0 does not change the other category fields.
3. Drag-and-drop remains available as the primary way to redistribute the allocation.
4. When the category total is under or over the limit, a validation warning is shown.
5. No value is corrected automatically. The user must correct the values manually.
6. The Platform Hard Limit minimum from EPMCDME-16015 still applies when this change is implemented.

---

## 2. Codebase Findings

### Existing Implementations
All under `src/pages/settings/administration/components/`:
- `UnifiedProjectBudgetModal.tsx` (683 lines): the Create/Update Budget popup. State: `pcts: PctMap` (percent per category, the source of truth), `softs: PctMap` (soft limits in dollars). `hardVals` is derived as `totalBudget * pcts[cat] / 100`.
  - **Root cause: `onHardInputChange` (L347-372).** A typed Hard Limit (in dollars) becomes `requestedPct`, and then a peer category is cascaded so the sum stays 100%:
    - Platform: `platform = clamp(req, PLATFORM_MIN_PCT, 100 - premium)`, then `cli = 100 - platform - premium`.
    - CLI: `cli = clamp(req, 0, 100 - platform)`, then `premium = 100 - platform - cli`.
    - Premium: `premium = clamp(req, 0, 100 - platform)`, then `cli = 100 - platform - premium`.
    The ticket's "jump to 100" example is accurate. With Platform at 0% (legacy data) and CLI typed as 0, Premium becomes 100%. With default data, typing CLI 0 makes Premium 70%. The comment at L351-352 says the cascade "matches the v3-mockup intent", so the behaviour was deliberate.
  - The typed value is also clamped to `100 - <peer>` (an upper bound), so the "over the limit" state cannot currently be reached by typing.
  - `sumPctError` (L206-207): `|round2(p)+round2(c)+round2(pm) - 100| > 0.5`. It renders "Distribution must sum to 100% (currently N%)" under the bar (L638-643) and disables submit (L483) and `onFormSubmit` (L386). Because of the cascade, today it can only fire on loaded legacy data. The message does not distinguish under from over.
  - Soft-rescale effect (L296-329): whenever a category's hard limit changes, its soft limit is rescaled proportionally (prev-hards snapshot, or `interactionInitRef` during drag or Total typing). It currently also fires for the cascaded peer.
  - `populateFromGroup` (L229-235) normalizes the loaded pcts to sum to 100. `handleDefaultDistribution` resets to `DEFAULT_PCTS` {30,60,10}.
  - `PLATFORM_MIN_PCT = 0.01` (L59), from EPMCDME-16015.
- `UnifiedBudgetDragBar.tsx` (432 lines): a two-handle slider. Handle 1 sets `platform = clamp(pct, platformMinPct, 100 - premium)` and `cli = 100 - platform - premium`. Handle 2 moves the CLI/Premium boundary. Every drag therefore rewrites the moved pair so the sum returns to 100. Band widths use CSS `flex: pct`, so they are relative: a sum other than 100 still fills the bar.
- `BudgetCategoryTable.tsx`: a 3x3 grid of `BudgetAmountInput` for Hard and Soft per category. Platform Hard uses `strictPositive`. Each column already shows its own "Exceeds hard limit" error for soft limits.
- `BudgetAmountInput.tsx`: keeps a draft while focused and commits on blur or Enter. With `strictPositive` (Platform), 0, negative and empty input are rejected and the field reverts to the prior value (16015). After a commit the field always re-displays the value derived from the prop.

### Architecture and Layers Affected
- UI component layer only: the modal's state logic, the category table and validation messaging. No store or API change is visible. `projectBudgetsStore.create/updateProjectBudgetGroup` sends `categories: {cat: {pct, soft_budget}}` unchanged.
- Consumer: `projectsManagement/ProjectBudgetsSection.tsx` (L380) renders the modal with `distributionOnly`.

### Integration Points
- Backend `codemie/src/codemie/service/budget/project_budget_service.py` L1780-1805 validates the request. Each pct must be finite and between 0 and 100. Platform pct must be > 0. The sum must equal 100 within `PCT_SUM_TOLERANCE = 0.5`, otherwise it returns 400 "Category percentages must sum to 100". The frontend tolerance matches. The server already rejects a non-100 distribution, so no backend change is needed for blocking.
- Models: `codemie/src/codemie/rest_api/models/project_budget.py` (`CategoryBudgetSpec`, `CategoryBudgetSpecUpdate`).

### Patterns and Conventions
- react-hook-form + Yup cover the scalar fields only. Distribution validation is computed ad hoc (`sumPctError`, `softErrors`) and gates submit through `submitDisabled`.
- Error text style: `text-xs text-failed-secondary`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (forms: `patterns/form-patterns.md`, testing: `testing/testing-patterns.md`). No guide covers budget distribution.

### Architectural Decisions
- The EPMCDME-16015 spec (`docs/superpowers/tasks/2026-10-15-epmcdme-16015-frontend/spec.md`) defines the Platform minimum:
  - Platform must be > 0. A positive value whose share is below 0.01% is raised to 0.01%.
  - Legacy groups with Platform at 0 render and save unchanged.
  - The spec says "No new validation message, inline error, or submit-button gating for the Platform minimum."
- The inline comment at L351 records the cascade as the intent of the v3 mockup. This ticket reverses that decision.

### Derived Conventions
Validation is shown as inline red text and blocks submit. There are no toasts for form validation.

---

## 4. Testing Landscape

### Existing Coverage
- `components/__tests__/UnifiedProjectBudgetModal.platformMin.test.tsx`: Platform minimum, drag, typed edits and legacy Platform-0. Several cases type one Hard field, then save and assert the payload. They pass only because the cascade keeps the sum at 100:
  - "raises a sub-minimum positive Platform amount": Platform becomes 0.01%, sum 70.01.
  - "accepts a $1 Platform hard limit as 0.1%"
  - "still allows 0 for CLI hard": sum 40.
  - "still allows 0 for Premium hard and every soft limit": sum 90.
- `components/__tests__/UnifiedProjectBudgetModal.chargeback.test.tsx`: chargeback save order.
- `components/__tests__/BudgetAmountInput.test.tsx`: commit and revert rules.
- `projectsManagement/__tests__/ProjectBudgetsSection.test.tsx`: section-level tests.

### Testing Framework and Patterns
Vitest + React Testing Library + `userEvent`. Tests mock `@/store/projectBudgets`, `@/hooks/useFeatureFlags` and `@/components/Popup`. Inputs are found by aria-label (`"<Category> hard limit"`). Drag is simulated with a mocked `getBoundingClientRect` plus mouseDown/Move/Up.

### Coverage Gaps
- No test asserts the cascade itself, i.e. that the other fields stay unchanged or are recalculated.
- No test covers `sumPctError` messaging or submit gating.
- No test covers soft-limit rescaling after a typed hard edit.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
No flag gates the distribution. Flags in the modal cover only chargeback, cost centers and notifications. No deployment concerns.

---

## 6. Risk Indicators

- Speculative: removing the cascade lets the distribution leave 100% after any single typed edit. Submit stays blocked until the user fixes it, as the backend requires. The four platformMin tests listed in Section 4 will then fail at `save()` and need rewriting to type compensating values.
- The upper clamps (`100 - peer`) in `onHardInputChange` are auto-corrections. AC5 ("no value corrected automatically") and AC4 ("over the limit") imply removing them. Speculative: an upper bound of 100% per category (the backend `pct <= 100`) may still be needed.
- Conflict between AC5 and AC6: the 16015 rules are themselves corrections. Platform 0 or empty reverts the field, and a sub-0.01% value is raised to 0.01%. AC6 keeps them, so the spec must state this exception.
- Speculative: the soft-rescale effect (L296-329) will still change the typed category's own Soft Limit when its Hard changes. Whether that counts as "auto-correction" under AC5 is unresolved. The cascaded-peer rescale disappears with the cascade.
- Drag after an unbalanced typed state: handle formulas recompute a peer as `100 - others`, so the first drag snaps the sum back to 100. This probably fits AC3, but the bar's relative `flex` widths display a non-100 sum misleadingly. Labels show raw %.
- `sumPctError` message uses `Math.round(sum)` but the condition uses round2 with 0.5 tolerance. Under and over are not differentiated (AC4 wording). The message is also labelled in % while the inputs are in $.
- The ticket says "fields total a fixed sum (e.g., 1000)". In the code the invariant is the 100% percentage sum, and the Hard values in $ are derived from it.

---

## 7. Summary for Complexity Assessment

The fix is confined to the UI component layer of `codemie-ui`, mainly `UnifiedProjectBudgetModal.tsx`. The bug is the cascade in `onHardInputChange` (L347-372): each typed Hard Limit recomputes a peer category (CLI or Premium) so the sum stays 100%, and the typed value is clamped against its peers. Validation for an unbalanced distribution already exists (`sumPctError`, an inline message and submit gating). The backend already rejects sums outside 100 ±0.5%, so no API or backend change is indicated. `UnifiedBudgetDragBar.tsx` is probably unchanged. `BudgetCategoryTable.tsx` may be touched if per-field or under/over messaging is added.

Technical novelty is low; the work is mostly removing logic. The subtleties are:
- the interplay with the soft-limit rescale effect and its ref snapshots;
- keeping the EPMCDME-16015 Platform-minimum behaviour (AC6), which is itself an auto-correction and in tension with AC5;
- how a drag behaves after the user has left the sum away from 100.

Test posture is moderate. Two modal test files exist, but four platformMin cases implicitly depend on the cascade and will break. No test covers the cascade, the sum warning or soft rescaling on typed edits, so new tests are needed for AC1, AC2, AC4 and AC5. Expected change surface: 1-2 source files and 1-2 test files.

---

## 8. External References

None named by the task.
