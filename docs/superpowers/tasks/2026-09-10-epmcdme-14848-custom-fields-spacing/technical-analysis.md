# Technical Research

**Task**: jira datasource custom-fields multiselect form-spacing
**Generated**: 2026-09-10
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14848 — Custom fields input lacks spacing between selected values and nearby form elements.
Bug for original task EPMCDME-14093 "Allow Jira datasource to index configurable custom fields".

Summary: The custom fields selector in the Jira datasource configuration form has insufficient
visual spacing. Selected custom field values are displayed too close to each other and to
surrounding form elements, which makes the input look cramped and inconsistent with the rest of
the form layout.

Steps to reproduce: Open the Jira datasource creation or edit form. Navigate to the
"Custom fields (optional)" selector. Select multiple custom fields (e.g. "Due Date",
"CHART Date of First Response"). Observe the spacing inside the input and around the selected
custom field values.

Expected: Selected custom field values have sufficient spacing/padding inside the input; the
custom fields input has consistent vertical and horizontal spacing relative to nearby form
elements; layout stays aligned with the rest of the datasource configuration form; values are
easy to read and interact with.

Actual: Selected values displayed too close to each other; the input appears too close to
surrounding form elements; layout looks cramped and visually inconsistent.

Acceptance criteria:
- The custom fields selector has consistent spacing/padding according to the application UI style.
- Multiple selected custom field values do not appear cramped or visually merged.
- The custom fields input is not too close to surrounding form elements.
- Fixed for both Jira datasource creation and edit flows.
- Layout remains correct in dark theme.
- No regression for other datasource configuration inputs or selectors.

Additional requirement from the user: increase the space between the "Custom fields (optional)"
field and the selector for the "Model used for embeddings" field.

This is a UI/CSS-only change.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/JiraCustomFieldsField.tsx` —
  the component that renders the "Custom fields (optional)" selector. Label constant
  `CUSTOM_FIELDS_LABEL = 'Custom fields (optional)'` (line 40). It renders the shared
  `MultiSelect` inside a `Controller` for form field `jiraCustomFields`, with props:
  `className="mb-3"`, `display="chip"`, `showCheckbox`, `fullWidth`, `hasVirtualScroll`,
  `renderOption={renderFieldOption}`, `selectedItemTemplate={renderSelectedItem(nameById)}`.
  It does **not** pass `size`, `inputClassName`, or `errorClassName`.
  Its `renderSelectedItem` returns a bare `<span title={value}>{name}</span>` with no classes.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeJira.tsx` — the Jira
  section layout. Order of children inside a single plain `<div data-onboarding="datasource-jira-fields">`:
  1. `Input` for `jql` with `rootClass="mb-4"` (line 67),
  2. `<EmbeddingsModelField control={control} embeddingModels={embeddingModels} />` (line 75) — no `className` passed,
  3. `<JiraCustomFieldsField … />`,
  4. `<IntegrationSection … integrationLabel="Integration for Jira" />`.
  The parent `div` uses no `flex`/`gap`; spacing between children comes only from each child's own margin classes.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/EmbeddingsModelField.tsx` —
  renders `FormAutocomplete` with `label="Model used for embeddings"`, `name="embeddingsModel"`,
  and forwards an optional `className` prop (undefined from `IndexTypeJira`).
- `src/components/form/FormAutocomplete/FormAutocomplete.tsx` — wraps `Autocomplete` in
  `<div className={className}>` with **default `className = 'mt-4'`**. Because `IndexTypeJira`
  passes no `className`, the embeddings field carries `mt-4` above itself and nothing below.
