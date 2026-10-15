# Technical Research

**Task**: project budgets budget allocation slider platform budget hard limit soft limit validation create update budget modal administration projects
**Generated**: 2026-10-15
**Research path**: codegraph

---

## 1. Original Context

Project budgets create/update budget functionality. Platform budget Hard Limit must always be > 0 on UI (both Input and Budget allocation slider/distribution bar) and rejected by backend when 0 on create/update. Legacy projects with Platform budget 0 must still render without breaking; validation applies only when they update the budget. Restriction applies only to Platform budget Hard Limit; Soft limit may remain 0; CLI and Premium Models categories are unaffected. UI location: /settings/administration/projects/<project> — "Create Budget" and "Update Budget" popups. Both popups have: Name, Reset Period, Description, Total Budget ($), a DISTRIBUTION bar (Platform / CLI / Premium Models percentages, "Reset to Default"), and per-category Hard Limit ($) and Soft Limit ($) inputs for Platform, CLI, Premium Models.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/settings/administration/components/UnifiedProjectBudgetModal.tsx` — the "Create Budget"/"Update Budget" popup (header/submit text switch on `forceCreate`; `isEditMode = !forceCreate`). Holds state `pcts` (PctMap, percent per category) and `softs` (PctMap, dollars). Hard limit dollars are derived, not stored: `hardVals[cat] = totalBudget * pcts[cat] / 100` (L185). Key spots:
  - `DEFAULT_PCTS = {platform:30, cli:60, premium_models:10}`, `ZERO_PCTS` (L56-57); `handleDefaultDistribution` resets pcts to defaults (L376).
  - Yup `schema` (L76-91) validates only name, duration, `total_budget` (positive), email; no per-category validation. `distributionOnlySchema` variant for `distributionOnly`.
  - `softErrors` / `hasSoftError` (L193-202): soft > rounded hard per category. `sumPctError` (L204): pcts must sum to 100 (+-0.5).
  - Submit gating: `submitDisabled={submitting || dataLoading || hasSoftError || sumPctError}` (L481); `onFormSubmit` early-returns on `hasSoftError || sumPctError` (L384).
  - `onHardInputChange(cat, val)` (L345): converts typed dollars to pct; platform: `clamp(requestedPct, 0, 100 - premium)`, cascades remainder into CLI. Returns early if `totalBudget <= 0`.
  - `onSliderChange` -> `setPcts` (L341). Passes `platformMinPct={0}` to the drag bar (L631).
  - `populateFromGroup` (L213): loads existing group; `nextPcts[cat] = max_budget/total*100` — a legacy platform of 0 yields pct 0 here and renders normally today. Soft scaling effect on `[totalBudget, pcts]` (L294-327) skips cats with soft/hard <= 0.
  - Payload: `categories[cat] = { pct: round2(pcts[cat]), soft_budget: Math.round(softs[cat]) }` sent via `projectBudgetsStore.createProjectBudgetGroup` / `updateProjectBudgetGroup`; `distributionOnly` mode sends only categories.
- `src/pages/settings/administration/components/UnifiedBudgetDragBar.tsx` — the DISTRIBUTION slider (`role="slider"`, "Budget allocation slider"). Already has a `platformMinPct` prop (L27) used in handle-1 drag: `clamp(pct, platformMinPct, 100 - premium)` (L285). Handle 2 clamps boundary to `[current.platform, 100]`. The modal currently passes 0. Drag snapping/steps derive from `totalBudget` (`pickMagneticDollarStep`, `pickFineDollarStep`). Bands render with `flex: pct > 0 ? pct : 0.001`. Keyboard handling: `tabIndex={0}`; no key handler seen in the viewed spans.
- `src/pages/settings/administration/components/BudgetCategoryTable.tsx` — 3-column grid of Hard/Soft inputs per category via `BudgetAmountInput` (`onCommit`); shows "Exceeds hard limit" under soft input when `softErrors[cat]`. Props have no hard-limit error prop today; aria labels e.g. "Platform hard limit".
- `src/pages/settings/administration/components/BudgetAmountInput.tsx` — the commit-on-blur numeric input (not read).
- `src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx` — renders `UnifiedProjectBudgetModal` (3 call sites), loads budgets and group; cards/table show Spend/hard limit and handle `maxBudget == null`. Display-side zero handling exists in `budgetSpending.ts` (`hardLimit <= 0` returns 0 / null color), so legacy 0 hard limits already render.
- `src/pages/settings/administration/components/ProjectBudgetModal.tsx` — a separate older single-category modal ("Create/Edit Project Budget", titles differ from the task). Its yup already has `max_budget` `.positive('Hard limit must be greater than zero')`. Not the popup named in the task (task titles "Create Budget"/"Update Budget" match the Unified modal).
- Types: `src/types/entity/projectBudgetGroup.ts` (`CategoryBudgetSpec {pct, soft_limit_pct?, soft_budget?}`, `ProjectBudgetGroupCreatePayload`, `ProjectBudgetGroupUpdatePayload`, `CategoryBudgetDetail.max_budget`); `src/types/entity/budget.ts` (`BudgetCategory = 'platform'|'cli'|'premium_models'`).
- Store: `src/store/projectBudgets.ts` (not read) — `listProjectBudgetGroups`, `getProjectBudgetGroup`, `createProjectBudgetGroup`, `updateProjectBudgetGroup`; errors toasted by the store.

### Architecture and Layers Affected
React component layer (modal, drag bar, category table) -> Valtio store (`projectBudgets`) -> `src/utils/api.ts` HTTP -> backend (separate repo, not indexed here). Backend rejection of 0 is outside this repo; UI relevance is surfacing the backend error (store toasts errors).

### Integration Points
`ProjectBudgetsSection` -> `UnifiedProjectBudgetModal` -> `UnifiedBudgetDragBar` + `BudgetCategoryTable`; `projectsStore.updateProject` (chargeback) is called before the budget save; feature flags via `useProjectChargebackEnabled`, `useFeatureFlag('features:costCenters')`, soft-limit notification hooks.

### Patterns and Conventions
react-hook-form + yup resolver for scalar fields; category-level validation is hand-rolled (`softErrors`, `sumPctError`) and gates the submit button. Percent state is the source of truth; dollars derived. `.ai-run/guides/patterns/form-patterns.md` and `components/component-patterns.md` apply.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (form-patterns.md, modal-patterns.md, state-management.md, testing-patterns.md, quality-gates.md). Not read in detail; no budget-specific guide. 

### Architectural Decisions
Inline comments in the modal document soft-scaling invariants (CRITICAL prevHardsRef snapshot ordering at L301-306; `populateFromGroup` pre-sets `prevHardsRef` at L234-241). No ADRs found.

### Derived Conventions
Validation messages are short sentences ("Exceeds hard limit", "Must be greater than 0"); errors in red via `text-failed-secondary`.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/settings/administration/components/__tests__/UnifiedProjectBudgetModal.chargeback.test.tsx` — only test touching the modal, drag bar and category table (via callers); chargeback-focused. Not read.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectBudgetsSection.test.tsx` — section rendering.

### Testing Framework and Patterns
Vitest + React Testing Library, `unit` and `integration` projects (per AGENTS.md). Per repo rules, run `npm ci` first; only write/run tests if requested.

### Coverage Gaps
No test for `UnifiedBudgetDragBar` drag behavior, `BudgetCategoryTable`, `onHardInputChange`, `softErrors`/`sumPctError` gating, or legacy zero-platform loading.

---

## 5. Configuration and Environment

### Environment Variables
None specific to this area (`VITE_ENV`, `VITE_API_URL`, `VITE_APP_VERSION` in `src/types/global.ts`).

### Configuration Files
None budget-specific.

### Feature Flags and Deployment Concerns
Flags `features:projectChargeback`-type (PROJECT_CHARGEBACK), `features:costCenters`, budget soft-limit notification/email flags affect modal sections only; none gate the distribution/limits. Budget management gate: `useBudgetManagementEnabled`.

---

## 6. Risk Indicators

- Hard limits are derived from `totalBudget * pct`; a platform hard limit of 0 arises from pct 0, from `totalBudget` tiny/rounding, or from typing 0 in `BudgetAmountInput`. Several write paths to `pcts.platform` exist: slider (`onSliderChange`), `onHardInputChange` (platform and the CLI/premium cascades, which can drive platform's share but only via clamp `100 - other`), `handleDefaultDistribution`, `populateFromGroup`.
- Legacy: `populateFromGroup` can load platform pct 0; any floor must not be applied on load/render, only on interaction/submit (task requirement). The drag bar's `platformMinPct` clamp applies to handle 1 only; handle 2 clamps to `current.platform`, so it cannot lower platform. If the legacy value is below the floor, a clamp could jump the value on first drag.
- `platformMinPct` is a pct while the requirement is in dollars (> 0); floor interacts with `totalBudget` and `pickFineDollarStep` rounding. `round2(pct)` on submit and `Math.round(hard)` in `softErrors` could turn a tiny positive into 0.
- `distributionOnly` mode (disabled total budget, `canManageBudgets` false) shares the same submit path; the same rule would need to be consistent there.
- Interaction with soft scaling effect: changes to platform hard re-scale softs; soft limit may stay 0 (skipped by `softRef <= 0`).
- `ProjectBudgetModal.tsx` (older modal) already enforces `positive` hard limit; risk of wrong-modal edits.
- Speculative: a validation error display for platform hard limit would need a new prop on `BudgetCategoryTable`; backend error text from the store toaster may need to be surfaced inline.
- Speculative: backend is a separate repo; payload sends `pct`, not dollar amounts, so backend rejection of "0" is on derived `max_budget` or on `pct`.
- Test gap: only the chargeback test covers the modal.

---

## 7. Summary for Complexity Assessment

The change lives in the frontend presentation/state layer of one modal cluster: `UnifiedProjectBudgetModal.tsx` (state, `onHardInputChange`, submit gating, schema/derived errors), `UnifiedBudgetDragBar.tsx` (already exposes a `platformMinPct` prop, currently passed as 0), and `BudgetCategoryTable.tsx` (hard-limit input rendering). The file surface appears to be 3-4 source files plus tests. Backend enforcement is outside this repository. The adjacent `ProjectBudgetModal.tsx` already has a positive-hard-limit rule but is a different (single-category) modal.

Technically no novel patterns: validation follows the existing hand-rolled `softErrors`/`sumPctError` submit gating. The subtle part is that hard limits are derived from percentages and total budget, with several mutation paths (slider, typed hard, cascade, reset default, load from existing group) and soft-scaling effects with ordering-sensitive refs. Legacy zero-platform groups load through `populateFromGroup` and must keep rendering; validation should apply on update.

Test posture is thin: one chargeback-focused test for the modal and nothing for the drag bar, category table or hard-limit handlers. Key risks are legacy-data behavior, pct vs dollar floor semantics, `distributionOnly` mode consistency, and cross-repo backend coordination.

---

## 8. External References

None named by the task.
