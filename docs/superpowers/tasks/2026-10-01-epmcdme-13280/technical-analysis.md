# Technical Research

**Task**: assistants skills configuration catalog
**Generated**: 2026-10-01T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix Jira ticket EPMCDME-13280 (Bug, codemie-ui repo).

Summary: Assistant configuration displays skill name as "null" and the skill cannot be found in the Assistants catalog.

Description: On the assistant configuration page, one of the skills attached to the assistant is displayed as the literal string `null` in the Skills field. The skill was added automatically during assistant creation and is present in the list of used skills, but it is not searchable or openable in the Assistants (Skills) catalog. On the assistant details view, the same skill is rendered with its actual name, `codemie-speech-presentation-content`, indicating a UI/data-binding inconsistency in the configuration form.

Preconditions:
- User is authenticated in CodeMie UI.
- An assistant exists that was created with skills auto-attached, including `codemie-speech-presentation-content`.
- User can access the assistant configuration and the Assistants/Skills catalog.

Steps to reproduce:
1. Open the affected assistant.
2. Open the Skills section in the assistant configuration form.
3. Observe the applied skills in the Skills field.
4. Open the assistant details panel and check the SKILLS block.
5. Search for the skill by name in the Assistants (Skills) catalog / Marketplace.

Expected result:
- Applied skills appear with their real names in the configuration Skills field.
- Every displayed skill can be found in the Assistants (Skills) catalog.
- The configuration Skills field matches the SKILLS block on the assistant details panel.

Actual result:
- The configuration field displays `epam-pptx-template, branded-slides-pptx, null, humanizer`.
- The details panel displays the affected skill as `codemie-speech-presentation-content`.
- The skill cannot be found in the Assistants (Skills) catalog by name.
- The skill was auto-attached during assistant creation.

Affected areas:
- Assistants UI — assistant configuration page (Skills section)
- Skills catalog / Marketplace search
- Skills data binding between the configuration form and details panel
- Auto-attachment of skills during assistant creation

