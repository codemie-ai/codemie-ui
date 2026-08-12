# Technical Research

**Task**: aria accessibility navigationmore contextId useId
**Generated**: 2026-08-07
**Research path**: codegraph

---

## 1. Original Context

Remove cross-file ARIA id magic strings introduced by the contextId accessibility work.

Problem. NavigationMore accepts a contextId prop and sets aria-labelledby={${buttonId} ${contextId}}, giving the icon-only menu button a context-aware accessible name. It has 24 consumers. In 6 of them the id template is written independently in two different files — once as the producer's id={...}, once as the consumer's contextId={...} — with nothing linking them. A rename in one file silently breaks the accessible name: no compile error, no runtime error, only a screen-reader regression.

| Consumer                    | Producer                        |
|-----------------------------|---------------------------------|
| DataSourceActions.tsx:227   | DataSourceName.tsx:30           |
| ProviderActions.tsx:74,82   | ProvidersManagementPage.tsx:103 |
| MCPServerActions.tsx:79,83  | columnRenderers.tsx:34          |
| WorkflowsList.tsx:293,299   | WorkflowCard.tsx:215            |
| SkillActions.tsx:163,167    | SkillCard.tsx:188 → Card.tsx:94 |
| SkillDetailsActions.tsx:149 | SkillDetails.tsx:80             |

The templates have already drifted: workflow-name-${id} is written at 4 production sites plus a test; kata-name-${id} in KataActions.tsx:163 and KataDetailView.tsx:509 (both resolve locally, but the template escaped its file).

Goal. No ARIA id template written in more than one file.

Preferred: restructure so one component owns both the heading and the menu, then generate the id with useId() and pass it to both. MCPServerCard.tsx:59 and MCPServerDetail.tsx:50 show the target shape. useId() cannot be called inside a .map(); extract the row into a component where needed. Judge each of the 6 pairs on its own — a list row is usually a clean fit for extraction, a page header plus separate action bar usually is not.

Fallback, where extraction would distort the layout: export one builder function per escaped id from a shared module, e.g. export const skillDetailsNameId = (id: string) => `skill-details-name-${id}`, imported by both sides.

Avoid: a generic entityNameId(scope, id) helper, and a Context/provider layer.

Out of scope: the 16 same-file consumers where a local const already serves as source of truth; the 2 consumers already using useId(); no changes to NavigationMore's public API.

Testing: no jest-axe/axe-core in repo. Assert via resolving aria-labelledby off rendered DOM (pattern in KataActions.accessibility.test.tsx:73 and AssistantActions.accessibility.test.tsx:72). Five test files hardcode the resolved id as a string literal and must be converted: SkillDetailsActions, DataSourceActions, ProviderActions, ProjectSettingActionsCell, WorkflowsList tests.

