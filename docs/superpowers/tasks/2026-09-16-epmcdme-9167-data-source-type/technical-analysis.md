# Technical Research

**Task**: datasource data-source provider type details
**Generated**: 2026-09-16T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

On the Data Source Details page, the data source type field currently shows only the generic value 'Provider' instead of the specific provider type like 'CodeAnalysisProvider' or 'CodeExplorationProvider'. The fix requires updating the rendering logic so that the specific provider type name is displayed. This affects the Data Source Details UI page and the rendering logic for provider type display.

---

## 2. Codebase Findings

### Existing Implementations

- **`src/pages/dataSources/DataSourceDetailsPage.tsx`** — page container; calls `dataSourceStore.getIndexDetails(id)` to fetch the `DataSourceDetailsResponse` object and passes it to `DataSourceDetails` as a prop.
- **`src/pages/dataSources/components/DataSourceDetails.tsx`** — the primary rendering component for the details page. This is where the bug lives. Line 732:
  ```tsx
  <DetailsProperty label="Data Source Type" value={humanize(indexType)} />
  ```
  `indexType` is computed at line 179–182 using `getIndexTypeCode(dataSource?.index_type)`. For a provider data source, `index_type` returned from the API is the literal string `"provider"` — a generic sentinel — so `humanize("provider")` produces `"Provider"`.
- **`src/utils/indexing.ts` (`getIndexTypeCode`, line 110)** — strips `"knowledge_base_"` and `"llm_routing_"` prefixes. For `index_type === "provider"` it returns `"provider"` unchanged, which is the direct source of the generic display value.
- **`src/utils/helpers.ts` (`humanize`, line 114)** — capitalises each underscore-delimited word. Has special cases for `xray`, `google`, `git_faq`, `sharepoint`, `svn`, `xwiki`. There is **no** special case for `provider`, so it falls through to the generic capitalisation path producing `"Provider"`.
- **`src/types/entity/dataSource.ts` (`DataSourceDetailsResponse`, line 231)** — the API response type. `index_type: string` (line 239) carries the generic `"provider"` value. The type has `provider_fields: any` (line 292) but **no** `provider_name` or `provider_type` field.
- **`src/types/entity/dataSource.ts` (`DataProvider`, line 319)** — schema object used in the create/edit form. Has `provider_name: string` (line 321). This is the human-readable name (e.g. `"CodeAnalysisProvider"`). This type is **not** available inside the details API response.
- **`src/store/dataSources.ts` (`getIndexDetails`, line 204)** — fetches `v1/index/{id}` and returns the raw JSON as `DataSourceDetailsResponse`. No transformation applied. The shape of the backend response governs what fields are available.
- **`src/store/dataSources.ts` (`indexProviderSchemas`, line 136)** — a Valtio store array of `DataProvider[]` populated by `getProviderIndexSchemas()` (calls `v1/providers/datasource_schemas`). In edit/create mode `DataSourceTypeSelector` uses this to map a provider `id` to its human name. This store is **not** consulted in the details page.
- **`src/pages/dataSources/components/DataSourceDetails/DetaSourceDetailsProvider.tsx`** — renders `provider_fields.base_params` and `provider_fields.create_params` key-value pairs (the provider-specific configuration). It does **not** render the provider type name.
- **`src/constants/dataSources.ts` (`INDEX_TYPES.PROVIDER`, line 35)** — `'provider'` is the string constant representing the provider index category.

### Architecture and Layers Affected

- **UI / Presentation layer**: `DataSourceDetails.tsx` — the single-file component where the display fix must be applied.
- **Utility layer**: `src/utils/helpers.ts` (`humanize`) and `src/utils/indexing.ts` (`getIndexTypeCode`) — may need extension or bypass if the fix adds a special-case mapping.
- **Data / Type layer**: `src/types/entity/dataSource.ts` (`DataSourceDetailsResponse`) — if the API already returns a specific provider name field, the interface must be extended to declare it.
- **Store / API layer**: `src/store/dataSources.ts` — relevant only if the fix requires a second API call (e.g. fetching `indexProviderSchemas`) or if the `DataSourceDetailsResponse` type needs to be updated.

### Integration Points

- **Backend endpoint `v1/index/{id}`** — returns `DataSourceDetailsResponse`. Whether the backend already returns a specific provider type name (e.g. as `provider_name` or `provider_type`) in the JSON body is the key open question. If it does, only the TypeScript interface and rendering code need updating. If it does not, a second API call or a lookup against `indexProviderSchemas` would be needed.
- **`indexProviderSchemas` store** — populated lazily in create/edit flows. Could be reused in the details page to reverse-map `index_type === "provider"` to a display name if the `DataProvider` list is available; however this adds an implicit dependency on a store that is not currently initialized on the details page.

### Patterns and Conventions