- `src/components/form/MultiSelect/MultiSelect.tsx` — the shared multiselect (PrimeReact
  `MultiSelect` wrapper). Relevant details:
  - Outer wrapper: `<div className={cn('relative flex flex-col', fullWidth && 'flex-grow', className)}>` —
    so `className` (`mb-3` here) lands on the wrapper.
  - The same `className` is **also** forwarded to the PrimeReact element:
    `className={cn(className, mappedSizeClassname, inputClassName)}` (line 391), so `mb-3` is applied twice
    (wrapper and inner control).
  - `mappedSizeClassname`: `small` → `'h-8 max-h-8'`, `medium` → `'h-[44px] py-[5px]'`. Default `size` is
    `MultiSelectSize.SMALL`; `JiraCustomFieldsField` therefore gets `h-8 max-h-8` (32px fixed).
  - `preparedPreset` (lines 286–345) overrides the PrimeReact passthrough `label` slot with
    `display === 'chip' ? 'flex flex-wrap gap-2 text-text-unfocused' : 'text-text-unfocused'`. This
    **replaces** the `label` entry of `ptPreset`, discarding the padding that preset defines.
  - Label element markup: `<label htmlFor={id} className="text-xs pb-2 text-text-quaternary flex items-center">`
    — the 8px `pb-2` is the entire gap between the field label and the control.
  - Error slot: `'text-sm text-failed-secondary input-error-message mt-2'`.
- `src/components/form/MultiSelect/ChipWrapper.tsx` — renders each selected chip when
  `display === 'chip'`:
  `className="inline-flex items-center gap-1.5 py-0.5 px-2 h-7 rounded-lg border border-border-structural bg-surface-base-secondary text-text-primary font-geist-mono text-xs leading-6 font-semibold cursor-default"`,
  plus an `XMarkSvg` with `"w-4 h-4 ml-2 rounded-md leading-6 …"`. Chip height is fixed at `h-7` (28px).
- `src/components/form/MultiSelect/ptPreset.ts` — PrimeReact passthrough preset. Its `label` entry
  (lines ~62–95) declares chip-mode spacing `'py-3 px-3'` (empty) / `'py-1.5 px-3'` (has values) and
  `'flex flex-wrap gap-2'`; its `root` entry declares `{ 'min-h-11': props.display === 'chip' }`.
  Its `token` entry (`'py-0.5 px-2 mr-2 gap-1.5 h-7 rounded-lg border border-border-structural bg-surface-interactive-active …'`)
  is the PrimeReact-native chip style; it is not what renders here, since `selectedItemTemplate` +
  `ChipWrapper` take over chip rendering.
- `src/assets/stylesheets/vue_components.scss` (lines 78–200) — global SCSS overrides for
  `.p-multiselect`, imported by `src/main.tsx` (line 30) and `src/authentication/keycloak-theme/keycloakify.tsx`:
  - `.p-multiselect { @apply py-0 border border-border-primary rounded-lg bg-surface-base-content min-w-full max-w-full; @apply hover:border-border-secondary h-[34px]; }`
  - `.p-multiselect .p-multiselect-label-container { @apply flex items-center flex-wrap; }`
  - `.p-multiselect .p-multiselect-label { @apply text-sm text-text-primary truncate pl-3 pr-1 py-0; }`
  - `.p-multiselect .p-multiselect-label .p-multiselect-token { @apply py-0.5 pl-2 pr-1 text-xs -ml-1 bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg; }`
  - `.p-multiselect .p-multiselect-trigger { @apply w-[18px] mr-2; }`
  These global rules coexist with the Tailwind classes emitted by `ptPreset`/`preparedPreset`; the
  `py-0` and `h-[34px]` declarations here are the file-level source of the control's vertical compression.
- `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx` — the single form used by both
  create and edit. Line 547 renders `<IndexTypeField.Jira …>` when `field.value === INDEX_TYPES.JIRA`.
  Section container at line 302: `cn('flex flex-col gap-4 py-10', isPopup && 'py-2')`; the common-fields
  block at line 315 uses `flex flex-col gap-4`.
- `src/pages/dataSources/DataSourceCreatePage.tsx` (line 70) and
  `src/pages/dataSources/DataSourceEditPage.tsx` (line 148) both render the same `DataSourceForm`.
  `src/pages/dataSources/components/DataSourceForm/EditIndexPopup.tsx` re-exports/wraps it and is also
  used from `src/pages/assistants/components/AssistantForm/components/ContextSelector.tsx` (line 303).

