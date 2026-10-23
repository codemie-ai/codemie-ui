# Technical Research

**Task**: users administration projects chip
**Generated**: 2026-10-23
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16295: Users management: "Default" project label in the Projects cell is broken (text split across lines)

Description:
On the Settings → Administration → Users management page, the "Default" label in the Projects cell of the users list does not render correctly. The label is split across lines (for example "Defa / ult", "Defau / lt"), and it is misaligned with the email text in the same chip. The layout of the projects cell looks broken.

Preconditions:
- The user is authenticated as an administrator.
- The user has access to Settings → Administration → Users management.
- At least one user is a member of a project and has the "Default" project entry in the Projects cell (e.g. users in project `abcr-web2`).

Steps to Reproduce:
1. Open Settings → Administration → Users management (e.g. codemie-preview.lab.epam.com/settings/administration/users?projects=abcr-web2).
2. Look at the Projects column for any user.
3. Observe the "Default" label in the first project chip.

Expected Result: The "Default" label is displayed as one intact word, aligned with the email in the same chip, and the Projects cell layout is consistent across all rows.

Actual Result: The "Default" label wraps mid-word ("Defa / ult", "Defau / lt") and breaks the alignment of the chip. The text is not aligned with the email address in the same chip.

Affected Areas: Settings → Administration → Users management; Users list → Projects cell (project chips); Frontend layout and text wrapping.

Acceptance Criteria:
1. The "Default" label is shown as one intact word in every row of the Projects cell.
2. The label and the email in the project chip are aligned consistently.
3. The layout of the Projects cell is not broken for users with one or several projects.
4. The fix does not introduce regressions in other columns or actions of the Users management table.

Reviewer comment (desired layout direction, from Ihor Nasukho):
"I'd suggest slightly changing the chip layout instead of keeping everything in one line. Default can be displayed on the first line as a separate label, while the email and role stay on the second line:
Default
email@epam.com (user)
This should make the layout more stable for long emails, avoid breaking the Default label and make the content easier to scan consistently across rows."

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/UsersManagementPage.tsx` (lines ~257-324) — `customRenderColumns.projects` builds the `projects` column of the main Users list table. It reorders `item.projects` so the default project sorts first, maps each to a `BadgeItem` with `value: "${p.name} (${role})"`, and sets `icon` to a `<span data-testid="default-project-marker">Default</span>` only when `p.is_default` is true. It renders via `<DetailsBadges filled items={projectNames} maxDisplayed={MAX_DISPLAYED_PROJECTS} badgeClassName="min-w-0 max-w-full whitespace-normal break-all text-[10px] leading-tight px-1.5 py-1" />`.
  - Note: the chip's second-line text is `${project.name} (admin|user)`, i.e. the **project name**, not necessarily an email address. Several existing tests use plain project names (`project-a (user)`, `delta (user)`). The reviewer's "email@epam.com" is illustrative of the role-suffixed text shape, not a literal field name — worth confirming with the reviewer/PO if the ticket intends project name or something else, but no code path renders a user email inside this specific chip today.
- `src/components/details/DetailsBadges.tsx` — generic badge-list component. Wraps badges in a `flex flex-wrap gap-1 items-center` container, truncates to `maxDisplayed`, and renders overflow in a floating-ui hover popover (`+N` chip). Delegates per-item rendering to `DetailsBadge`, passing through `icon`, `value`, `href`, and the caller's `badgeClassName`.
- `src/components/details/DetailsBadge.tsx` (root cause location) — renders a single chip:
  ```
  const badgeClassName = cn(
    'py-1.5 px-2 flex items-center gap-2 rounded-lg border border-border-specific-panel-outline font-semibold bg-surface-base-secondary',
    filled && 'bg-surface-base-secondary',
    className
  )
  const content = <>{icon} {String(value)}</>
  ```
  `icon` (here, the "Default" span) and `value` are both direct children of a single `flex items-center` row — i.e. one line, side by side — not two stacked lines. The chip's own container only has `gap-2`; there is no `flex-col` split between label and value.
- `src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx` and `.../popups/UserDetailsPopup.tsx` — a **separate** "Default" rendering exists in the per-user details popup, using a `RadioButton` (`renderDefaultColumn`) in its own table column, not the `DetailsBadge` icon pattern. Not affected by this bug, but shares the "Default" concept and is a precedent to keep consistent if the fix changes vocabulary/testids.
- `src/pages/settings/administration/usersManagement/constants.ts` — `MAX_DISPLAYED_PROJECTS = 3` (badges shown before the "+N" overflow chip).

### Architecture and Layers Affected

- **Presentation/component layer only.** No store, API, or type changes are implicated. The layers touched are:
  - Page-level custom column renderer: `UsersManagementPage.tsx` (`projects` column, `customRenderColumns`)
  - Shared UI primitives: `DetailsBadges.tsx` (list/overflow wrapper) and `DetailsBadge.tsx` (single chip markup)
- `Table` / `TableCell` (`src/components/Table/`) own the column width (`createCustomColumn('projects', 'Projects', '14%')`, `headerNoWrap: false`) but do not themselves cause the wrapping; the chip-internal flex/break-all combination does.

### Integration Points

- `DetailsBadges` + `DetailsBadge` are used by exactly one other call site in the app: `src/pages/settings/administration/projectsManagement/components/BudgetOverrideIndicator.tsx`, which renders `<DetailsBadge value="Overridden" className="..." />` with **no `icon` prop**. Changing how `DetailsBadge` lays out `icon` vs `value` (e.g. introducing an internal two-line layout when `icon` is present) does not affect this consumer, since it never passes `icon`. This keeps the blast radius of a `DetailsBadge`-level fix narrow.
- `router.resolve({ name: PROJECTS_MANAGEMENT_DETAIL, ... })` supplies each badge's `href`, rendering the chip as a `<Link>`.

### Patterns and Conventions

- Existing two-line "label + sub-value" stacked chip pattern already exists elsewhere in the codebase and can be used as a styling reference: `src/components/ToolCallPolicyDropdown/ToolCallPolicyDropdown.tsx` `itemTemplate`:
  ```
  <div className="flex flex-col gap-0.5">
    <span className="text-sm leading-tight">{label}</span>
    <span className="text-xs text-text-tertiary leading-tight">{subtitle}</span>
  </div>
  ```
  This uses `flex-col` + `leading-tight` for a compact two-line label/subtitle stack — the same shape the reviewer is asking for (Default on its own line, project/role text below).
- `break-all` is used pervasively elsewhere in this codebase for genuinely long unbroken strings (emails, IDs, paths — e.g. `UserProjectsTable.tsx:255`, `UserProjectSpendingTable.tsx:67`, `DetailsCopyField.tsx:41`). It is appropriate there because those spans hold only the long string. Applying `break-all` to a `badgeClassName` that wraps **two separate flex children** (icon label + value) is what causes the short, unrelated "Default" word to also break — `white-space`/`word-break` are inherited CSS properties, so `break-all` set on the badge container cascades into the short "Default" `<span>` as well as the longer value text.
- `cn()` (tailwind-merge wrapper, `src/utils/utils.ts`) merges `DetailsBadge`'s own base classes with the caller's `badgeClassName`; a fix should keep using `cn`/`className` composition rather than hardcoding new classes in the shared component, consistent with how `BudgetOverrideIndicator` already overrides sizing via `className`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` and `.ai-run/guides/styling/styling-guide.md` exist and are the canonical references for component structure and Tailwind conventions, but neither names `DetailsBadge`/`DetailsBadges` or this "Default" marker specifically.
- `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/development/api-integration.md` not relevant — this is a pure rendering/CSS bug with no data flow change.

