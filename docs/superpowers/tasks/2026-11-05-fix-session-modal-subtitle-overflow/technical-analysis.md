# Technical Research

**Task**: session modal header truncation Popup CLI analytics
**Generated**: 2026-11-05
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16718 [CLI Analytics] [UI/UX][Session details] Long header subtitle overflows past the modal's right edge instead of being truncated.

Summary: In the CLI Analytics Session Detail modal, the subtitle under the session title is not truncated when it is longer than the modal. It runs past the right edge and the close button, so the last value (delivery framework) is drawn outside the modal.

Preconditions: A session whose subtitle is longer than the modal. The subtitle joins harness, models, repository, branch and delivery framework. Several models or a long branch name is enough.

Steps to Reproduce: Open Analytics > CLI Analytics, open any session with a long subtitle, look at the subtitle line in the modal header.

Actual Result: The subtitle is shown on one line without truncation; it extends past the close button and the modal's right edge.

Expected Result: The subtitle stays inside the modal and does not reach the close button. A long value is cut off with an ellipsis (full text on hover) or wrapped onto further lines.

Root Cause (reported in the ticket, not confirmed at runtime): In codemie-ui, the subtitle span in SessionModal.tsx already has the `truncate` class, and its parent has `min-w-0`. The modal header in Popup.tsx is a flex row, and `headerContent` is rendered inside it. `truncate` only works when an ancestor limits the width, so the wrapper between the header row and `headerContent` likely doesn't.