Acceptance criteria:
- Skills applied to an assistant are always rendered with their real names in the configuration Skills field; no `null` values appear.
- The configuration Skills field is consistent with the SKILLS block on the assistant details panel.
- Every attached skill is discoverable in the Assistants (Skills) catalog by its name.
- The root cause of the `null` display is identified and fixed, whether in the data model, API response, or UI mapping.
- Regression is covered for skills auto-attached during assistant creation.
- The fix is verified on the reference assistant.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` — the assistant configuration form. Line 304: `skill_ids: assistant?.skills?.map((s) => s.id) ?? []` seeds the form's `skill_ids` field with **ids only**, discarding the `name` already present on `assistant.skills[]`. The Skills accordion (around line 821-843) renders `<SkillSelector {...field} project={project} />` bound to this `skill_ids` array of plain id strings.
- `src/components/SkillSelector.tsx` — the Skills multiselect used by `AssistantForm`. Receives `value: (string | undefined)[]` (ids only, no names). Builds `options` purely from `useSkillSelector(project)` and renders a PrimeReact-wrapped `MultiSelect` (`display` prop not set → defaults to PrimeReact's "comma" label mode, not `"chip"`). It does **not** merge any "hidden option" for a selected id that is absent from `options` — contrast with `AssistantSelector` below.
- `src/hooks/useSkillSelector.tsx` — loads dropdown options via `skillsStore.getSkillsForProject(project)`, which calls `GET v1/skills` with `filters.scope = SKILL_INDEX_SCOPES.PROJECT_WITH_MARKETPLACE`. Any skill not resolvable under this project/marketplace scope (e.g. a system/auto-attached skill) is silently absent from `options`.
- `src/store/skills.ts` (`skillsStore`) — `getSkillsForProject` (project+marketplace scoped), `indexSkills` (used by the Skills catalog page with `scope` filter: `project` / `marketplace` / `favorites`), `getSkillById`, `getAssistantsUsingSkill`. No method resolves one or more skills **by id** independent of project/marketplace scope — there is no equivalent of `assistantsStore.getAssistantOptions(..., { ids })` used by the analogous assistant-selector fix (see Patterns below).
- `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx` — the assistant details SKILLS block (lines 249-259). Renders directly from `assistant.skills.map((skill) => ({ value: skill.name, ... }))`, i.e. straight from the full `Skill` objects embedded in the `Assistant` the backend returned — no catalog lookup involved, which is why this view shows `codemie-speech-presentation-content` correctly.
- `src/store/utils/assistants.ts` (`transformAssistantToCreateDTO`) — on save, uses `assistant.skill_ids ?? assistant.skills?.map((s) => s.id)`, i.e. only ids are round-tripped to the backend; names are never required here.
- `src/types/entity/assistant.ts` — `Assistant.skills?: Skill[]` (full objects with `name`). `src/types/entity/skill.ts` — `Skill.name: string` (required, non-nullable in the FE type).
- `src/components/form/MultiSelect/MultiSelect.tsx` and `useMultiSelectLogic.ts` — the shared wrapper around PrimeReact's `MultiSelect`. Does not special-case ids that are absent from `options`; it forwards `value` and `options` straight through to PrimeReact.
- `node_modules/primereact/multiselect/multiselect.esm.js` — PrimeReact's internal `getLabel()` (around line 1803) builds the comma-separated display string via `props.value.reduce((acc, value, index) => acc + (index !== 0 ? ', ' : '') + getLabelByValue(value), '')`. `getLabelByValue(val)` (line 1561) tries `findOptionByValue(val, props.options)`, and if that is empty, tries `findOptionByValue(val, props.value)`; when `props.value` is a flat array of id strings (not option objects, as `SkillSelector` supplies) and `props.optionValue`/`optionLabel` are set to field names (`'value'`/`'label'`), `ObjectUtils.resolveFieldData` cannot resolve those fields off a bare string, so the lookup fails and `getLabelByValue` returns the literal JS value `null`. String concatenation (`acc + ... + null`) coerces that to the literal text `"null"` in the rendered label — this reproduces the exact reported string shape (`"a, b, null, c"`).
- `src/pages/assistants/components/AssistantSelector.tsx` and the related commit `1bf0010d7` ("EPMCDME-14111: Fix assistant selector null labels and stale ids on project change") — a previously fixed, structurally identical bug for the Sub-Assistants selector. The fix pattern: the selector's `value` prop carries full `{id, name, ...}` objects (not bare ids), and `getMultiselectOptions()` explicitly unions `extraOptionsTop + loaded options + hiddenOptions` where `hiddenOptions = value.filter(item => !options.find(o => o.id === item.id))` — guaranteeing every selected id has a matching, name-bearing entry in the `options` array handed to the underlying `MultiSelect`, so PrimeReact's `getLabelByValue` always resolves. `src/pages/integrations/components/SettingsForm/AssistantMultiSelectField.tsx` (added in the same commit) shows a second variant of the same pattern for callers that only hold ids: it maintains a `nameCache` and calls `assistantsStore.getAssistantOptions('', { ids: unresolvedIds, project })` to backfill names for ids not already known, falling back to the raw id (never to `undefined`/`null`) if resolution fails.

### Architecture and Layers Affected

- **Form/UI layer**: `AssistantForm.tsx` (defaultValues wiring for `skill_ids`), `SkillSelector.tsx` (selector component), `useSkillSelector.tsx` (options-loading hook), `MultiSelect.tsx` (shared selector primitive wrapping PrimeReact).
- **Details/read view layer**: `AssistantDetailsSidebarSections.tsx` (SKILLS block) — already correct; it is the reference rendering the bug report compares against.
- **Store/data layer**: `skillsStore` (`src/store/skills.ts`) — scoped skill queries (`getSkillsForProject`, `indexSkills`), no by-id/unscoped resolution method today.
- **Catalog/Marketplace layer**: `src/pages/skills/SkillsListPage.tsx`, `src/pages/skills/hooks/useSkillsFilters.ts` — tab-to-scope mapping (`project` / `marketplace` / `favorites`) that governs what is "discoverable" in the catalog; this is the same scoping that `useSkillSelector` reuses (`PROJECT_WITH_MARKETPLACE`), and is why the auto-attached skill is reportedly unsearchable there too.
- **Type layer**: `src/types/entity/skill.ts` (`Skill`), `src/types/entity/assistant.ts` (`Assistant.skills`).

### Integration Points

- `SkillSelector` → `useSkillSelector` → `skillsStore.getSkillsForProject` → `GET v1/skills?filters={scope: project_with_marketplace, project:[...]}` (HTTP via `src/utils/api.ts`).
- `AssistantForm` → `assistant.skills` (full objects, supplied by whatever endpoint returned the `Assistant`, e.g. `assistantsStore.getAssistant`) — this is the same data source `AssistantDetailsSidebarSections` renders correctly from.
- `AssistantForm` → `transformAssistantToCreateDTO` → backend assistant create/update endpoint, carrying only `skill_ids`.
- Separately, the chat-side skill selectors (`ChatConfigSkillsSelector.tsx`, `useChatConfigSkills.ts`, `useSkillsBase.ts`) use `skillsStore.indexSkills` with a `search`/relevance filter, not `getSkillsForProject`, and keep full `SkillOption{label, value, description}` objects in `selectedSkills` state (not bare ids) with `hiddenOptions` unioned into `multiselectOptions` the same way `AssistantSelector` does — i.e. the chat skills selector already avoids this bug by construction, while `AssistantForm`'s `SkillSelector` does not.

### Patterns and Conventions

- **Hidden-option union pattern** (established, used by `AssistantSelector` and `ChatConfigSkillsSelector`): when a selector's `value` can reference something outside the currently loaded `options` page/scope, build `options` as `[...loadedOptions, ...hiddenOptions]` where `hiddenOptions` comes from the caller's own `value` (which must carry a `name`/`label`, not just an id).
- **Name-cache backfill pattern** (`AssistantMultiSelectField.tsx`, same commit): when a caller only has ids (no names) at the integration boundary, resolve names via a store call scoped by id list (`assistantsStore.getAssistantOptions(..., { ids })`), cache them, and fall back to the raw id string (never to `null`/`undefined`) if unresolved.
- `skillsStore` has no equivalent of `getAssistantOptions({ ids })` for skills; adding one (or widening `getSkillsForProject`) would be required to apply the name-cache pattern to skills.
- `AssistantForm`'s `skill_ids` form field is typed `Yup.array().of(Yup.string())` (ids only) — any fix that changes the field's shape to carry names must keep `transformAssistantToCreateDTO`'s id round-trip intact.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md`, `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/development/api-integration.md` exist but contain no explicit guidance on multiselect "hidden option" handling or on `null`-label pitfalls in the PrimeReact `MultiSelect` wrapper — the convention lives only in code (`AssistantSelector`, `ChatConfigSkillsSelector`), not in a guide.