### Architectural Decisions

- No ADRs found for this component. The only relevant decision trail is in git history (see below).

### Derived Conventions

- The "Default" marker and the whole `projects` column were added together in commit `ec8d2a408` ("EPMCDME-15112: Default project in User Management UI"), which also added `UsersManagementDefaultProject.integration.test.tsx`. A follow-up commit touched the same area under `UserProjectsTable.layout.test.tsx` (ticket EPMCDME-15739) specifically to stop capping project-name width so long names "stay on one line" — i.e. this general chip area has a known history of text-wrapping issues being fixed incrementally, chip by chip, rather than via one shared layout decision.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/__tests__/UsersManagementDefaultProject.integration.test.tsx` — integration test for exactly this feature. Asserts:
  - a `[data-testid="default-project-marker"]` element exists inside the badge for the default project and not for non-default ones (`closest('a, div')` lookup),
  - the default project's badge text renders as `"<name> (user)"`,
  - the default project is reordered first so it survives the `MAX_DISPLAYED_PROJECTS` cap and overflow "+N" chip.
  This test only checks *presence* of the marker and reordering, not its line-wrapping/visual layout — a CSS-only regression would not be caught by it today, but any DOM-shape change to the icon/value markup (e.g. restructuring into two `<span>`s or a `flex-col` wrapper) must keep `data-testid="default-project-marker"` and the `closest('a, div')` traversal working.
- `src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.layout.test.tsx` — covers a related but different component (the per-user popup table), asserting long project names aren't `max-w-`-capped. Precedent for how this codebase writes layout-focused unit assertions (checking `className` strings via `screen.getByText(...).className`).
- No test file exists for `DetailsBadge.tsx` or `DetailsBadges.tsx` directly (no `__tests__` sibling found for either).

### Testing Framework and Patterns

- Vitest + React Testing Library, two projects (`unit`, `integration`) per `vite.config.ts` / `AGENTS.md`. Integration tests for this page use `mockAPI`/`renderPage` helpers from `@/test-utils/integration`.
- Layout assertions in this codebase check rendered `className` strings directly (e.g. `expect(screen.getByText(longName).className).not.toMatch(/max-w-/)`), rather than measuring actual pixel layout — a precedent for how a regression test for this ticket could assert the absence of `break-all` on the "Default" span, or the presence of a `flex-col` wrapper class.

### Coverage Gaps

- No existing test asserts that the "Default" marker text itself is not wrapped (no `break-all` class, or isolated from the value's wrapping classes). This is the exact gap this ticket's bug fell through.
- No test for `DetailsBadge`/`DetailsBadges` in isolation (only covered indirectly via the page-level integration test and via the single other consumer, `BudgetOverrideIndicator`, which has no dedicated test either).

---

## 5. Configuration and Environment

### Environment Variables

- None relevant — this is a pure rendering/CSS concern, no env-gated behavior found for this column.

### Configuration Files

- No feature flags or config files govern the Projects column rendering. `MAX_DISPLAYED_PROJECTS` (`usersManagement/constants.ts`) is a plain exported constant, not a runtime toggle.

### Feature Flags and Deployment Concerns

- None identified. No Dockerfile/CI reference to this component area.

---

## 6. Risk Indicators

- The root cause is narrow and well-isolated: `DetailsBadge.tsx` puts `icon` and `value` as flex siblings in one row, and the caller (`UsersManagementPage.tsx`) applies `break-all` (an inherited CSS property) across that whole row via `badgeClassName`, so the short "Default" text breaks mid-word under the same rule meant for long project/role strings.
- Speculative: the reviewer's desired two-line layout ("Default" on its own line, project/role text below) will likely require either (a) a `DetailsBadge`-level change to lay out `icon` above `value` in a `flex-col` when `icon` is present, or (b) a page-level change in `UsersManagementPage.tsx` to stop passing `icon` and instead compose the two lines directly in the `value`/column renderer. Both are plausible; which one is correct is a design decision for spec/plan, not settled by this research.
- Speculative: because `DetailsBadge`'s `icon` prop is also consumed generically (typed `ReactNode`), changing its internal layout assumptions (e.g. always stacking `icon` above `value`) is currently safe for the only other consumer (`BudgetOverrideIndicator`, which never passes `icon`), but should be scoped/guarded (e.g. only apply the stacked layout when `icon` is truthy) to avoid surprising any future consumer that expects a single-line icon+value chip.
- The one existing integration test (`UsersManagementDefaultProject.integration.test.tsx`) relies on `closest('a, div')` and `data-testid="default-project-marker"` — any markup restructuring must preserve both or the test needs a deliberate, reviewed update alongside the fix.
- No test currently exercises the actual wrapping bug, so a fix without a new/updated assertion (e.g. asserting the marker span lacks `break-all`, or asserting a `flex-col` grouping) risks being silently reverted by a future styling change.
- Terminology mismatch: the ticket/reviewer comment describes the chip's second line as "email", but the actual rendered value is `${project.name} (${role})`. If the ticket intends to literally show the member's email rather than the project name, that would be a data/behavior change beyond pure layout CSS, and is out of scope for what this document can confirm from code alone — flag for spec clarification.

---

## 7. Summary for Complexity Assessment

This is a scoped, presentation-layer bug confined to two existing files: `src/components/details/DetailsBadge.tsx` (the single-chip markup, where `icon` and `value` are flex siblings in one row) and `src/pages/settings/administration/UsersManagementPage.tsx` (the `projects` column renderer, which applies `break-all` across the whole badge via `badgeClassName`, cascading onto the short "Default" `<span>`). `DetailsBadges.tsx` is a pass-through and unlikely to need changes. No store, type, API, or routing changes are implicated.

The blast radius is small: `DetailsBadge` has exactly one other consumer in the codebase (`BudgetOverrideIndicator.tsx`), which does not use the `icon` prop and so is unaffected by an icon/value layout change. A clear in-codebase precedent for the reviewer's requested two-line label/subtitle layout already exists (`ToolCallPolicyDropdown.tsx`'s `flex flex-col gap-0.5` + `leading-tight` pattern), reducing design novelty.

The main risk is not technical complexity but test and requirement precision: the one existing automated test for this area checks marker presence and reordering, not wrapping/visual layout, so the fix needs a new assertion to actually catch a regression; and the ticket's reference to "email" in the chip does not match the current `project name (role)` value, which should be clarified before implementation rather than assumed.

---

## 8. External References

None named by the task.
