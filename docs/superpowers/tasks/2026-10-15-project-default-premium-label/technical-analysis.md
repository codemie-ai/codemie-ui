# Technical Research

**Task**: project settings, model configuration, premium model, default model dropdown
**Generated**: 2026-10-15
**Research path**: filesystem (codegraph MCP tool not available in this environment)

---

## 1. Original Context

Jira ticket EPMCDME-15973 — "Project settings: show a 'Premium' label for premium models in the default model dropdowns and highlight when the selected default model is premium."

Full description: As a project administrator, I want to see which of the default models selected in the project's Model configuration are premium models. Today the "Project default model" and "CLI default model" dropdowns do not show whether a model is premium. A "Premium" label must be added to premium models in these dropdowns. If the selected default model is premium, this must be highlighted.

Preconditions: A project exists, user is a project administrator (or higher) of this project. User has access to the Model configuration section in project settings. The project's available models include both premium and non-premium models.

Scenarios:
1. Admin opens Model configuration section in project settings.
2. Opens "Project default model" dropdown — premium models marked with "Premium" label.
3. Opens "CLI default model" dropdown — premium models marked with "Premium" label.
4. Admin selects a premium model as default — selected default model is highlighted as premium.
5. Admin selects a non-premium model as default — no premium highlight shown.

Affected areas: Project settings → Model configuration section; "Project default model" dropdown; "CLI default model" dropdown; a related "Premium only" filter already exists in the model list elsewhere; related story EPMCDME-14349 (Project-Level Model Availability).