### Architecture and Layers Affected

- **Page/feature layer** — `src/pages/dataSources/components/DataSourceForm/IndexTypeField/`
  (`JiraCustomFieldsField.tsx`, `IndexTypeJira.tsx`, `shared/EmbeddingsModelField.tsx`).
- **Shared component layer** — `src/components/form/MultiSelect/` (`MultiSelect.tsx`, `ChipWrapper.tsx`,
  `ptPreset.ts`) and `src/components/form/FormAutocomplete/FormAutocomplete.tsx`.
- **Global stylesheet layer** — `src/assets/stylesheets/vue_components.scss` holds the `.p-multiselect`
  overrides; it is outside the "Tailwind only" rule stated in the styling guide and is loaded globally.
- **Theme layer** — `tailwind.config.ts` `themeTokens`; chips use `bg-surface-base-secondary`,
  `border-border-structural` (`tailwind.config.ts` line 320), `text-text-primary` — all theme-aware pairs.
- No store, API, routing, or type changes are implicated; `src/store/dataSources.ts` `getJiraFields`
  and `types/entity/dataSource.ts` `JiraFieldOption` are read-only context here.

### Integration Points

- `JiraCustomFieldsField` → `dataSourceStore.getJiraFields(projectName, settingId)`
  (`src/store/dataSources.ts`, around line 213) for the option list; unrelated to layout.
- `JiraCustomFieldsField` → `@/components/form/MultiSelect/MultiSelect` (shared, 30+ consumers).
- `MultiSelect` → `primereact/multiselect` (PrimeReact passthrough API) plus the global SCSS overrides.
- `MultiSelect` → `@/hooks/useInputWidth` (panel width) and `@/hooks/useIsTruncated`.
- `EmbeddingsModelField` → `FormAutocomplete` → `src/components/form/Autocomplete/Autocomplete.tsx`.

### Patterns and Conventions

- Spacing in the datasource index-type sections is expressed per-field, not by a parent `gap`:
  `rootClass="mb-3"` / `rootClass="mb-4"` on `Input` (e.g. `IndexTypeJira.tsx:67`,
  `IndexTypeConfluence.tsx:68`, `IndexTypeXray.tsx:66`, `IndexTypeAzureDevOpsWiki.tsx:67,84`,
  `IndexTypeSharePoint.tsx:167,219,235`, `IndexTypeXWiki.tsx:73,90`), `rootClass="mt-4"` in
  `IndexTypeGit.tsx:100,117` and `IndexTypeSvn.tsx:83`, `className="mb-4"` wrappers in
  `SharePointContentTypesSection.tsx:31` and `SharePointMicrosoftSignIn.tsx:40`.
  `IndexTypeGoogle.tsx:64` uses a negative-margin correction `-mb-4 -mt-2`.
- `FormAutocomplete` owns its own default vertical rhythm via `className = 'mt-4'`.
- `MultiSelect` chip mode is used in exactly two places (`display="chip"`):
  `JiraCustomFieldsField.tsx:151` and `AssistantForm.tsx:662` (which routes into
  `ContextSelector.tsx` → `MultiSelect` with `size="medium"` and `inputClassName={selectClassName}`).
  The Jira field is the only chip-mode consumer left on the default `small` size.
- Styling conventions per `.ai-run/guides/styling/styling-guide.md`: Tailwind only, semantic
  `themeTokens` only, predefined spacing scale only (no `p-[18px]`-style arbitrary values), `cn()` for
  conditional merging.
