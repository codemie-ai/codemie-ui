# Technical Research

**Task**: virtual assistant workflow model dropdown default-model premium-label
**Generated**: 2026-10-14
**Research path**: filesystem (codegraph MCP tool not available in this environment)

---

## 1. Original Context

EPMCDME-15923 — Workflow: the default model is duplicated in the virtual assistant configuration, and the "Premium" label is missing when a premium model is the default.

Description: When a virtual assistant is configured in a workflow, the model dropdown lists the default model twice. The first entry is "Default: <model name>" and the second is the same model as a regular item. If the default model is a premium model, the "Default: <model name>" entry has no "Premium" label, while the regular entry does.

Acceptance Criteria:
1. In the virtual assistant configuration in a workflow, the default model is displayed only once in the model dropdown.
2. The default model entry is clearly marked as the default.
3. If the default model is a premium model, its entry has the "Premium" label.
4. Other models keep their labels ("Premium", "Router") and are displayed once each.
5. Search in the dropdown does not return duplicated entries.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — the shared selector component. This is where **both bugs live**, in the `options` `useMemo` (lines 174–206):
  ```tsx
  const defaultLlmModel = useMemo(() => {
    const defaultModel = models.find((model) => model.isDefault)
    const fallbackModel = models[0]
    return defaultModel ?? fallbackModel ?? {}
  }, [models])

  const options = useMemo(
    () => [
      ...(allowEmpty ? [{ label: placeholder, value: '' }] : []),
      ...(!allowEmpty && defaultLlmModel?.value
        ? [
            {
              label: `${defaultOptionLabelPrefix}: ${defaultLlmModel?.label}`,
              value: defaultLlmModel?.value,
            },
          ]
        : []),
      ...models.map(({ label, value, isPremium, isRouter }) => ({
        label,
        value,
        isPremium,
        isRouter,
      })),
    ],
    [allowEmpty, defaultLlmModel?.label, defaultLlmModel?.value, defaultOptionLabelPrefix, models, placeholder]
  )
  ```
  - **Duplication bug**: when `!allowEmpty` (the branch `VirtualAssistantForm` always hits, since it never passes `allowEmpty`), a synthetic `"Default: <label>"` entry is prepended using only `label`/`value` from `defaultLlmModel`. The subsequent `models.map(...)` spreads the *same* model again unfiltered — nothing excludes `defaultLlmModel.value` from `models` before concatenation. The default model's `value` therefore appears twice in `options`.
  - **Missing Premium-label bug**: the synthetic `"Default: X"` entry object only carries `{ label, value }` — it drops `isPremium`/`isRouter` even though `defaultLlmModel.isPremium`/`isRouter` are available on the source object. `renderOption` (line 241) reads `option.isPremium ?? false` / `option.isRouter ?? false`, so the first ("Default:") row can never show "Premium" or "Router", while the duplicate plain row below it does show the badge correctly when applicable.
  - `renderOption` / `LlmOptionRow` (lines 52–79, 241–252) is otherwise correct — it renders a "Premium" meta line (amber, `text-aborted-primary`) and/or "Router" meta line (blue, `text-in-progress-primary`) purely from whatever `isPremium`/`isRouter` flags are present on each options entry. The fix is scoped to what's placed into the `options` array, not to the rendering logic.
  - Comments at lines 44–51 and 254–265 record a deliberate design decision: Premium reads as a second line under the model name (not a badge/pill in the trigger), to avoid truncating the model name in a narrow (~380px) panel. Any fix must preserve this layout, not reintroduce an inline badge.

- `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx` (lines 369–386) — renders the workflow virtual-assistant's "LLM model" field, consuming `LLMSelector` directly:
  ```tsx
  <FieldController
    name="llm_model_type"
    configPath="model"
    control={control}
    render={({ field, fieldState }) => (
      <LLMSelector
        label="LLM model"
        placeholder="Select model"
        className="grow max-w-sm"
        project={project}
        error={fieldState.error?.message}
        projectId={isGlobal ? undefined : project}
        preserveUnavailableSelection
        onDropdownOpen={handleLLMDropdownOpen}
        {...field}
      />
    )}
  />
  ```
  `allowEmpty` is not passed (defaults to falsy), which is exactly the branch that always injects the "Default: X" synthetic row — confirming the bug reproduces in this exact entry point. No workflow-specific override of option-building exists; the fix belongs in the shared `LLMSelector.tsx`, not in `VirtualAssistantForm.tsx`.
  - `onDropdownOpen={handleLLMDropdownOpen}` re-syncs the project's default model and shows a "Default model updated" toast on open — worth checking this doesn't itself introduce stale/duplicate state on reopen, though it is not the root cause.