Acceptance criteria:
1. In the "Project default model" dropdown, each premium model has the "Premium" label.
2. In the "CLI default model" dropdown, each premium model has the "Premium" label.
3. Non-premium models do not have the "Premium" label.
4. If the selected "Project default model" is a premium model, this is visually highlighted in the Model configuration section.
5. If the selected "CLI default model" is a premium model, this is visually highlighted in the Model configuration section.
6. If the selected default model is not premium, no premium highlight is shown.
7. The set of models in the dropdowns and the logic for choosing a default model are not changed.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx` — the "Model configuration" section itself (renders `<h2>Model configuration</h2>`, line ~233). Renders, in order:
  - `<DefaultModelsSelector models={availableModels} defaultModel={draft.defaultModel} codeDefaultModel={draft.codeDefaultModel} ... />` (lines ~264-271) — this IS the "Project default model" / "CLI default model" pair named in the ticket.
  - `<ModelConfigurationTable models={models} ... />` (lines ~273-280) — the allow/deny model checklist table that already implements the "Premium only" filter and premium row highlighting referenced in the ticket as "existing elsewhere" (it is actually in the same page, right below the dropdowns).
  - `availableModels` passed into `DefaultModelsSelector` is `models.filter((model) => isModelAvailable(model, draft.selection, false))` — a plain `ModelOption[]`, so `isPremium` is already present on each entry at this point.

- `src/pages/settings/administration/projectsManagement/components/DefaultModelsSelector.tsx` — the component rendering both dropdowns. **This is the file to modify.**
  - Uses the generic `Select` component (`@/components/form/Select`), not the richer `MultiSelect`.
  - `modelOptions` memo currently **strips `isPremium`**:
    ```tsx
    const modelOptions = useMemo(
      () => models.map((model) => ({ label: model.label, value: model.value })),
      [models]
    )
    ```
    This is the root cause of the gap — `isPremium` exists on the incoming data but is discarded before building dropdown options.
  - Two `<Select>` instances: `id="project-default-model"` (label "Project default model") and `id="cli-default-model"` (label "CLI default model"), each with `options={modelOptions}`, `value`, `onChangeValue`.
  - Local state `localDefaultModel` / `localCodeDefaultModel` synced via `useEffect` from controlled props `defaultModel`/`codeDefaultModel` (owned by `ProjectModelsSection`'s `DraftState`).
  - No test file exists for this component (`__tests__/DefaultModelsSelector.test.tsx` not found).

- `src/components/form/Select/Select.tsx` — generic PrimeReact `Dropdown` wrapper used by `DefaultModelsSelector`.
  - `itemTemplate` is a **hardcoded internal** `OptionTemplate` rendering only `<p>{option.label}</p>` with a truncate tooltip — not exposed as a prop. No per-row customization available today.
  - `valueTemplate?: ReactNode` IS exposed and passed straight through to PrimeReact's `valueTemplate` — this is usable today for the "highlight the selected value" requirement without changing `Select`.
  - `options: FilterOption[]` (`src/types/filters.ts`) is `{label, value}`-shaped only. `FilterOption` does have an **unused** `badge?: string` field (grepped — nothing reads `.badge` anywhere today); could be repurposed or ignored.
  - To add a "Premium" label to each dropdown *row*, either (a) `Select` needs a new `itemTemplate`/`renderOption` prop threaded through, or (b) `DefaultModelsSelector` should switch to the custom `MultiSelect` component (used in `singleValue` mode by `LLMSelector`) which already exposes `renderOption` / `selectedItemTemplate`.

### Architecture and Layers Affected

- **Component layer**: `DefaultModelsSelector.tsx` (presentation), `ProjectModelsSection.tsx` (page section, orchestration/draft state), `Select.tsx` or `MultiSelect.tsx` (shared form primitive) — only one of these two needs new capability depending on chosen approach.
- **Type layer**: `src/types/entity/configuration.ts` — no changes needed; `isPremium` already exists.
- **Store layer**: `src/store/projectModelSettings.ts` (persists `default_model`), `appInfoStore` (source of `ModelOption[]` with `isPremium` already populated) — no changes needed.
- No backend/API changes needed. This is a pure presentation-layer change.

### Integration Points

- `appInfoStore.getLLMModels()` / `appInfoStore.getProjectLLMModels(projectName)` is the actual data source feeding `ProjectModelsSection`'s `catalog`/`availableModels` (confirmed as the active path for this page, as opposed to `src/store/llmModels.ts` which is a smaller/alternate consumer used elsewhere).
- `routerToModelOption.ts` converts `LLMRouterOption` → `ModelOption`, also preserving `isPremium` — relevant since `DefaultModelsSelector`'s `models` prop can include routers alongside concrete models.
- `projectModelSettingsStore.saveSettings(projectName, nextSettings)` persists `default_model` (string) — unaffected by this change (AC7 explicitly says the default-model selection logic must not change).
- `ProjectModelSettings.hide_premium_models` (type: `src/types/entity/projectModelSettings.ts`) is a *different*, pre-existing concern (hides premium models entirely from pickers) — must not be confused with this ticket's "label and highlight" requirement.

### Patterns and Conventions

Two established, already-shipped patterns exist for premium indication elsewhere in the app, both candidates to reuse for `DefaultModelsSelector`:

**A. Dropdown row "Premium" label — meta-line pattern (current team convention, from `LLMSelector.tsx`)**
`src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` renders a local `LlmOptionRow` component via the custom `MultiSelect`'s `renderOption` prop:
```tsx
const LlmOptionRow: FC<{ label: string; isPremium: boolean; isRouter?: boolean }> = ({
  label, isPremium, isRouter = false,
}) => {
  ...
  return (
    <span data-testid="llm-option-row" className="flex w-full min-w-0 flex-col text-left" ...>
      <span ref={labelRef} className="min-w-0 truncate">{label}</span>
      {(isRouter || isPremium) && (
        <span data-testid="llm-option-meta" className="truncate text-xs text-text-tertiary">
          {isRouter && <span className="text-in-progress-primary">Router</span>}
          {isRouter && isPremium && ' · '}
          {isPremium && <span className="text-aborted-primary">Premium</span>}
        </span>
      )}
    </span>
  )
}
```
The team deliberately moved away from an inline badge pill inside dropdown rows (see doc comment in `PremiumModelBadge.tsx` below) because it ate ~130px and truncated model names. **This meta-line pattern is the current convention for dropdown rows** and is the one to follow for AC1-AC3 (the two named dropdowns).

**B. Selected/trigger value highlight — two existing precedents**
1. *Text-note pattern* (`LLMSelector.tsx`, lines ~266-316) — no badge on the trigger; instead a quiet note below the field:
   ```tsx
   const isPremiumSelected = value
     ? models.find((model) => model.value === value)?.isPremium ?? false
     : false
   ...
   {isPremiumSelected && (
     <div className="flex items-center self-start text-xs text-text-quaternary">
       <span data-testid="llm-selector-premium-note">Premium model</span>
       <TooltipButton className="ml-1" content={PREMIUM_MODEL_TOOLTIP} iconClassName="h-4" />
       <span className="ml-1">·</span>
       <Link to={HELP_MODELS_ROUTE} className="ml-1 text-aborted-primary ... underline">
         View models and rates
       </Link>
     </div>
   )}
   ```
   The corresponding test file (`LLMSelector.premiumLayout.test.tsx`) explicitly asserts there is **no** ring/border color highlight on the trigger (`not.toContain('ring-aborted-primary')`) — i.e. the team deliberately rejected a colored-ring/border highlight for the trigger in favor of this text note + link.
2. *Badge pill pattern* (`ChatPromptLlmSelector.tsx`): `{showPremiumBadge && <PremiumModelBadge />}` next to the trigger label, using the shared `PremiumModelBadge` component.
3. *Row/section highlight pattern* (`ModelConfigurationTable.tsx`, in the very same `ProjectModelsSection` page): row background tint for premium rows and an amber cost color:
   ```tsx
   <tr key={model.value} className={cn(model.isPremium && 'bg-yellow-500/5', 'text-sm')}>
     ...
     <span>{model.label}</span>
     {model.isPremium && (
       <span className="ml-2 inline-flex">
         <StatusBadge status={StatusEnum.Warning} text="Premium" />
       </span>
     )}
     ...
     <div className="flex items-center" style={{ color: model.isPremium ? '#E6A700' : 'inherit' }}>
       {formatModelCost(model.cost)}
     </div>
   ```

Shared badge primitive: `src/components/PremiumModelBadge/PremiumModelBadge.tsx`:
```tsx
export const PREMIUM_MODEL_TOOLTIP = 'Premium model — higher usage rates apply'
const PremiumModelBadge: FC = () => (
  <span className="inline-flex shrink-0" data-tooltip-id="react-tooltip" data-tooltip-content={PREMIUM_MODEL_TOOLTIP}>
    <StatusBadge status={StatusEnum.Warning} text="Premium" />
  </span>
)
```
Its own doc comment: "The badge marks the *selected* model — the chat prompt trigger, the assistant form trigger and the models catalog. Dropdown rows no longer render it: they say 'Premium' on a meta line under the model name..." — this is the authoritative, current design decision for the whole app and should govern the implementation choice for `DefaultModelsSelector` too (meta-line in rows; badge/text-note for the selected value — AC4/AC5's "highlighted" wording leaves either variant B.1 or B.2 open, but a ring/border highlight should be avoided per existing test precedent).

`FilterOption.badge?: string` (`src/types/filters.ts`) exists but is unused anywhere in the codebase — a possible but unproven hook.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md`, `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/development/api-integration.md`, `.ai-run/guides/architecture/architecture.md` — grepped for "premium", "model configuration", "dropdown", "select", "badge": **zero matches** in any of these guides. They contain general conventions only (props as explicit interfaces, `useSnapshot` for store reads, `cn()` for conditional classes, 300-line file limit / 100-line presentation-component limit, `??` over `||`), all of which apply generically but say nothing feature-specific.
- `docs/stories/2026-08-14-premium-model-indication.md` — original story for EPMCDME-14126 "Premium Model Indication in Chat & Model Selection." Defines the premium badge/tooltip/highlight pattern for chat and assistant model pickers plus the catalog's "Premium only" filter. **Explicitly scoped to chat/assistant surfaces — project settings default-model dropdowns were never in scope.** This confirms the gap EPMCDME-15973 is meant to close.
- `docs/superpowers/specs/2026-08-13-premium-model-indication-design.md` — design doc for EPMCDME-14126. Documents: backend exposes `is_premium` on `LLMModel` only when a `premium_models` budget is configured (backend is single source of truth; frontend alias/cost-threshold inference explicitly rejected); UX decision to reuse `StatusBadge` (Warning variant) wired through each selector's own render-option hook, "no new component families." The doc predates the later refinement (meta-line replacing inline badge in rows) captured in commit history below.
- No doc anywhere references ticket EPMCDME-15973 yet. No standalone spec/plan doc found for EPMCDME-14349 under `docs/superpowers/specs|plans` (only commit messages document it).

