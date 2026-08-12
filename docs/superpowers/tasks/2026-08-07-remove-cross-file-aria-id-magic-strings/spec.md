# Remove cross-file ARIA id magic strings — Design

## Problem

`NavigationMore` accepts a `contextId` prop and sets `aria-labelledby={${buttonId} ${contextId}}`, giving its icon-only menu button a context-aware accessible name. It has 24 consumers. In 6 of them, the id template is written independently in two different files — once as the producer's `id={...}` (the DOM element the accessible name points at) and once as the consumer's `contextId={...}` — with nothing linking them. A rename in one file silently breaks the accessible name: no compile error, no runtime error, only a screen-reader regression.

**Goal:** No `aria-labelledby` reference depends on an id template written in a different file.

## Approach

Two mechanisms, chosen per pair based on whether a single component already owns (or can cleanly own) both the heading and the menu:

1. **`useId()` co-location** — the owning component generates the id once and threads it down as a prop to both sides. Used when one component already renders both, or is the sole caller of the consumer, with no `.map()` in the way.
2. **Imported builder function** — a small named function (e.g. `dataSourceNameId(id: string) => \`datasource-name-${id}\``) exported from `src/utils/ariaIds.ts`, imported by both producer and consumer. Used when the pair is split across independently-invoked Table column renderers with no shared owning component — restructuring the Table itself to support row-level `useId()` is out of scope. No generic `entityNameId(scope, id)` — each builder is narrowly named for its one pair, so a rename is a compile error and find-references answers "who depends on this id."

## Per-pair resolution

| Pair | Verdict | Reasoning |
|---|---|---|
| `DataSourceActions.tsx` ↔ `DataSourceName.tsx` | Builder: `dataSourceNameId` | Independent Table column renderers in `DataSourcesPage.tsx`'s `customRenderColumns` (`actions` and `repo_name` keys) — no shared row component to own a `useId()` call |
| `ProviderActions.tsx` ↔ `ProvidersManagementPage.tsx` | Builder: `providerNameId` | Same Table pattern; the producer is inline JSX inside `customRenderColumns.name` (`ProvidersManagementPage.tsx:103`), not even its own component — extraction would be more invasive here than a typical list-row case |
| `MCPServerActions.tsx` ↔ `columnRenderers.tsx` | Builder: `mcpServerNameId` | Same Table pattern as the two above |
| `WorkflowsList.tsx` ↔ `WorkflowCard.tsx` | Builder: `workflowNameId` | `WorkflowCard.tsx:215` renders `id={nameId}` from a prop — it does not template anything itself, so it isn't actually a "producer" in the drift sense. The real duplication is entirely caller-side: `WorkflowsList.tsx` writes the literal `workflow-name-${workflow.id}` twice (lines 293 and 299, inside a `.map()`), and `WorkflowActions.tsx:154` independently writes the identical literal for an unrelated default-slot render path used by `FavoritesPage`/`WorkflowTemplates`. A shared builder, used in both `WorkflowsList.tsx` (once per row, replacing both literals) and `WorkflowActions.tsx`, removes all three duplicate literals without any component restructuring |
| `SkillActions.tsx` ↔ `SkillCard.tsx` → `Card.tsx` | `useId()` | `SkillCard.tsx` already renders both `Card` (via its `titleId` prop) and `SkillActions` (via `renderActions()`) in one component, with no `.map()` in the way — `SkillCard` generates the id once, passes it to `Card`'s `titleId`, and threads a new `nameId` prop into `SkillActions`, replacing its internal `skillNameId` template (`SkillActions.tsx:163`) |
| `SkillDetailsActions.tsx` ↔ `SkillDetails.tsx` | `useId()` | `SkillDetails.tsx` is the sole caller of `SkillDetailsActions` (confirmed — no other usages in the repo) and renders it directly, no `.map()`. Same pattern as the Skill pair above: generate once in `SkillDetails`, thread down as a new prop. This deviates from the task's own illustrative builder-function example — extraction turned out unnecessary once the actual call structure was read |

## Implementation risk — duplicate DOM id in the workflow pair

`WorkflowCard.tsx:75` declares `nameId?: string` (optional) and renders it at `:215`. At `:291`, when `navigationSlot` is not supplied, it falls through to `<WorkflowActions>`, which builds `workflow-name-${workflow.id}` itself and renders its own `sr-only` span with that id.

Today the two paths are mutually exclusive — `WorkflowsList` always supplies `navigationSlot`, and on the default path `nameId` is undefined so React omits the attribute. Once both sides call `workflowNameId(workflow.id)`, correctness depends entirely on that exclusivity continuing to hold.

Duplicate ids do not throw; `aria-labelledby` silently resolves to whichever element appears first in the document. Implementation must verify both render paths, and add a test asserting exactly one element carries the id (`document.querySelectorAll('#' + id).length === 1`) for both the `WorkflowsList` path and the default `FavoritesPage`/`WorkflowTemplates` path.