- `src/hooks/useProjectLLMModels.ts` — the hook `LLMSelector` calls (`useProjectLLMModels(scopedProject)`) to get the project-scoped (or platform-wide) `ModelOption[]` list. It combines `appInfoStore.llmModels` with `appInfoStore.llmRouters.map(routerToModelOption)` and does **no deduplication** — dedup/labeling responsibility sits entirely in `LLMSelector`.

- `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx` — another consumer that wraps `LLMSelector`; same options-building code path, so structurally at risk of the same bug (not yet verified as user-visible, but a fix in `LLMSelector.tsx` benefits this consumer too).

### Prior fix for the identical defect class (reference pattern)

`docs/superpowers/tasks/2026-10-13-epmcdme-15904-assistant-model-duplication/code-review.diff` documents EPMCDME-15904, which fixed the same duplication pattern in a **sibling, independent** component — `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` (not reusing `LLMSelector`):
```tsx
const recommendedShown = !search && !!defaultModel
...
filteredSearchResults.forEach((m) => {
  // The recommended model already has its own row above; don't repeat it here.
  if (recommendedShown && m.value === defaultModel?.value) return
  list.push({ id: optionIdForModel(m.value), value: m.value })
})
```
That fix was scoped only to `ChatPromptLlmSelector.tsx` and was **never applied to `LLMSelector.tsx`**, which is why the same defect class now surfaces in the virtual-assistant workflow dropdown. `ChatPromptLlmSelector` already renders its own "Recommended" row with full model metadata (so it never needed to propagate `isPremium`/`isRouter` onto a label-only synthetic entry) — `LLMSelector`'s fix additionally needs to carry those flags onto the synthetic "Default:" row, which EPMCDME-15904 did not have to address.

### Architecture and Layers Affected