### Architectural Decisions

- No ADRs found for skills or multiselect rendering. The closest documented precedent is the commit message of `1bf0010d7` ("EPMCDME-14111: Fix assistant selector null labels and stale ids on project change"), which fixed a structurally identical defect for the Sub-Assistants selector.

### Derived Conventions

- Selector components that can hold a selection outside their currently-loaded dropdown options should carry full `{id, name}`-shaped values end-to-end and union in "hidden" selected options, rather than passing bare id strings into the shared `MultiSelect` wrapper and relying on it (or PrimeReact) to resolve labels.

---

## 4. Testing Landscape

### Existing Coverage

- No test file exists for `SkillSelector.tsx` or `useSkillSelector.tsx` (confirmed via file search — only `src/components/SkillSelector.tsx` and `src/hooks/useSkillSelector.tsx` exist, with no matching `__tests__` entries).
- `src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx` exercises the assistant edit flow but its assistant fixture uses `skills: []` — no case with a non-empty, especially partially-unresolvable, skills array.
- `src/store/__tests__/skills.test.ts` covers `skillsStore` methods directly (not confirmed to include a case where a selected skill id is absent from `getSkillsForProject`'s result).
- `src/pages/chat/hooks/__tests__/useChatConfiguration.skillShapeGuard.test.ts` tests a related but distinct concern: malformed `SkillOption` shapes persisted in `localStorage` for the chat skills selector, not the catalog-scope/options-mismatch issue reported in this ticket.
- `src/pages/assistants/components/AssistantDetails/components/__tests__/` — no `AssistantDetailsSidebarSections.test.tsx` found by name; the SKILLS block's correct rendering has no dedicated regression test either.

### Testing Framework and Patterns

Vitest + React Testing Library, two Vitest projects (`unit`, `integration`) per `vitest.workspace.ts`. Store/hook tests mock `api`/`toaster`; component tests under `__tests__/` subfolders colocated with the component.

### Coverage Gaps

- No regression test exists for: a selected skill id that is not present in `useSkillSelector`'s loaded `options` (the exact defect condition).
- No test asserts that the configuration Skills field and the details-panel SKILLS block render the same set of names for the same assistant.
- No test exists for the PrimeReact `MultiSelect` wrapper's behavior when `value` contains ids absent from `options` in non-chip ("comma") display mode.

---

## 5. Configuration and Environment

### Environment Variables

None specific to skills found in `src/utils/api.ts` or feature-area files; the Skills feature is gated behind a runtime feature flag, not an env var (see Feature Flags below).

### Configuration Files

No skills-specific config files; this is a pure in-app data/UI concern (API filters and client-side option lists), not deployment configuration.

### Feature Flags and Deployment Concerns

- `useFeatureFlag('skills')` (`FEATURE_FLAGS` constant family) gates the entire Skills accordion in `AssistantForm.tsx` (`isSkillsEnabled`) and the chat-side `ChatConfigSkillsSelector.tsx`. Any fix must keep working correctly whether this flag is on in the test/reference environment used to verify the ticket.

---

## 6. Risk Indicators

- Speculative: The literal `"null"` string is produced by PrimeReact's internal `getLabel()`/`getLabelByValue()` (`node_modules/primereact/multiselect/multiselect.esm.js`) string-concatenating a JS `null` return value when a selected id has no matching entry in `options` and `MultiSelect`'s `display` is not `"chip"`. This is a third-party library's internal behavior, not an exported API — any fix must work around it (e.g. by always providing a matching, name-bearing option) rather than patching PrimeReact.
- Speculative: The skill being "not searchable or openable in the Assistants (Skills) catalog" suggests the skill's `project`/`visibility` on the backend does not satisfy `SKILL_INDEX_SCOPES.PROJECT_WITH_MARKETPLACE` (used by `getSkillsForProject`) nor the catalog's own `project`/`marketplace`/`favorites` tab scopes (`SkillsListPage.tsx`). If that is a backend data/visibility defect rather than a pure frontend filter bug, this repo (frontend-only) cannot fully satisfy the acceptance criterion "every attached skill is discoverable in the Assistants (Skills) catalog by its name" without a corresponding backend/data fix or a documented scope exception for auto-attached/system skills — this should be confirmed before scoping the fix.
- No existing test coverage for `SkillSelector`, `useSkillSelector`, or the catalog/configuration-vs-details consistency the acceptance criteria require — any fix needs new tests written from scratch, with no fixture pattern to extend.
- `skillsStore` has no id-scoped resolution method (`getSkillById` exists but is one-at-a-time and tied to `selectedSkill`, not a batch/"hidden options" use case) — extending it (new store method, or reusing `getSkillById` in a loop/cache) is new surface, not a drop-in reuse of an existing method the way `assistantsStore.getAssistantOptions({ ids })` was reused for the prior, analogous assistant-selector fix.
- The fix must preserve `AssistantForm`'s `skill_ids: string[]` Yup schema and `transformAssistantToCreateDTO`'s id-only round-trip to the backend — a UI-side name-resolution fix must not change what is actually submitted on save.
- "Auto-attached during assistant creation" is reported as the triggering condition but no assistant-creation code path handling automatic skill attachment was located in this repo's `src/` tree in this pass — if that attachment logic is backend-only, it is out of this repo's reach and only the display/catalog-visibility symptoms are fixable here.

---

## 7. Summary for Complexity Assessment

This bug concentrates in the form/UI layer: `AssistantForm.tsx` seeds `skill_ids` with bare id strings (discarding the `name` already available on `assistant.skills[]`), and `SkillSelector.tsx`/`useSkillSelector.tsx` build the dropdown's `options` solely from a project+marketplace-scoped catalog call that silently omits ids outside that scope (e.g. an auto-attached system skill). The shared `MultiSelect` wrapper passes both straight into PrimeReact's `MultiSelect`, whose internal `getLabelByValue` returns a literal JS `null` for an unmatched id, which string-concatenation then renders as the literal text `"null"` — reproducing the reported defect exactly. The assistant-details SKILLS block renders correctly because it reads `skill.name` directly off the full `Skill` objects already embedded in the `Assistant`, with no catalog lookup involved, explaining the discrepancy the ticket calls out between the two views.

The repository already contains a structurally identical, previously fixed defect (`AssistantSelector`, commit `1bf0010d7`, "Fix assistant selector null labels and stale ids on project change"), establishing two concrete, reusable patterns: carrying full `{id, name}` objects through the selector's `value` and unioning in "hidden" selected options not present in the loaded catalog page, or backfilling names via an id-scoped store lookup with a cache and a non-null fallback. Applying either pattern to `SkillSelector`/`AssistantForm` is a bounded, single-component-family change, but it touches a form field (`skill_ids`) whose on-the-wire shape (`transformAssistantToCreateDTO`) must stay id-only.

Two factors keep this from being a trivial one-line fix. First, there is zero existing test coverage for `SkillSelector`, `useSkillSelector`, or configuration/details-panel consistency, so verification requires new tests built from scratch. Second, the catalog-discoverability acceptance criterion depends on whether the auto-attached skill's backend-side project/visibility data genuinely falls outside every catalog scope (`project`, `marketplace`, `favorites`, and the selector's `project_with_marketplace`) — a condition this frontend-only repository can observe and work around in the UI (so a selected-but-unlisted skill never degrades to `"null"`) but may not be able to resolve at the data source if the root cause is a backend indexing/visibility gap.

---

## 8. External References

None named by the task — `task_context` describes the Jira ticket content directly (as pasted ticket text) and does not point to any file, directory, or URL inside or outside this repository as a source of truth to read.