- **`humanize(string)`** is the established display-name utility for all index types. The pattern in the codebase is to add special cases to `humanize` (see the six existing special cases) when a value needs non-default formatting. However for provider types this approach would require either hard-coding all provider names or changing the value passed to `humanize`.
- **`DetailsProperty`** component renders the `label`/`value` pair in the sidebar. The value can be a React node, so a lookup expression is acceptable inline.
- **`getIndexTypeCode`** strips framework prefixes; it is not intended to produce display labels — that is `humanize`'s role and `getIndexTypeDisplay`'s role in `indexing.ts`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/architecture.md` — defines the layered structure (pages, components, store, utils) that governs where the fix belongs.
- `.ai-run/guides/components/component-patterns.md` — governs how presentational components should be structured.
- `.ai-run/guides/development/api-integration.md` — relevant if the fix requires a new or modified API call.

### Architectural Decisions

No ADRs or inline decision comments found in the affected files. The pattern of adding special cases to `humanize` for known index type names is implicit convention, not documented.

### Derived Conventions

- Index type display names are centralised in `humanize()` for simple string-to-label mapping.
- `getIndexTypeDisplay()` in `indexing.ts` is used in some contexts (e.g. data source list) but not in the details sidebar — the details sidebar uses `humanize(indexType)` directly.
- For provider-type data sources, the `index_type` field is a generic sentinel `"provider"`. The specific provider name is stored separately and accessed via `provider_name` on the `DataProvider` schema object — not currently returned by the details API endpoint (based on `DataSourceDetailsResponse` type definition).

---

## 4. Testing Landscape

### Existing Coverage

- **`src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx`** — unit tests for `DataSourceDetails`. Covers project name display and xWiki configuration rendering. No test for provider-type data sources or the "Data Source Type" sidebar field.
- **`src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`** — integration tests for the create flow. Not relevant to the details page.

### Testing Framework and Patterns

- Vitest + React Testing Library (`@testing-library/react`).
- Mocks via `vi.mock()` for store modules (`valtio`, `@/store/dataSources`, `@/store/appInfo`), SVG assets, and child components that have external dependencies.
- Test data uses a full `DataSourceDetailsResponse` object literal as the `dataSource` prop fixture.
- Two test suites in `DataSourceDetails.test.tsx`: `describe` blocks scoped to specific behaviours with named `it` cases.

### Coverage Gaps

- No test verifies what value is rendered for the "Data Source Type" property — neither for the current generic `"Provider"` output nor for the correct specific provider name.
- No test covers `index_type === "provider"` path in `DataSourceDetails` at all.
- Any fix to the provider type display should be accompanied by a new `describe` block in `DataSourceDetails.test.tsx` asserting that the specific provider name is shown, not `"Provider"`.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables govern the data source type display logic. The feature is purely a UI rendering concern.

### Configuration Files

No config files are involved. The `INDEX_TYPES` constant in `src/constants/dataSources.ts` defines the sentinel values and is the closest thing to configuration.

### Feature Flags and Deployment Concerns

No feature flags found for this rendering path. The change is unconditional — it affects all provider-type data sources displayed on the details page.

---

## 6. Risk Indicators

- **Root cause ambiguity — API shape unknown**: The central risk is whether `v1/index/{id}` already returns a specific provider type name in its JSON body. If it does, the fix is a 1–3 line TypeScript/JSX change. If it does not, a second API call or a store lookup is needed, expanding the change surface. This must be verified against the running API or backend code before implementing.
- **`DataSourceDetailsResponse.provider_fields` typed as `any`**: The `provider_fields` field has no typed interface for its nested structure. If the provider type name is embedded in `provider_fields`, accessing it requires runtime inspection and carries no TypeScript safety.
- **No test for the "Data Source Type" field**: The `DataSourceDetails.test.tsx` file does not assert the content of the "Data Source Type" sidebar property. Any fix will be unverified by the existing test suite and requires a new test case.
- **`humanize()` special-case accumulation**: The helper already has six hard-coded special cases. Adding provider names here would require enumerating all possible provider names in a utility function, which is fragile. A look-up from the API data or from `indexProviderSchemas` is likely a cleaner approach.
- **`indexProviderSchemas` not loaded on details page**: If the fix involves reverse-mapping via `indexProviderSchemas`, the store must be pre-populated on the details page. Currently `getProviderIndexSchemas()` is only called in create/edit flows. Adding it to the details page load path is a secondary side-effect that must be considered.
- **Single-file component of significant size**: `DataSourceDetails.tsx` is 865 lines. The "Data Source Type" field is rendered deep inside JSX at line 732 inside a `DetailsSidebar` block — the change site is narrow but the file is large enough to warrant careful reading when making the edit.

---

## 7. Summary for Complexity Assessment

The fix targets a single line in `src/pages/dataSources/components/DataSourceDetails.tsx` (line 732): the `value` prop passed to `<DetailsProperty label="Data Source Type" .../>` currently reads `humanize(indexType)`, where `indexType` resolves to the string `"provider"` for all provider-type data sources. The architectural layers touched are: UI/presentation (`DataSourceDetails.tsx`), optionally the utility layer (`humanize` in `helpers.ts` or `getIndexTypeCode` in `indexing.ts`), the data type layer (`DataSourceDetailsResponse` in `types/entity/dataSource.ts`), and possibly the store/API layer if a new field or second API call is needed.

The technical novelty is low if the backend already returns a specific provider name in `v1/index/{id}` — in that case the fix is extending the TypeScript interface and updating one JSX expression. The novelty rises to moderate if the backend does not return this field and a cross-reference against `indexProviderSchemas` must be introduced, because that requires loading a second async resource in the details page load path and threading the result through to the rendering component. The `DataProvider` entity (which carries `provider_name`) is currently scoped to create/edit flows; bringing it into the read-only details view would be a new pattern.

Test coverage for the affected rendering path is absent: `DataSourceDetails.test.tsx` has no case for `index_type === "provider"` and no assertion on the "Data Source Type" property value. Any implementation must add a test. The change file surface is small (1–3 files depending on the API shape finding), risk is low-to-moderate depending on the backend question, and the fix is self-contained within the `dataSources` product area.