Recommended Fix (from ticket): Limit the width of the header content so `truncate` takes effect, for example with `flex-1` and `min-w-0` on its wrapper. Add a `title` attribute so the full subtitle shows on hover.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/analytics/components/cli-analytics/views/SessionModal.tsx` (lines 34-58) — builds the subtitle string by joining `session?.harness_name/model_name/repository/branch/delivery_framework` with `' · '` via the `useCliAnalyticsSession` hook; renders the title/subtitle inside a `headerContent` div passed to `Popup`. The subtitle `<span>` already has `className="text-xs text-text-secondary truncate"` and its parent div already has `min-w-0`. No `title` attribute is currently set.
- `src/components/Popup/Popup.tsx` — shared modal primitive wrapping PrimeReact's `Dialog`. `renderHeader()` (lines 145-165) returns the caller-supplied `headerContent`/`header`. The `pt` (pass-through) prop (lines 232-263) customizes PrimeReact Dialog slots: `root`, `header` (flex row, `flex items-center justify-between gap-4`), `headerIcons`, `mask`, `content`, `footer`. **It does not override the `headerTitle` slot.**
- `node_modules/primereact/dialog/dialog.cjs.js` (lines 882-902) — PrimeReact's `createHeader()` wraps whatever `header` renders in an extra, internally-generated `<div className="p-dialog-title">` (via `cx('headerTitle')`). This div is a plain block/flex-item with no width constraint (`flex-grow: 0`, no `min-w-0`), so it sizes to its content instead of shrinking. This is the actual wrapper the ticket suspected sits between the flex header row and `headerContent`, and it is the confirmed root cause — not anything in SessionModal.tsx, which already has correct classes.
- `src/components/Card/Card.tsx` (lines 98-123) — analogous truncate+tooltip pattern using `data-pr-tooltip`/`isTitleTruncated`.
- `src/components/Navigation/NavigationPinnedSection/PinnedRow.tsx:61` — `'text-sm truncate flex-1 min-w-0 ...'`, the same `flex-1 + min-w-0 + truncate` idiom needed here.
- `src/components/Thought/ThoughtHeader.tsx:117-120` and `src/pages/dataSources/components/DataSourceForm/IndexTypeField/JiraCustomFieldsField.tsx:46` — plain native `title={...}` used with `truncate` for hover tooltip (matches the ticket's suggested simple fix).
- `src/hooks/useIsTruncated.ts` plus `src/components/TruncationBadge/` — the project's dedicated, more sophisticated truncation-detection convention (`useIsTruncated(ref)` conditionally shows a tooltip only when actual overflow occurs). Used at 30+ call sites, e.g. `src/pages/workflows/components/WorkflowCard.tsx:116-118`. Neither SessionModal nor Popup currently use this hook.

### Architecture and Layers Affected

- Component layer: `SessionModal.tsx` (feature-specific, CLI Analytics domain) → `Popup.tsx` (shared UI primitive, `src/components/Popup/`) → third-party library internals (`primereact/dialog`) → Tailwind utility classes (`truncate`/`min-w-0`/`flex-1`).
- This is a pure presentation-layer (CSS/JSX) fix; no service, API, store, or persistence layers are touched.

### Integration Points

- `Popup` is shared across ~15+ other call sites that pass `headerContent` (ExpandedYamlShell, SignUpPage/SignInPage, CreateSkillPopup, CodeBlock/HtmlPreviewPopup, VersionedField, WidgetPreviewModal/WidgetModal, ExpandableTextarea, SkillInstructions, WorkflowDrawerHeader, ChatSidebar/ChatSidebarAssistants, ContinueWithInputPopup, UnifiedProjectBudgetModal, ImportUsersModal, SystemPromptExpandedModal, EditMessageModal, MCPToolkitForm). Any fix inside `Popup.tsx`'s `pt` object (specifically adding a `headerTitle` entry) has this blast radius — most of these callers already apply their own `w-full`/`grow`/`justify-between` on their outer `headerContent` div, so an additive `flex-1 min-w-0` on the newly-introduced `headerTitle` slot is expected to be safe (it only allows shrink/stretch, it doesn't impose truncation or override existing layout).
- No backend/API integration — `subtitle` composition itself is unrelated to the bug.

### Patterns and Conventions

- `flex-1 min-w-0` on a flex-item wrapper + `truncate` on the inner text node is the established idiom for truncating text inside a flex row in this codebase (`PinnedRow.tsx`, `FloatingKataWindow.tsx:168`, `Card.tsx:120-121`).
- Two tooltip conventions coexist: (a) plain native `title` attribute alongside `truncate` (simple, matches the ticket's literal recommendation), and (b) `useIsTruncated(ref)` + conditional tooltip rendering, which is the dominant repo-wide convention (34 files) per `.ai-run/guides/patterns/custom-hooks.md`. This is a real decision point for whoever implements the fix — see Section 6.
- Popup.tsx customizes PrimeReact's Dialog via its `pt` (pass-through) prop, per slot. The idiomatic fix location is adding a `headerTitle` entry to this same object, not altering SessionModal.tsx's own (already-correct) classes.
- `.ai-run/guides/patterns/modal-patterns.md` establishes a critical rule: never import PrimeReact `Dialog` directly — all modals must go through `Popup`. Any fix must stay within `Popup`'s existing slot props (`header`, `headerContent`, `pt`, etc.) rather than introducing new ad hoc styling props, per `.ai-run/guides/styling/styling-guide.md`'s DO/DON'T guidance against proliferating per-slot className props.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` — modal composition must use `Popup`'s `header`/`headerContent` slot props (never a separate custom header component); accessibility requires `aria-labelledby` via `useId()` (already present in Popup.tsx:80).
- `.ai-run/guides/styling/styling-guide.md` — Tailwind-only, semantic `themeTokens`, no arbitrary values, `cn()` utility for conditional classes. Silent on the specific truncate/min-w-0/flex-overflow pattern.
- `.ai-run/guides/patterns/accessibility-patterns.md` — general tooltip-adjacent guidance (`aria-label`, `aria-describedby`, `sr-only`) and a modal a11y checklist; no direct truncate/tooltip section.
- `.ai-run/guides/patterns/modal-patterns.md` — critical rule: never import PrimeReact `Dialog` directly; documents the full `PopupProps` reference.
- `.ai-run/guides/patterns/custom-hooks.md` — documents `useIsTruncated(ref)` as the established truncation/tooltip-disclosure convention.

### Architectural Decisions

- No formal ADR exists for this bug. No NOTE/HACK/TODO/ADR/DECISION markers found in `Popup.tsx` or `SessionModal.tsx`.
- A pre-existing task scaffold for this exact ticket already exists at `docs/superpowers/tasks/2026-11-05-fix-session-modal-subtitle-overflow/.state.json` (schema 1, flow `sdlc-light`, branch `EPMCDME-16718_fix-session-modal-subtitle-overflow`, phase `main`) — state metadata only, no prior spec/plan.