- `GuardrailSelector.tsx:191` demonstrates the escape hatch already in use for height control:
  `inputClassName="min-h-[32px] max-h-[32px]"` combined with `size="medium"`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/styling/styling-guide.md` — Tailwind-only mandate, DO/DON'T table, `cn()` usage,
  the semantic token catalogue, and the spacing scale table (`p-0`…`p-20`, applying to `m-`, `p-`,
  `gap-`, `space-`, `w-`, `h-`). Explicitly: "Only predefined spacing scale — never `p-[18px]` or `mt-[20px]`".
- `.ai-run/guides/styling/theme-management.md` — `codemieDark` (default) and `codemieLight`; tokens are
  `[darkValue, lightValue]` pairs generated by `generateThemes` from `src/utils/themeHelpers.ts`;
  components must never write raw palette values.
- `.ai-run/guides/components/component-patterns.md`, `component-organization.md`,
  `reusable-components.md` — component construction/placement.
- `.ai-run/guides/patterns/form-patterns.md`, `accessibility-patterns.md` — form and a11y conventions.
- `.ai-run/guides/testing/testing-patterns.md` — Vitest 1.6.1 + RTL, `unit` vs `integration` projects,
  `__tests__/` co-location, `*.integration.test.tsx` naming.
- `AGENTS.md` / `CLAUDE.md` — routing table; a `PostToolUse` hook in `.claude/settings.json` runs
  prettier and `eslint --fix` after edits under `src/`, so formatting should not be re-run manually.

### Architectural Decisions

- `AGENTS.md` "Never" list includes "Skip the pre-commit hook, or write a summary or validation-report document".
- Styling guide states "No custom CSS. No `.css`/`.scss` files for component styles", yet
  `src/assets/stylesheets/vue_components.scss` exists and carries the live `.p-multiselect` rules — a
  documented-vs-actual divergence the fix has to navigate.
- Inline comments in `JiraCustomFieldsField.tsx` record two deliberate decisions: the chip renderer is
  built at module scope ("so the chip renderer is never a component defined inside the parent"), and
  values missing from the fetched list are kept visible as extra options.
- `MultiSelect.tsx` comment on `sortedOptions`: pagination preserves server order; otherwise selected
  options are hoisted to the top.
- No `NOTE:`/`HACK:`/`ADR:` markers were found in `src/components/form/MultiSelect/*` or
  `src/pages/dataSources/components/DataSourceForm/IndexTypeField/*.tsx`.
- Git history: `f990d2f08 EPMCDME-14093: Add configurable custom fields to Jira datasource` introduced
  `JiraCustomFieldsField.tsx`. Prior `MultiSelect` history includes `7eb0b21cd EPMCDME-11593: Fix the
  height for items with virtual scrolling` and `545de1bd5 EPMCDME-11593: Add virtual scrolling for
  multiselect` — height/spacing in this component has been adjusted before.

### Derived Conventions

- Vertical rhythm inside an index-type section is 12px (`mb-3`) or 16px (`mb-4`) per field; the outer
  `DataSourceForm` sections use `flex flex-col gap-4`.
- Field label to control gap is `pb-2` (8px) in `MultiSelect`.
- Chip visuals are theme-token based (`bg-surface-base-secondary`, `border-border-structural`,
  `text-text-primary`), so dark/light both resolve automatically; no theme-conditional class exists in
  `ChipWrapper`.
- Two chip style definitions exist in parallel — `ptPreset.token` (PrimeReact native token, uses
  `bg-surface-interactive-active`) and `ChipWrapper` (uses `bg-surface-base-secondary`) — plus the SCSS
  `.p-multiselect-token` rule. Only the `ChipWrapper` one renders for this field.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/form/MultiSelect/__tests__/MultiSelect.test.tsx` — 50 lines, one test: the hidden
  combobox input stays controlled when `value` goes from empty to selected. No chip, spacing, class,
  or `display="chip"` assertions.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/__tests__/IntegrationSection.test.tsx`
  — the neighbouring integration section.
- `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/` — `useEditPopupForm.test.ts`,
  `useEditPopupForm.validation.test.ts`, `useCreateIndex.xwiki.test.ts`, `googleOAuthSchema.test.ts`
  (form data/validation only).
- `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` and
  `DataSourcesPagination.integration.test.tsx` — page-level; only `DataSourcesPagination` mentions
  `jira: { jql: '' }` (line 74). Neither exercises the custom-fields selector.
- `src/store/__tests__/dataSources.test.ts` — covers `getJiraFields` store behaviour.
- `src/test-utils/component-interactions/multi-select.ts` — shared helpers that drive the multiselect in
  tests by querying `.p-multiselect`, `.p-multiselect-label`, `.p-multiselect-panel`,
  `.p-multiselect-item`. Class-name based, so DOM-structure changes in `MultiSelect` can break unrelated suites.
- Other suites that assert on multiselect DOM: `src/components/Filters/__tests__/Filters.test.tsx:103`,
  `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx:120`,
  `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx`
  (lines 51, 106, 248, 287 — the last asserts `className` content on `.p-multiselect`).

### Testing Framework and Patterns

- Vitest with React Testing Library; two workspace projects defined in `vitest.workspace.ts`:
  `unit` (setup `./src/setupTests` + `./src/setupTests.unit`, valtio and `@/utils/api` mocked) and
  `integration` (setup `./src/setupTests` + `./src/setupTests.integration`, real valtio, mocked fetch).
- Tests co-located in `__tests__/`; `*.integration.test.tsx` selects the integration project.
- `src/setupTests.tsx` mocks endpoint responses (e.g. `'v1/embeddings_models': () => []` at line 200).
- Scripts: `npm run test:unit`, `npm run test:integration`, `npm test`, `npm run test:coverage`.
- `AGENTS.md` requires `npm ci` before trusting any gate, and forbids chaining gates with `&&`.

### Coverage Gaps

- No test file exists for `JiraCustomFieldsField.tsx` at all — no
  `IndexTypeField/__tests__/JiraCustomFieldsField.test.tsx`.
- No test asserts chip rendering, chip spacing, or the `ChipWrapper` markup.
- No test covers `IndexTypeJira.tsx` layout or field ordering.
- No visual-regression or snapshot tooling was found for the form; dark-theme rendering is not asserted anywhere.
- `MultiSelect` has no test for `display="chip"`, `size`, `inputClassName`, or the passthrough
  `preparedPreset` label override.

---

## 5. Configuration and Environment

### Environment Variables

- None govern this feature area. No `import.meta.env.VITE_*` or `window._env_` reference appears in
  `JiraCustomFieldsField.tsx`, `IndexTypeJira.tsx`, or `src/components/form/MultiSelect/*`.

### Configuration Files

- `tailwind.config.ts` — `c` raw palette and `themeTokens` semantic map consumed by `generateThemes`;
  source of `surface-base-secondary`, `border-border-structural` (line 320), `text-text-*`. Also holds
  the custom layout sizes named in the styling guide (`h-navbar`, `w-sidebar`, etc.).
- `postcss.config.js`, `vite.config.ts` — build wiring for Tailwind/SCSS.
- `src/assets/stylesheets/main.scss` and `vue_components.scss` — global styles; `vue_components.scss`
  is imported from `src/main.tsx:30` and `src/authentication/keycloak-theme/keycloakify.tsx:23`, so the
  same `.p-multiselect` rules also ship into the Keycloak login theme build.
- `vitest.workspace.ts` — test projects.
- `package.json` — scripts (`typecheck`, `lint`, `test:unit`, `test:integration`, `build:prod`).

### Feature Flags and Deployment Concerns

- No feature flag or runtime toggle governs the custom-fields selector or its styling.
- No secrets are involved.
- The root `Dockerfile` copies a prebuilt `dist/`; a style change requires `npm ci && npm run build:prod`
  before an image rebuild (per `AGENTS.md`). `nginx.conf` is untouched by this area.

---

## 6. Risk Indicators

- **Shared-component blast radius.** `src/components/form/MultiSelect/MultiSelect.tsx` and
  `ChipWrapper.tsx` are imported by 30+ call sites (`SkillSelector`, `Filters`, `DynamicFieldsForm`,
  `GuardrailSelector`, `ProjectSelector`, `BudgetSelector`, `IndexProviderForm`, `AddUserModal`,
  `MCPServerModal`, `ChatConfigSkillsSelector`, `AssistantSelector`, `ContextSelector`, `LLMSelector`,
  `MarketplaceCategories`, `CategorySelector`, `WorkflowSelector`, `CustomNodeSelector`,
  `CredentialFields`, `KataFormFields`, `SkillCategories`, `AnalyticsUserFilter`, `ActivityEventsPage`,
  `AssignProjectToCostCenterPopup`, and more). Any edit to the shared component or to `ptPreset.ts`
  reaches all of them, which directly threatens the "no regression for other inputs or selectors" criterion.
- **Three competing style sources for the same element.** `ptPreset.ts` (Tailwind via PrimeReact
  passthrough), `preparedPreset` in `MultiSelect.tsx` (which *replaces*, not merges, the `label` slot and
  so drops `ptPreset`'s `py-1.5 px-3` chip padding), and the global
  `vue_components.scss` `.p-multiselect { … py-0 … h-[34px] }` / `.p-multiselect-label { … truncate pl-3 pr-1 py-0 }`.
  Determining which declaration actually wins requires reasoning about CSS source order between the
  Tailwind utility layer and the later-imported SCSS file — a known source of "the class had no effect" churn.
- **Conflicting height constraints on the chip control.** `ptPreset.root` sets `min-h-11` for
  `display === 'chip'`; `MultiSelect` adds `h-8 max-h-8` because `JiraCustomFieldsField` leaves `size` at
  the default `small`; the SCSS sets `h-[34px]`; and `.p-multiselect-label` carries `truncate`
  (`overflow:hidden`). Chips are fixed at `h-7` in `ChipWrapper`. Wrapped chip rows can be clipped by
  these combined constraints.
- **`className` is applied twice.** `MultiSelect.tsx` puts `className` on the outer wrapper *and* on the
  PrimeReact element (line 391), so `JiraCustomFieldsField`'s `mb-3` also lands on the control itself.
  A naive spacing tweak through `className` will change two boxes at once.
- **Dead token class.** `preparedPreset` applies `text-text-unfocused`, but `unfocused` does not exist in
  `tailwind.config.ts` — the class emits nothing. Anyone reading the label styling can be misled about
  what is actually in effect.
- **Only one other chip-mode consumer.** `AssistantForm.tsx:662` → `ContextSelector.tsx` uses
  `display="chip"` with `size="medium"` and `inputClassName`. A change to chip-mode defaults in the
  shared component would visibly move the assistant context selector too.
- **Class-name-coupled tests.** `src/test-utils/component-interactions/multi-select.ts` and suites such as
  `LLMSelector.premiumLayout.test.tsx` (line 287 asserts on `.p-multiselect` `className`) query
  PrimeReact class names; DOM or class restructuring inside `MultiSelect` can break tests far from the
  datasource area.
- **Zero existing tests on the changed surface.** `JiraCustomFieldsField.tsx` and `IndexTypeJira.tsx` have
  no test files, and `MultiSelect.test.tsx` covers a single unrelated controlled-input case. There is no
  visual-regression tooling, so the acceptance criteria (including dark theme) have no automated check today.
- **Documentation divergence.** `.ai-run/guides/styling/styling-guide.md` forbids `.scss` component styles
  and arbitrary values, but the live multiselect styling lives in `vue_components.scss` and already uses
  `h-[34px]`, `h-[44px]`, `py-[5px]`, `w-[18px]`. Choosing where to place a fix means choosing which
  convention to honour.
- **Keycloak theme shares the stylesheet.** `vue_components.scss` is imported by
  `src/authentication/keycloak-theme/keycloakify.tsx:23`, so a SCSS-level change also ships into the
  login-theme build (`npm run build:keycloak`), which has no test coverage here.
- *Speculative:* the "increase the space between Custom fields and Model used for embeddings" requirement
  concerns the gap produced by `FormAutocomplete`'s default `mt-4` above the embeddings field and the
  absence of any top margin on `JiraCustomFieldsField`'s wrapper (`className="mb-3"` only) inside
  `IndexTypeJira.tsx`'s plain, gap-less `div`; where that gap should be introduced (child margin vs a
  parent `flex flex-col gap-*`) is a design decision for the spec, not a discovered constraint.
- *Speculative:* fixing chip spacing without touching shared code would mean passing already-supported
  props (`size`, `inputClassName`, a classed `selectedItemTemplate`) from `JiraCustomFieldsField`;
  fixing it for all chip consumers would mean editing `ChipWrapper`/`ptPreset`/`vue_components.scss`.
  The spec decides which scope applies.

---

## 7. Summary for Complexity Assessment

This is a presentation-only change concentrated in a small, well-identified set of files. The
"Custom fields (optional)" control is rendered by
`src/pages/dataSources/components/DataSourceForm/IndexTypeField/JiraCustomFieldsField.tsx`, which
composes the shared `src/components/form/MultiSelect/MultiSelect.tsx` in chip mode with the default
`small` size and a single layout prop, `className="mb-3"`. Its neighbours are set by
`IndexTypeJira.tsx`, a plain `div` with no `gap`, where `EmbeddingsModelField` sits directly above and
`IntegrationSection` directly below; the embeddings field's own spacing comes from `FormAutocomplete`'s
default `className = 'mt-4'`. Both the create and the edit flow render the identical `DataSourceForm`
(line 547 for Jira), so one fix covers both criteria without a second code path. Chip visuals live in
`ChipWrapper.tsx` and use theme tokens (`bg-surface-base-secondary`, `border-border-structural`,
`text-text-primary`), so dark theme adapts automatically as long as no raw palette value is introduced.

The technical novelty is low but the styling substrate is unusually layered. Three sources style the
same element: the Tailwind passthrough `ptPreset.ts`, the `preparedPreset` override inside
`MultiSelect.tsx` that replaces the `label` slot (discarding `ptPreset`'s chip padding), and the global
`src/assets/stylesheets/vue_components.scss` rules (`.p-multiselect { py-0 … h-[34px] }`,
`.p-multiselect-label { truncate pl-3 pr-1 py-0 }`). Height is constrained in three incompatible ways at
once (`min-h-11` from the preset, `h-8 max-h-8` from the default `small` size, `h-[34px]` from SCSS)
while `ChipWrapper` fixes chips at `h-7` and the label carries `overflow:hidden`. `MultiSelect` also
applies `className` to both the wrapper and the inner PrimeReact element. The file surface can stay at
one to three files if the fix is confined to `JiraCustomFieldsField.tsx` and `IndexTypeJira.tsx` using
props the shared component already exposes (`size`, `inputClassName`, a classed `selectedItemTemplate`);
it widens materially if `ChipWrapper.tsx`, `ptPreset.ts`, or `vue_components.scss` are edited, since the
first two are shared with 30+ consumers and the SCSS also ships into the Keycloak login theme.

Test coverage on the touched surface is effectively absent: there is no test file for
`JiraCustomFieldsField.tsx` or `IndexTypeJira.tsx`, and `MultiSelect.test.tsx` is 50 lines covering one
controlled-input case with no chip or spacing assertions. No visual-regression tooling exists, so the
dark-theme and "not cramped" criteria are unverifiable automatically and rest on manual review. The
main risk factors are therefore blast radius (any shared-component edit reaches the assistant context
selector at `AssistantForm.tsx:662` and every other multiselect consumer), class-name-coupled test
utilities in `src/test-utils/component-interactions/multi-select.ts` and
`LLMSelector.premiumLayout.test.tsx`, and the documented-vs-actual conflict between the Tailwind-only
styling guide and the live SCSS overrides.

---

## 8. External References

None named by the task. `task_context` points at no path, directory, or URL outside this repository;
it references sibling ticket EPMCDME-14093, whose implementation commit is `f990d2f08` in this repo
(`EPMCDME-14093: Add configurable custom fields to Jira datasource`), which introduced
`src/pages/dataSources/components/DataSourceForm/IndexTypeField/JiraCustomFieldsField.tsx`.
