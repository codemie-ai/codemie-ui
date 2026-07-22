# Technical Research

**Task**: activity events filter layout date range
**Generated**: 2026-07-20T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-13606: Activity events: 'From' date filter is displayed on the first row instead of next to 'To'. The From date field must be moved to the second row and placed next to the To field. The filter panel has: Domain, Event type, Entity type, Actor ID, Entity ID (row 1), From, To, Sort fields.

---

## 2. Codebase Findings

### Existing Implementations

Research was conducted via filesystem exploration. The activity events admin page was introduced in commit `00279219e` (EPMCDME-13275). Key files identified:

- Files to investigate: any component under `src/` matching `ActivityEvents`, `ActivityEventsFilter`, or `ActivityEventsPage` naming conventions
- The filter panel is described as having two rows:
  - Row 1: Domain, Event type, Entity type, Actor ID, Entity ID
  - Row 2 (desired): From, To, Sort fields
  - Current bug: "From" renders on Row 1 instead of Row 2

> NOTE: Codegraph was unavailable. Filesystem agent threads were dispatched but returned before file-level resolution could complete. The analysis below is derived from commit history, AGENTS.md context, and the task description itself.

### Architecture and Layers Affected

- **UI / Component layer only**: this is a pure layout/presentation change
- The filter panel is a React component (likely a dedicated `FilterPanel` or `Filters` sub-component within the Activity Events page)
- No API, service, store, or backend changes are expected
- Tailwind CSS classes control the grid/flex layout

### Integration Points

- The filter panel likely reads filter state from a Valtio store (project convention: all state in stores, components read via `useSnapshot`)
- Date fields ("From" / "To") are likely PrimeReact `Calendar` components wrapped in a form row
- The layout is controlled by Tailwind grid or flex row grouping — moving "From" means changing which row wrapper it belongs to

### Patterns and Conventions

- **Tailwind-only styling**: no inline styles, no custom CSS — layout is expressed entirely through Tailwind utility classes
- **cn() utility** for conditional className composition
- **React Hook Form + Yup** for form/validation if the filter uses controlled form state
- **PrimeReact** components for date pickers (Calendar), dropdowns (Dropdown/MultiSelect)
- **No `Dialog`** — modals use the project's `Popup` component

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/` exists in this repo per AGENTS.md
- Relevant guides:
  - `.ai-run/guides/architecture/layered-architecture.md` — confirms component-layer-only scope
  - `.ai-run/guides/standards/code-quality.md` — Tailwind and ESLint conventions

### Architectural Decisions

- Valtio stores own all API calls and global state; components are presentation-only
- PrimeReact is the UI component library; custom wrappers (e.g., `Popup`) override native PrimeReact components where needed

### Derived Conventions

- Filter panels in this codebase use Tailwind `grid` or `flex flex-wrap` with explicit row breaks
- Moving a field between rows means either: (a) reordering JSX within a flex-wrap container, or (b) moving the field's JSX block from one `<div>` row wrapper to another
- Single quotes for all strings; ESLint enforced

---

## 4. Testing Landscape

### Existing Coverage

- The activity events page was introduced recently (EPMCDME-13275, commit `00279219e`)
- No evidence of dedicated test files for this specific filter component in recent commits
- This is a UI layout change — coverage would be in visual/snapshot tests if they exist

### Testing Framework and Patterns

- Project uses standard React testing patterns; likely Vitest or Jest with React Testing Library
- No explicit test framework version confirmed from this analysis pass

### Coverage Gaps

- The activity events filter panel likely has no existing layout/snapshot tests (new feature, small team surface)
- This layout-only fix does not require new test coverage unless the project mandates snapshot tests for filter components

---

## 5. Configuration and Environment

### Environment Variables

- No environment variables are relevant to a layout-only change

### Configuration Files

- `tailwind.config.ts` — defines the color palette and spacing scale; spacing classes used in the filter layout must come from this config
- No other config files are relevant

### Feature Flags and Deployment Concerns

- No feature flags expected for a layout fix
- No deployment concerns — pure frontend change, no schema or API impact

---

## 6. Risk Indicators

- **Codegraph unavailable** — exact file paths for the activity events filter component were not confirmed by tool; the implementer must locate the file manually (search for `ActivityEvents` or `activityEvents` in `src/`)
- **New feature, potentially no tests** — the activity events page was introduced in a recent commit; the filter component may have no existing tests, meaning no regression safety net for the layout change
- **Thin task description** — the ticket provides the desired end-state but no wireframe or screenshot; the implementer should verify the exact JSX row structure before moving the `From` field
- **Row structure ambiguity** — the filter may use a flat flex-wrap container (reorder by JSX position) or explicit row `<div>` wrappers (move JSX block to the correct wrapper); the wrong assumption leads to incorrect layout on responsive breakpoints
- **PrimeReact Calendar component** — date pickers may have fixed widths that affect row alignment; confirm the `To` field's container width accommodates `From` being placed beside it

---

## 7. Summary for Complexity Assessment

This task is a **low-complexity, single-layer UI layout fix** confined entirely to the component/presentation layer. The change involves moving the "From" date picker field in the Activity Events filter panel from the first row (alongside Domain, Event type, Entity type, Actor ID, Entity ID) to the second row, placing it adjacent to the "To" field. No store, API, database, or backend changes are required. The likely file change surface is one component file — the filter panel sub-component of the Activity Events page — with a change of under 20 lines.

The task follows a well-established pattern in this codebase: Tailwind-controlled grid or flex layout, PrimeReact Calendar components for date inputs, and JSX row grouping. The implementer needs only to locate the filter component (search `src/` for `ActivityEvents`), identify whether rows are structured as explicit `<div>` wrappers or a flat flex-wrap, and move the "From" field's JSX block accordingly.

The primary risk is the absence of automated layout/snapshot tests for this recently introduced page, meaning the change must be verified visually. A secondary risk is codegraph being unavailable, requiring the implementer to locate the exact file path manually. Complexity scoring should reflect a straightforward presentation-layer fix with minimal risk of regression outside the filter component itself.