- **Store layer**: `src/store/appInfo.ts` — Valtio `proxy` store; `appInfoStore.getLLMModels()` / `getProjectLLMModels(projectId)` fetch from `GET /v1/llm_models` (or project-scoped endpoint) via `@/utils/api`, mapping `is_premium` → `isPremium`, `default` → `isDefault` on each `ModelOption`. Also `src/store/llmModels.ts` (similar mapping, `isDefault: m.default`).
- **Utility layer**: `src/utils/routerToModelOption.ts` (router → `ModelOption` conversion, sets `isDefault`, carries `isPremium`/`isRouter`), `src/utils/tooltipContent.ts` (`composeRowTooltip`, used by `LlmOptionRow`), `src/utils/projectModelFiltering.ts` (adjacent, project-level model filtering — not implicated).
- **Hook layer**: `src/hooks/useProjectLLMModels.ts` — resolves project-scoped vs. platform-wide model list; no dedup.
- **Component layer** (bug surface): `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — shared selector, 334 lines (over the guide's stated 300-line soft limit — worth noting if the fix grows the file).
- **Consumer layer**: `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx` (ticket's entry point), `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx` (sibling consumer, same risk).
- **Base UI component**: `src/components/form/MultiSelect/MultiSelect.tsx` + `useMultiSelectLogic.ts` — generic PrimeReact-based wrapper (`primereact@10.9.5` `MultiSelect`), configured by `LLMSelector` with `singleValue`, `renderOption`, `onFilter={() => {}}`.

### Integration Points

- `appInfoStore` (`src/store/appInfo.ts`) → `useProjectLLMModels` (`src/hooks/useProjectLLMModels.ts`) → `LLMSelector` (`src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx`) → `VirtualAssistantForm` (`src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx`).
- `ModelOption` type: `src/types/entity/configuration.ts` — `isDefault: boolean`, `isPremium?: boolean`, plus provider/cost fields; `isRouter` attached via `routerToModelOption`.
- `PremiumModelBadge` / `PREMIUM_MODEL_TOOLTIP`: `src/components/PremiumModelBadge/` — shared tooltip text constant consumed by `LLMSelector.tsx`.
- Backend: `is_premium` on `GET /v1/llm_models` is set only when a `premium_models` budget is configured server-side (see historical plan below) — no frontend feature flag gates premium/router display; absence of the field simply shows no badge (`isPremium ?? false`).

### Patterns and Conventions

- Options-building for "default/recommended" rows is duplicated conceptually across two independent components (`ChatPromptLlmSelector`'s combobox-item builder vs. `LLMSelector`'s flat `options` array) rather than shared via a common helper — this is exactly why the EPMCDME-15904 fix did not also cover `LLMSelector`. A shared `dedupeDefaultModel(models, defaultModel)`-style helper would prevent recurrence in any future third consumer, consistent with how `PremiumModelBadge` was already extracted to avoid duplicating badge-rendering logic.
- `??` preferred over `||` per guide conventions; `isPremium ?? false` / `isRouter ?? false` pattern used throughout for optional flags.
- PrimeReact `MultiSelect` wrapper: `filter={typeof onFilter === 'function'}` in `MultiSelect.tsx` (line ~467) — since `LLMSelector` passes a no-op `onFilter={() => {}}`, PrimeReact's own built-in client-side filtering runs against `optionLabel` (defaults to `'label'`, no custom `filterBy`). This means today, typing in the search box independently matches both the "Default: <name>" and the plain "<name>" entries by substring — the duplication bug is visible in search results too (AC 5).
- `sortedOptions` in `MultiSelect.tsx` (lines ~298–308) alphabetically sorts options by `optionLabel` and pulls selected items to top (unless `preserveOptionOrder`/`onScrollBottom` passed — `LLMSelector` passes neither). Note: today "Default: X" sorts under "D" rather than adjacent to "X" — a fix that keeps a distinctly-labeled default row should account for where it should land in the sorted list, or consider whether marking the existing row as default (e.g. inline badge/prefix on the same alphabetical position) sidesteps the sort-placement question entirely.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — confirms layering convention: Component → Store → API; stores live in `src/store/`, exported as Valtio `proxy`, read via `useSnapshot`. No model-dropdown-specific content, but `LLMSelector` already follows this (reads via `useSnapshot(appInfoStore)` / `useProjectLLMModels` hook, no direct `api.*` calls).
- `.ai-run/guides/components/component-patterns.md` — general conventions (props typing, `cn()`, 300-line soft limit, `??` over `||`). `LLMSelector.tsx` is already 334 lines — a fix that grows the options-building logic further should consider whether to extract a helper rather than inline more branches.
- `.ai-run/guides/development/api-integration.md` — confirms `appInfoStore.getLLMModels()` / `getProjectLLMModels()` follow the project's single fetch-wrapper convention (`@/utils/api`), store-only API calls.
- No guide names "model lists/dropdowns/workflow configuration" as its own topic. `.ai-run/guides/development/workflow-editor-patterns.md` exists by name but was not read in depth in this pass — worth a follow-up read before implementation if workflow-editor-specific conventions matter.

### Architectural Decisions

- `docs/stories/2026-08-14-premium-model-indication.md` (EPMCDME-14126) — the original story establishing the Premium badge requirement across "the model picker in chat or assistant configuration," with an explicit acceptance criterion that premium models must be visibly marked "Premium" on all surfaces. The current bug (missing badge on the default-model row) is a regression against this governing requirement.
- `docs/superpowers/plans/2026-08-13-premium-model-indication.md` — the implementation plan that introduced `ModelOption.isPremium`, `PremiumModelBadge`, and wired premium badges into `ChatPromptLlmSelector`, `LLMSelector` (Task 7: "Frontend — assistant form & chat Configuration selector (LLMSelector)"), and the `/help/models` catalog page. This is the historical origin of the component now exhibiting the bug.
- `docs/superpowers/tasks/2026-10-13-epmcdme-15904-assistant-model-duplication/` — prior ticket fixing the identical duplication defect class, but scoped only to `ChatPromptLlmSelector.tsx`. Confirms precedent and an accepted fix pattern (filter the regular list by the shown default's value), not yet applied to `LLMSelector.tsx`.
- `docs/superpowers/tasks/2026-09-20-restrict-llm-model-dropdown-zoo/` — another prior dropdown-shaping change with a `plan.md`/`technical-analysis.md`; not read in full in this pass but flagged as a possible source of additional dropdown conventions.

### Derived Conventions

- Inline code comments in `LLMSelector.tsx` function as living design-decision records (why Premium is a second line, why the trigger has no inline badge). Preserve these when editing; update them if the fix changes any of the stated rationale.
- Dedup-by-value-against-the-featured-row is the established pattern (per EPMCDME-15904) for "shown separately + also appears in full list" scenarios; `LLMSelector`'s fix should mirror it (`models.filter((m) => m.value !== defaultLlmModel?.value)` before mapping into the regular options), adapted to a flat options array, and additionally propagate `isPremium`/`isRouter` onto the synthetic default entry.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx` — covers unavailable/reset selection, deployment alias, project-scoped model lists, router-value acceptance. Default-model fixtures (`project-model`, `gpt-4o`) are always non-premium.
- `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx` — the most relevant existing file: covers the "Premium" meta-line rendering on option rows, trigger-surface "Premium model" note, tooltip composition, "View models and rates" link. Its default-model fixture (`GPT-4o`, `isDefault: true`) is explicitly **non-premium**; its premium fixture (`Bedrock Claude Opus 4.5` / `claude-opus-4-1`) is explicitly `isDefault: false`. **No existing test combines `isDefault: true` with `isPremium: true` on the same model** — i.e. the exact scenario in this ticket is untested.
- `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.projectModels.test.tsx` — project-scoped model list behavior.
- `src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts` — only exercises Yup validation (Claude-model temperature constraint). Does not render the form or touch `LLMSelector`/model-dropdown options at all.
- Grep confirmed no `*.test.tsx` under `src/pages/workflows` references `llm-option-row`, `Default:`, or model-dropdown contents (`AssistantSelector.test.tsx`, `AdvancedConfigTab`, `SubWorkflowTab`, `GeneralConfigTab`, `CommonStateFields`, `ConfigPanel.test.tsx` all checked).
- `src/hooks/__tests__/useProjectLLMModels.test.ts` — covers platform-list fallback, router flagging, caching/fetch-once behavior. Does not test default-model flagging or dedup (there is none in the hook to test).
- Sibling/related but out-of-scope: `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`, `ChatPromptLlmSelector.tooltipStranding.test.tsx`, `ChatPremiumModelTip.test.tsx` — cover the chat selector's separate implementation (already fixed under EPMCDME-15904), not `LLMSelector`/`VirtualAssistantForm`.