### Derived Conventions

- Flex containers holding truncatable text should use `min-w-0` on the flex child — required for `truncate` to work inside flex layouts; not explicitly documented but consistently applied and uncontradicted by any guide.
- No custom CSS/inline styles/arbitrary Tailwind values permitted; use semantic tokens for any new classes.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/analytics/components/cli-analytics/__tests__/SessionModal.test.tsx` — single test asserting the subtitle contains the real `harness_name` and not a hardcoded value. Mocks `@/components/Popup` down to rendering only `headerContent`, so **any fix inside Popup.tsx's real header wrapper is invisible to this test**. No assertions on className, truncate, min-w-0/flex-1, or a `title` attribute.
- `src/components/Popup/__tests__/Popup.test.tsx` — comprehensive unit tests for visibility, header/content/footer rendering, submit/cancel/escape handlers, custom header/footer content, className passthrough (`toHaveClass`), focus management and focus-trap behavior, stacked-dialog behavior. **No test covers the `headerTitle`/`pt.header` wrapper's layout classes or overflow behavior.**

### Testing Framework and Patterns

- Vitest via `vite.config.ts`, two `test.projects`: `unit` (jsdom) and `integration` (real stores + mocked API). React Testing Library (`render`/`screen`/`user-event`).
- Patterns: module-level `vi.mock` for child components/hooks with minimal stub markup; `renderPopup(props)` factory helper with overridable defaults; fixed-shape fixture objects; `toHaveClass(...)` for asserting Tailwind classes directly (used in Popup.test.tsx's className test and `Hint.test.tsx`'s styling test) — this is the pattern that would assert `truncate`/`min-w-0`/`flex-1`/`title` if a regression test is added.
- Existing `title`-attribute assertion precedent: `toHaveAttribute('title', <value>)` in `src/components/Pagination/__tests__/Hint.test.tsx` and `src/components/Thought/__tests__/ThoughtHeader.test.tsx:300-305`.

### Coverage Gaps

- No test renders a long subtitle/title string and asserts truncation (no `truncate`/overflow/width assertion) anywhere in SessionModal or Popup tests.
- No test asserts a `title` attribute exists on SessionModal's header/subtitle spans — matches the fix scope exactly.
- No test covers the `pt.header` (or the missing `pt.headerTitle`) wrapper's layout classes in Popup.tsx — no regression guard exists for header overflow when `headerContent` is long.
- Because `SessionModal.test.tsx` mocks `Popup` entirely down to just `headerContent`, a true regression test for this bug requires either an unmocked integration-style render of `Popup` + `SessionModal` together, or a dedicated `Popup.test.tsx` case asserting the header wrapper's classes/overflow behavior with a long `headerContent` string.

---

## 5. Configuration and Environment

### Environment Variables

- None relevant. No `VITE_*_ANALYTICS*` or `window._env_` analytics-specific entries exist. CLI Analytics visibility is controlled by a backend-driven feature flag, not an env var.

### Configuration Files

- `tailwind.config.ts` — stock Tailwind behavior for `truncate`/`min-w-0`/`flex`; includes `@tailwindcss/line-clamp` plugin (an alternative to `truncate` if multi-line wrapping were chosen) and `tailwindcss-themer`. `content` glob requires literal class usage (no dynamic string concatenation) to survive JIT scanning.
- `.eslintrc.cjs` — no `eslint-plugin-tailwindcss` installed; class ordering/arbitrary values are a style-guide convention only, not CI-enforced. Standard hygiene rules apply (`sonarjs/cognitive-complexity`, `import/order`, etc.) but nothing truncate-specific.
- `.prettierrc.json` — `printWidth: 100`; will reformat long className strings if they grow.

### Feature Flags and Deployment Concerns

- `FEATURE_FLAGS.CLI_ANALYTICS = 'features:cliAnalytics'` (`src/constants/featureFlags.ts`), consumed via `useFeatureFlag` in `src/pages/analytics/AnalyticsPage.tsx:51` to gate the whole CLI Analytics tab (and thus this modal). Backend/admin-controlled; unaffected by this fix.
- Note: a differently-named, unrelated `CLI_ANALYTICS = 'local_analytics'` constant exists in `filters.ts:42` (a local-storage/filter key) — do not confuse with the feature flag above.
- No deployment concerns: this is a pure client-side Tailwind/JSX layout change with no new env vars, no build/CI config changes, no deploy-templates changes.

---

## 6. Risk Indicators

- **Fix location ambiguity between two valid approaches**: the ticket's literal recommendation (native `title` attribute + `flex-1`/`min-w-0` on the headerContent wrapper) conflicts with the codebase's dominant, more sophisticated convention (`useIsTruncated(ref)` + conditional tooltip, used in 34 files per `.ai-run/guides/patterns/custom-hooks.md`). Whoever implements this should decide explicitly which convention to follow rather than defaulting silently — this should be surfaced in planning.
- **Root cause is one layer deeper than the ticket assumed**: SessionModal.tsx's own classes (`truncate`, `min-w-0`) are already correct. The actual missing constraint is PrimeReact's internally-generated, unstyled `headerTitle` wrapper div (`p-dialog-title`) inside `Popup.tsx`'s Dialog `pt` pass-through, which currently has no `pt.headerTitle` entry at all. A fix that only touches SessionModal.tsx (as the ticket's description might suggest) would not resolve the bug.
- **Existing SessionModal.test.tsx mocks Popup entirely**, making it blind to any fix applied inside Popup.tsx. A regression test for this bug requires either an unmocked integration-style render or a new Popup.test.tsx case — the correct test location is not obvious from the existing test structure and must be chosen deliberately.
- **Shared-component blast radius**: `Popup.tsx` is used by ~15+ other modals across the app. Adding a `pt.headerTitle` className is expected to be additive/safe based on review of existing callers, but each caller was not individually verified end-to-end — a visual regression pass across a sample of other modals (e.g. SignInPage, ImportUsersModal) would reduce risk before merge.
- No test currently covers truncation/overflow behavior at all for this component pair — zero existing coverage, not just a gap in an existing suite.

---

## 7. Summary for Complexity Assessment

This is a narrowly-scoped, presentation-layer-only bug fix touching two files: `src/pages/analytics/components/cli-analytics/views/SessionModal.tsx` (a one-line addition — a `title` attribute, if that convention is chosen) and `src/components/Popup/Popup.tsx` (a one-line addition to the existing `pt` pass-through object — a new `headerTitle: { className: 'flex-1 min-w-0' }` entry). No API, store, model, migration, or feature-flag changes are required. The architectural layers touched are strictly: feature component (SessionModal) → shared UI primitive (Popup) → third-party library pass-through styling (PrimeReact Dialog `pt`). Estimated file change surface is 2 source files plus 1-2 test files if regression coverage is added.

Technical novelty is low — the `flex-1`/`min-w-0`/`truncate` idiom is already established and repeated elsewhere in the codebase (`PinnedRow.tsx`, `Card.tsx`, `FloatingKataWindow.tsx`), and the fix follows the existing `pt` pass-through mechanism Popup.tsx already uses for other slots. The one point of genuine ambiguity is tooling choice for the hover-tooltip requirement: a plain `title` attribute (simplest, matches the ticket literally, has test precedent) versus the repo's dominant `useIsTruncated` hook convention (used in 30+ places, documented in the custom-hooks guide, conditionally shows tooltip only on actual overflow). This should be resolved explicitly in the implementation plan rather than left to chance.

Test coverage posture is currently zero for this specific bug — no existing test in SessionModal.test.tsx or Popup.test.tsx exercises truncation, overflow, or title-attribute behavior for the header/subtitle. Compounding this, the existing SessionModal test mocks Popup entirely, so any fix inside Popup.tsx would go unverified unless a new test is added that either unmocks Popup or tests Popup.tsx's header wrapper directly with a long headerContent string. Primary risk factors for complexity scoring: (1) shared-component blast radius across ~15 other Popup consumers (low actual risk, but worth a quick visual check), (2) the tooling-convention decision noted above, and (3) the need to add net-new test coverage rather than extend an existing, well-covered suite.