Documentation: extend .ai-run/guides/patterns/accessibility-patterns.md with guidance for cross-component id cases (useId() vs imported builder vs same-file local const).

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/NavigationMore/NavigationMore.tsx:62-194` — shared icon-only menu button. Generates its own internal `buttonId`/`menuId` via `useId()` (lines 79-81). Accepts optional `contextId` prop; when present, sets `aria-labelledby={${buttonId} ${contextId}}` (line 180) so the accessible name becomes "More options \<entity name\>". JSDoc (lines 41-44) already documents the contextId vs data-tooltip-content choice.
- 24 total consumers of `NavigationMore`. 16 resolve the id in the same file as a local const (out of scope), 2 already use `useId()` correctly (out of scope), 6 have the cross-file drift this task targets, and 2 (Kata* files) duplicate a template string that resolves locally in each file (informational only, not a cross-file linkage bug).

**The 6 target pairs:**

1. `src/pages/dataSources/components/DataSourceActions.tsx:227` (consumer) ↔ `src/pages/dataSources/components/DataSourceName.tsx:30` (producer)
2. `src/pages/settings/administration/components/ProviderActions.tsx:74,82` (consumer) ↔ `src/pages/settings/administration/ProvidersManagementPage.tsx:103` (producer — inline JSX inside `customRenderColumns.name`, not its own component; extraction here is more invasive than a typical list-row case)
3. `src/pages/settings/administration/components/MCPServerActions.tsx:79,83` (consumer) ↔ `src/pages/settings/administration/utils/columnRenderers.tsx:34` (producer)
4. `src/pages/workflows/components/WorkflowsList.tsx:293,299` (consumer) ↔ `src/pages/workflows/components/WorkflowCard.tsx:215` (producer) — `workflow-name-${id}` template also duplicated in a test file (4 prod sites + 1 test per task context)
5. `src/pages/skills/components/SkillActions.tsx:163,167` (consumer) ↔ `src/pages/skills/components/SkillCard.tsx:188` → `src/components/Card/Card.tsx:94` (two-hop producer — `Card.tsx` is a generic shared component; must confirm no unrelated consumers before changing its id-generation contract)
6. `src/pages/skills/components/SkillDetailsActions.tsx:149` (consumer) ↔ `src/pages/skills/components/SkillDetails.tsx:80` (producer)

**Target-shape references** (already correct, no change needed — used as the pattern to replicate):
- `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerCard.tsx:59,120,153` — single component owns both `<h4 id={nameId}>` and `<NavigationMore contextId={nameId}>`, `nameId` from local `useId()`.
- `.../MCPToolkit/MCPServerDetail.tsx:40` — same pattern.

**Out of scope, informational only:**
- `src/pages/katas/components/KataActions.tsx:163` and `src/pages/katas/components/KataDetailView.tsx:509` — both compute `kata-name-${id}` independently but each resolves correctly within its own file (no producer/consumer linkage bug). Duplicated literal, not a cross-file drift risk. Leave untouched per task scope.

### Architecture and Layers Affected

Purely presentational/DOM-id wiring — no store, service, or API layer involvement. Layering: shared UI component (`NavigationMore`) → per-feature action-menu components (`*Actions.tsx`) → per-feature list/card/detail components that render the named-entity heading.

### Integration Points

None external. Internal: `NavigationMore` ← `contextId` prop ← consumer files ← producer files (id-generating heading components/cells). `SkillActions` → `SkillCard` → generic `Card` component (`src/components/Card/`), the only pair with a shared/generic intermediate component.

### Patterns and Conventions

Two patterns already exist in the codebase:
- **Target pattern**: co-located component owns both heading and menu, `useId()` generates the id locally and is passed to both (`MCPServerCard.tsx`, `MCPServerDetail.tsx`). `NavigationMore.tsx` itself already uses this exact `useId()` approach internally — strong in-component precedent.
- **Current anti-pattern** (6 flagged pairs): independently-typed template-string ids in producer and consumer files, no shared source of truth, silent breakage risk on rename.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — covers the icon-button pattern and ARIA attributes with same-file, single-instance literal id examples. No section yet on cross-component id sharing (useId() vs imported builder vs same-file local const). This is the file to extend per task scope; do not create a new guide.
- `.ai-run/guides/development/constants-usage.md` — cross-reference target if an id-builder module is introduced for any of the fallback cases.

### Architectural Decisions

- `docs/superpowers/tasks/2026-08-05-epmcdme-8420-consolidate-navigationmore-contextid/plan.md` — prior completed task (phase: maintenance, completed 2026-08-05) that introduced the contextId consolidation across all 24 NavigationMore consumers, including the 6 pairs this task now cleans up. No open/conflicting work there — it is fully merged into the current branch history. This task is a direct, sequential follow-up cleanup, not a competing change.
- Current branch (`EPMCDME-8420_no-accessible-name-for-triple-dots-button`) commit history shows continuous EPMCDME-8420 accessibility work; this task continues that ticket.

### Derived Conventions

`aria-labelledby` composition pattern (`${buttonId} ${contextId}`) is fixed by `NavigationMore`'s public API, which is explicitly out of scope to change. All fixes must work within that contract.

---

## 4. Testing Landscape

### Existing Coverage

Reference pattern (correct, DOM-resolution — do not hardcode ids):
- `src/pages/katas/components/__tests__/KataActions.accessibility.test.tsx:73`
- `src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx:72`

Both resolve `aria-labelledby` off the rendered DOM (`getAttribute('aria-labelledby').split(/\s+/)`, then `document.getElementById(...)`) rather than asserting a literal id string.

**5 test files to convert from hardcoded id literal to DOM resolution** (required by task acceptance criteria):
- `src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx`
- `src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx`
- `src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx`
- `src/pages/integrations/components/ProjectSettings/__tests__/ProjectSettingActionsCell.accessibility.test.tsx`
- `src/pages/workflows/components/__tests__/WorkflowsList.accessibility.test.tsx`

**Adjacent, already correct or not in scope** (do not touch): `MermaidDiagram.accessibility.test.tsx`, `UserSettings.accessibility.test.tsx`, `WorkflowActions.accessibility.test.tsx`, `WorkflowExecutionsListItem.accessibility.test.tsx`, `MCPServerDetail.accessibility.test.tsx` (already the target-shape pattern).

### Testing Framework and Patterns

Vitest + React Testing Library. No jest-axe/axe-core dependency in the repo (confirmed absent) — the accessibility-patterns guide's own "Automated Testing" section references jest-axe as an example, but it is stale/aspirational and must not be followed; DOM `aria-labelledby` resolution is the actual repo pattern.

### Coverage Gaps

None beyond the 5 conversions above — every one of the 6 pairs already has an accessibility test file; the gap is that 5 of them assert against a hardcoded string instead of resolving the relationship, which the task's acceptance criteria requires fixing.

---

## 5. Configuration and Environment

### Environment Variables

None relevant.

### Configuration Files

None relevant — purely component-level TypeScript/TSX changes.

### Feature Flags and Deployment Concerns

None.

---

## 6. Risk Indicators

- **`ProvidersManagementPage.tsx:103`** — producer is an inline JSX expression inside `customRenderColumns.name`, not a standalone component. Extracting a row component here is more invasive than the list-row cases; the useId()-in-a-map constraint applies directly since this is a table column renderer. Judge whether extraction or the builder-function fallback fits better.
- **`SkillCard.tsx` → `Card.tsx`** — two-hop escape through a generic shared `Card` component (`src/components/Card/Card.tsx:94`). Must verify `Card.tsx` has no other unrelated consumers before changing its id-generation contract, since it's a shared primitive, not feature-specific.
- **`WorkflowCard.tsx` → `WorkflowsList.tsx`** — `workflow-name-${id}` template also appears in a test file (per task context, "4 production sites plus a test"); the useId()/builder fix must not leave that test asserting a now-stale literal.
- **`KataActions.tsx` / `KataDetailView.tsx`** — explicitly out of scope; duplicated template resolves locally in each file already. Confirm during implementation that no accidental changes touch these.
- **No jest-axe in repo** despite the guide's stale example — do not add axe-core as a new dependency; follow the DOM `aria-labelledby` resolution pattern already proven in `KataActions.accessibility.test.tsx` and `AssistantActions.accessibility.test.tsx`.
- **Codegraph research budget** was capped mid-session; verbatim source for `DataSourceActions.tsx`, `MCPServerActions.tsx`, `columnRenderers.tsx`, `WorkflowsList.tsx`, `WorkflowCard.tsx`, `SkillActions.tsx`, `SkillCard.tsx`, `SkillDetails.tsx`, `Card.tsx`, `DataSourceName.tsx` was not pulled during research — all paths are confirmed to exist via Glob, but must be Read directly during planning/implementation before editing.

---

## 7. Summary for Complexity Assessment

This task touches 6 independent producer/consumer file pairs (12 distinct source files) plus 5 test files plus 1 documentation guide — roughly 18 files total, all within the presentational UI layer (React components, no store/service/API involvement). The core mechanism (`NavigationMore`'s `aria-labelledby` composition) is fixed and explicitly not to be touched, which bounds the blast radius: every fix is local to how each pair generates and shares its id string, using one of two already-proven in-repo patterns (`useId()` co-location, demonstrated in `MCPServerCard.tsx`/`MCPServerDetail.tsx`; or an exported builder function, a new but simple pattern).

Technical novelty is low — no new architecture, no new dependencies (no jest-axe to add), and the target patterns already exist in the codebase as working references. The main judgment work is per-pair: deciding useId()-with-extraction vs. builder-function fallback for each of the 6 pairs, with one pair (`ProvidersManagementPage.tsx`, a table column renderer) flagged as the most likely candidate for the builder fallback since it isn't a natural list-row extraction, and one pair (`SkillCard.tsx`/`Card.tsx`) flagged for extra care due to `Card.tsx` being a shared generic component.

Test coverage posture is good — all 6 pairs already have accessibility tests; the work is converting 5 of them from a hardcoded-literal assertion to the already-proven DOM-resolution pattern (2 reference examples exist in-repo). Risk factors are consolidation risk (drifted templates, e.g. `workflow-name-${id}` at 4+1 sites) and one 2-hop shared-component dependency, both manageable with per-pair verification before editing.