## Shared module

New file `src/utils/ariaIds.ts` exports the 4 builder functions used by the Table-pair cases:

```ts
export const dataSourceNameId = (id: string) => `datasource-name-${id}`
export const providerNameId = (id: string) => `provider-name-${id}`
export const mcpServerNameId = (id: string) => `admin-mcp-name-${id}`
export const workflowNameId = (id: string) => `workflow-name-${id}`
```

(Exact template strings preserved from current production code so no DOM ids change and existing non-hardcoded assertions keep working.)

## Testing

Convert the 5 tests that currently hardcode the resolved id as a string literal to resolve `aria-labelledby` off the rendered DOM instead, per the pattern already proven in `KataActions.accessibility.test.tsx:73` and `AssistantActions.accessibility.test.tsx:72` (`getAttribute('aria-labelledby').split(/\s+/)`, then `document.getElementById(...)`):

- `SkillDetailsActions.accessibility.test.tsx`
- `DataSourceActions.accessibility.test.tsx`
- `ProviderActions.accessibility.test.tsx`
- `ProjectSettingActionsCell.accessibility.test.tsx`
- `WorkflowsList.accessibility.test.tsx`

This conversion is required regardless of which mechanism a given pair uses, since `useId()` values are not predictable strings.

`ProjectSettingActionsCell.accessibility.test.tsx` was also flagged as a candidate during research, but `ProjectSettings.tsx` (see Out of scope) has no production change in this task — its two independent `project-setting-name-${id}` literals stay untouched, matching the Kata precedent. The "`useId()` values are not predictable" rationale doesn't apply there. Its existing test already resolves `aria-labelledby` off the DOM rather than asserting a literal (it only hardcodes a matching `<span id="project-setting-name-ps-1">` fixture to mirror the unchanged production template), so it needs no change and is not part of this task's test-conversion work.

No jest-axe/axe-core — not a dependency in this repo, and adopting it is out of scope.

## Documentation

Extend `.ai-run/guides/patterns/accessibility-patterns.md` with a new section on cross-component id sharing, covering the three cases in one decision rule:

- Same-file, single instance → local `const` (existing guidance, unchanged)
- One component owns both the heading and the menu (or is the sole caller), no `.map()` in the way → `useId()`, threaded down as a prop
- Split across independently-invoked renderers (e.g. Table column renderers) with no shared owning component → an imported builder function, one per pair, from a shared module — never a generic `entityNameId(scope, id)`

Cross-reference from `.ai-run/guides/development/constants-usage.md`, since `ariaIds.ts` is a new constants-adjacent module.

## Out of scope (confirmed, not touched)

- **`KataActions.tsx` / `KataDetailView.tsx`** — both independently write `kata-name-${id}`, but each renders its own `sr-only` span and reads only its own id, so neither can break the other. They also cannot co-render: `KataDetailView` is a route component (`router.tsx:338`) while `KataActions` renders in the list page (`AIKatasContent.tsx:350`), so there is no duplicate-DOM-id risk either. `WorkflowActions.tsx` has the same self-contained shape but *is* included, because `workflow-name-` is already being changed for the `WorkflowsList` path — covering it there costs nothing, whereas Kata would be net-new scope for no reduction in risk.
- **`NavigationMore`'s public API** — the bug is entirely in how callers generate the value they pass as `contextId`, not in how `NavigationMore` consumes it. `NavigationMore` already generates its own internal ids correctly via `useId()`.
- **The 16 same-file consumers** (e.g. `ChatSidebarAssistants.tsx:102`) — already compute their id in a local `const` used for both the heading and `contextId` within one file; only one file could ever drift.
- **The 2 existing `useId()` consumers** (`MCPServerCard.tsx`, `MCPServerDetail.tsx`) — already the target pattern; nothing to change.
- **`ProjectSettings.tsx`** (exports `ProjectSettingActionsCell`) — independently writes `project-setting-name-${id}` twice in the same file (`customTableColumns.alias` renderer and `ProjectSettingActionsCell`, same Table-renderer shape as the DataSource/Provider/MCPServer pairs but same-file rather than cross-file). Discovered during planning; left untouched to match the Kata precedent — same-file duplication with no live cross-file reference is a lower-priority risk than the 6 named pairs, and this task's scope was fixed at spec approval.

## Acceptance criteria

- No `aria-labelledby` reference depends on an id template written in a different file.
- Each of the 6 pairs resolved via `useId()` co-location or an imported builder from `src/utils/ariaIds.ts`.
- The 4 hardcoded-id tests converted to DOM resolution (`SkillDetailsActions`, `DataSourceActions`, `ProviderActions`, `WorkflowsList` — `ProjectSettingActionsCell`'s test needs no change, see Testing).
- Full test suite, lint, and build green.
- `.ai-run/guides/patterns/accessibility-patterns.md` updated with the cross-component decision rule; `constants-usage.md` cross-referenced.