### Testing Framework and Patterns

- Vitest (`vitest run`, projects: `unit` and `integration`), `@testing-library/react` 16.3, `@testing-library/user-event`, `@testing-library/jest-dom`, `@vitest/coverage-istanbul`.
- Common pattern: `vi.hoisted()` builds a mutable mock store object; `vi.mock('valtio', ...)` returns that mock from `useSnapshot`; `vi.mock('@/store/appInfo', ...)`. Tests wrap render in `MemoryRouter` because `LLMSelector` renders a `<Link>` to the models catalog.
- Dropdown opened via `fireEvent.click(container.querySelector('.p-multiselect')!)` (PrimeReact `MultiSelect`); rows located via `data-testid="llm-option-row"`, meta line via `data-testid="llm-option-meta"`.
- Fixtures are inline arrays of `ModelOption`/`LLMRouterOption` objects (`{ value, label, isDefault, isPremium, isRouter }`) assigned directly onto the hoisted mock store — no shared fixture files for models.

### Coverage Gaps

1. No test anywhere asserts the model list rendered by `LLMSelector` contains each model exactly once when the synthetic "Default: X" entry is also present — nothing currently catches today's duplication.
2. No test fixture sets `isDefault: true` and `isPremium: true` on the same model — nothing verifies the "Default: X" row carries the "Premium" (or "Router") meta line/tooltip when the default model is premium. This is precisely the ticket's reported defect.
3. No test exercises `VirtualAssistantForm`'s rendered `LLMSelector` dropdown contents at all — the only workflow-side test (`VirtualAssistantForm.schema.test.ts`) touches Yup validation only, not DOM/options. A fix verified only via `LLMSelector`'s own tests would still leave the workflow entry point itself unverified.
4. `allowEmpty` is unset (falsy) in `VirtualAssistantForm`'s usage — exactly the branch that always prepends the "Default: X" row — but no existing `LLMSelector` test combines "`allowEmpty` unset AND default model is premium" to check row count and labels together.
5. No test exercises the dropdown's search/filter behavior against the duplicated default entry (AC 5) — i.e. nothing confirms a search term matching the default model's name returns one result, not two.

---

## 5. Configuration and Environment

### Environment Variables

- None specific to this feature. Premium/router gating is driven entirely by data (`ModelOption.isPremium`/`isRouter`), not by env vars or build-time flags.

### Configuration Files

- No dedicated config file for model-dropdown behavior; model data flows from the backend `GET /v1/llm_models` response through `appInfoStore` (`src/store/appInfo.ts`), not from local config.

### Feature Flags and Deployment Concerns

- No frontend feature flag gates premium or router display. `is_premium` is set server-side only when a `premium_models` budget is configured for the deployment; when absent/undefined on a model, the UI shows no badge (`isPremium ?? false` throughout) — this is a data-presence condition, not a flag.
- `VirtualAssistantForm.tsx` does use `useFeatureFlag('skills')` elsewhere in the same file (unrelated to this bug), confirming the project's feature-flag mechanism (`@/hooks/useFeatureFlags`) exists but is not used for premium/router gating.
- No deployment-manifest or Docker concerns — this is a pure client-side rendering/data-shaping bug confined to `src/`.