### Architectural Decisions

- Premium flag is backend-sourced and nullable/omitted when no premium budget is configured — do not infer premium status client-side from cost or naming.
- Dropdown-row premium indication deliberately uses a text meta-line under the model name, not an inline badge, to avoid truncating names (see `PremiumModelBadge.tsx` comment and `LLMSelector.tsx` refactor history).
- Trigger/selected-value premium indication has two accepted variants in the codebase (text-note+link in `LLMSelector`, badge pill in `ChatPromptLlmSelector`) — no single mandated convention, but a colored ring/border highlight on the trigger is explicitly rejected (asserted in `LLMSelector.premiumLayout.test.tsx`).

### Derived Conventions

- Tests use `data-testid` hooks (`llm-option-row`, `llm-option-meta`, `llm-selector-premium-note`) rather than brittle class assertions — follow this when adding new premium UI.
- Mock `ModelOption` fixtures across the test suite already routinely include `isPremium: true/false` — no new fixture shape needed.

---

## 4. Testing Landscape

### Existing Coverage

- **Zero test coverage** for premium labeling/highlighting in the "Project default model" or "CLI default model" dropdowns. `DefaultModelsSelector.tsx` has no test file at all.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectModelsSection.test.tsx` exercises the surrounding section (save/apply flow, error states) but mocks `ModelConfigurationTable` entirely, does not mock or deeply assert on `DefaultModelsSelector`, and makes no assertions about premium.
- `src/pages/settings/administration/projectsManagement/components/__tests__/ModelConfigurationTable.test.ts` — the nearest in-page precedent for "Premium only" filter + row highlight — **only unit-tests pure helper functions** (`formatModelCost`, `getCapabilities`, `getProviderLabel`); it does not render the table or assert on the filter/highlight/badge behavior. So even the closest precedent isn't rendering-tested.
- `src/pages/help/ModelsCatalog/__tests__/ModelsCatalogPage.test.tsx` — DOES render-test a "Premium only" filter (fixture with `isPremium: true`, `fireEvent.click` on the checkbox, asserts filtered results). This is the clearest testable precedent for filter-style tests, though not directly reusable since this ticket's dropdowns don't add a filter.
- `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx` — the richest, most directly analogous test file: exhaustively tests the meta-line row pattern (`llm-option-meta`), the trigger premium note (`llm-selector-premium-note`), tooltip content, link to `HELP_MODELS_ROUTE`, and explicitly asserts **no** ring/border highlight on the trigger. This is the best template to adapt for `DefaultModelsSelector.test.tsx`.
- Sibling tests also exist for the chat selector's premium handling: `ChatPromptLlmSelector.test.tsx`, `.tooltipStranding.test.tsx`, `ChatPrompt.premiumTooltip.test.tsx`, `ChatPremiumModelTip.test.tsx`, `ChatPremiumModelTipSlot.test.tsx`, and `src/components/PremiumModelBadge/__tests__/PremiumModelBadge.test.tsx`.

### Testing Framework and Patterns

- Vitest (`vitest run`, projects `unit`/`integration`) + React Testing Library.
- Common conventions: `vi.hoisted()` for mock store builders, `vi.mock('@/store/...')`, `fireEvent`/`screen`, `MemoryRouter` wrapper when a component renders a `Link`, `data-testid` assertions over class-name assertions.
- Fixture `ModelOption` objects already carry `isPremium` as a standard field across the suite.

### Coverage Gaps

1. No `DefaultModelsSelector.test.tsx` exists — must be created from scratch for AC1-AC6.
2. `DefaultModelsSelector`'s `modelOptions` mapping drops `isPremium` today, so the data needed even to write a meaningful test isn't flowing through yet — functional gap, not just a test gap.
3. `Select.tsx`'s internal `OptionTemplate`/exposed `valueTemplate` have no existing premium-aware slot/test.
4. `ModelConfigurationTable`'s own premium filter/highlight has no rendering-level regression test either, despite being the pattern this ticket's dropdowns sit beside.
5. No existing test asserts a *trigger* highlight (as opposed to a row) using anything other than the text-note approach — if the eventual implementation chooses a badge-pill trigger instead, a new test pattern (not an existing one) will need to be authored.

---

## 5. Configuration and Environment

### Environment Variables

- None found. Grepped `VITE_*PREMIUM*` and `featureFlag`+premium — no hits anywhere in the codebase. Premium display is purely data-driven off `ModelOption.isPremium`, which the backend only populates when a `premium_models` budget is configured for the model.

### Configuration Files

- No feature-flag or config file gates premium display.
- `ProjectModelSettings.hide_premium_models` (`src/types/entity/projectModelSettings.ts`) is a project-level toggle that hides premium models from pickers entirely — a related but distinct, pre-existing concern. Must not be conflated with or broken by this ticket's label/highlight work.

### Feature Flags and Deployment Concerns

None identified. This is a pure frontend presentation change with no deployment-level or flag-gated concerns.

---

## 6. Risk Indicators

- `DefaultModelsSelector.tsx`'s `modelOptions` memo currently strips `isPremium` from `ModelOption[]` — this must be fixed as a prerequisite to any UI change; easy to overlook since the type already carries the field end-to-end.
- The shared `Select` component (`src/components/form/Select/Select.tsx`) has no exposed `itemTemplate`/`renderOption` prop — implementing AC1-AC3 (label inside each dropdown row) requires either extending `Select` with a new prop, or migrating `DefaultModelsSelector` to the custom `MultiSelect` component (as `LLMSelector` does in `singleValue` mode). This is an architectural choice with blast-radius implications: extending `Select` touches a widely-shared primitive (`FilterOption`/`Select` is used elsewhere in the app); migrating to `MultiSelect` is more isolated but is a bigger change to `DefaultModelsSelector` itself.
- No existing rendering-level test exists for the two closest precedents (`ModelConfigurationTable`'s premium filter/highlight), so there is no already-passing test to copy line-for-line; `LLMSelector.premiumLayout.test.tsx` is the best available template but is for a different component (`MultiSelect`-based, not `Select`-based).
- Two different "highlight the selected value" visual conventions already coexist in the codebase (badge pill vs. text-note+link) with no single mandated choice for new dropdowns — risk of inconsistent UX if the implementer picks a third variant. A ring/border highlight on the trigger is explicitly disallowed by existing test assertions in `LLMSelector.premiumLayout.test.tsx`.
- `DefaultModelsSelector.tsx` has zero existing test coverage of any kind for premium-adjacent behavior — new tests must be authored from scratch, increasing effort beyond the pure UI change.
- AC7 ("the set of models in the dropdowns and the logic for choosing a default model are not changed") means the fix must be strictly additive/presentational — any refactor of `modelOptions` or a switch to `MultiSelect` must preserve exact option set and selection behavior; regression risk if the dropdown is swapped to a different underlying primitive (`MultiSelect` vs `Select`) since `MultiSelect` in `singleValue` mode may have subtly different keyboard/accessibility/value-change semantics than PrimeReact `Dropdown`.
- `FilterOption.badge?: string` field exists unused in `src/types/filters.ts` — a tempting but unproven mechanism; nothing in the codebase currently reads it, so repurposing it is unverified territory, not an established pattern.
- Related ticket EPMCDME-14349/14781 commit `d324d0101` (dated Oct 14, i.e. very recent relative to this analysis) shows the premium/router meta-label logic in `LLMSelector` was still being hardened for a dedup edge case as of that date — if `DefaultModelsSelector` ends up sharing logic or component with `LLMSelector`, verify that fix is accounted for.
- codegraph MCP tool was not available in this environment — research relied entirely on the filesystem fallback; no risk from codegraph indexing gaps since the path wasn't used at all, but cross-reference accuracy depends on the thoroughness of the four parallel Explore agents (confirmed consistent/overlapping findings across all four, which increases confidence).

---

## 7. Summary for Complexity Assessment

This task touches a single architectural layer end-to-end: the presentation/component layer. No backend, API, type, or store changes are required — the `isPremium?: boolean` flag already exists on `ModelOption` (`src/types/entity/configuration.ts`) and already flows unmodified from `appInfoStore` through `ProjectModelsSection.tsx` into `DefaultModelsSelector.tsx`; it is simply dropped by `DefaultModelsSelector`'s own `modelOptions` mapping before reaching the dropdown. The core fix touches 1-2 files directly (`DefaultModelsSelector.tsx`, and possibly `Select.tsx` or a migration to the existing `MultiSelect` component), plus a new test file (`DefaultModelsSelector.test.tsx`) that does not exist today.

Technical novelty is low: the exact UX pattern required (a "Premium" meta-line label in dropdown rows, plus a highlight/note for a selected premium value) has already been built and refined twice elsewhere in this codebase — in `LLMSelector.tsx` (assistant form) and `ChatPromptLlmSelector.tsx` (chat), both of which went through real design iteration (inline badge → meta-line, captured in commit history and the `PremiumModelBadge.tsx` doc comment) and have corresponding tests to use as templates. The one real architectural decision is whether to extend the shared `Select` component with a per-row render prop (small, shared-primitive blast radius) or migrate `DefaultModelsSelector` to the richer `MultiSelect` component already used by `LLMSelector` (bigger local change, zero shared-primitive risk, but requires care to preserve exact option set/selection behavior per AC7).

Test coverage posture for this specific area is a clear gap: `DefaultModelsSelector.tsx` has no tests today, and even its closest sibling pattern (`ModelConfigurationTable`'s premium filter/highlight, in the very same page) is only unit-tested at the helper-function level, not at the rendering level. The best test template, `LLMSelector.premiumLayout.test.tsx`, is for a different underlying component and will need adaptation rather than direct reuse. Key risk factors for complexity scoring: (1) the Select-vs-MultiSelect architectural fork, (2) authoring tests from zero rather than extending existing coverage, (3) AC7's strict "no behavior change" constraint interacting with any component migration, and (4) two coexisting (and not fully reconciled) visual conventions for "highlighting a premium selection" in the codebase, requiring a judgment call to pick one consistently.