---

## 6. Risk Indicators

- `LLMSelector.tsx` is a **shared** component consumed by at least three surfaces (`VirtualAssistantForm.tsx` in the workflow editor, the regular Assistant form, and `ChatConfigLlmSelector.tsx` in chat configuration) — a fix must be verified against all consumers that hit the `!allowEmpty` branch, not just the workflow panel named in the ticket, to avoid an incomplete fix or an unintended behavior change in a sibling surface.
- No existing test combines `isDefault: true` with `isPremium: true` on the same model fixture anywhere in the codebase — the exact scenario this ticket needs fixed is currently unverified by any test, so new tests are required, not just a fix to existing assertions.
- The identical defect class was already fixed once (EPMCDME-15904) in a sibling component (`ChatPromptLlmSelector.tsx`) using a different, incompatible options-building architecture (grouped "Recommended" section vs. flat array with a synthetic row) — the fix pattern must be adapted, not copy-pasted, and risks diverging further from the chat selector's approach unless a shared helper is introduced.
- PrimeReact's built-in list sorting (`sortedOptions` in `MultiSelect.tsx`) sorts alphabetically by `optionLabel`; a "Default: X" labeled row sorts under "D" rather than next to "X". The chosen fix for AC 2 ("clearly marked as the default") needs to decide whether the default row keeps a distinct label (interacting with sort position) or whether the existing row for that model gets an inline "Default" indicator instead (avoiding the sort-placement question) — this is a design decision, not just a code change.
- PrimeReact's default client-side filtering (`filter={typeof onFilter === 'function'}`, with `LLMSelector` passing a no-op `onFilter`) matches against `optionLabel` with no custom `filterBy` — today this means the duplicate rows both independently satisfy a search by model name. Any fix needs explicit verification against AC 5 (search does not return duplicates), since the filtering substrate is PrimeReact's own, not custom code the fix directly touches.
- `LLMSelector.tsx` is already 334 lines, over the guide's stated 300-line component soft limit — a fix that adds branching logic to `options`/`defaultLlmModel` should consider extracting a small pure helper (e.g., a dedupe/merge function) rather than growing the component inline further.
- No codegraph MCP tool was available in this environment — all research used filesystem tools (Glob/Grep/Read via three parallel Explore agents). Cross-reference confidence is high because all three independent threads converged on the identical root cause (same file, same lines, same two defects) and matched the file against a direct `Read`.

---

## 7. Summary for Complexity Assessment

This is a well-localized bug fix: both defects (duplicate default-model entry and missing Premium label on that entry) are traceable to a single `useMemo` block (`options`, lines 180–206) inside one shared component, `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx`. The workflow virtual-assistant panel (`VirtualAssistantForm.tsx`) does not own any dropdown-building logic itself — it simply renders `LLMSelector` with `allowEmpty` unset, which is exactly the branch that triggers the bug. The fix touches the Component layer only; no Store, Hook, or Backend changes are required, since `isPremium`/`isRouter`/`isDefault` data already flow correctly into `models` — the bug is purely in how the synthetic "Default:" row is constructed and failed to be excluded from (or merged with) the regular model list. Expected file-change surface is small: the `options`/`defaultLlmModel` logic in `LLMSelector.tsx`, plus new/updated tests.

Technical novelty is low — this is a known defect class with a documented precedent fix (EPMCDME-15904, applied to the sibling `ChatPromptLlmSelector.tsx` component using a filter-by-value approach), though that pattern must be adapted rather than copied because `LLMSelector` uses a flat options array and additionally needs to propagate `isPremium`/`isRouter` flags onto the synthetic default row — a step the prior fix didn't need. A secondary design decision (how the default entry should sort alphabetically, and whether PrimeReact's built-in search needs any special-casing to avoid resurfacing the dedup problem) adds minor judgment calls beyond a pure one-line fix.

Test coverage posture is a notable risk factor: the most relevant existing test file (`LLMSelector.premiumLayout.test.tsx`) deliberately never combines `isDefault: true` with `isPremium: true`, meaning the exact scenario in this ticket has zero existing regression coverage, and the workflow entry point (`VirtualAssistantForm.tsx`) has no DOM-level test of its model dropdown at all (only a Yup-schema test exists). New tests are required at both the shared-component level (default+premium combination, dedup assertion, search-no-duplicate assertion) and ideally at the workflow-panel level to close the gap between "component fixed" and "ticket's acceptance criteria verified from the actual entry point."
