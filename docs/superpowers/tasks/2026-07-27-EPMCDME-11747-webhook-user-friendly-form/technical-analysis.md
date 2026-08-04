# Technical Research

**Task**: webhook integration form collapsible accordion resource dropdown alias auto-fill
**Generated**: 2026-07-27T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

User-friendly Webhook integration setup screen (EPMCDME-11747)

Both Webhook integration forms need to be made simpler and more user-friendly:
- `/integrations/project/new` (Credential Type = Webhook) — project-scoped webhook
- `/integrations/user/new` (Credential Type = Webhook) — user-scoped webhook

Both forms share the same `SettingsForm` / `CredentialFields` component tree; fixing the shared components covers both pages.

The changes required are:

1. **Add a read-only "Webhook URL" field with a copy button**
   - After the Webhook ID input, show a new read-only field labelled "Webhook URL"
   - Its value is the full constructed URL: {base_url}/api/v1/webhooks/{webhook_id}
   - The field includes a copy-to-clipboard icon button on the right
   - If Webhook ID is empty, the field stays empty (no placeholder URL shown)
   - Remove the current inline hint text "Full URL: /api/v1/webhooks/<id>" from under the Webhook ID field

2. **Auto-populate Webhook ID from Alias (with manual override)**
   - When the user edits the Alias field, the Webhook ID field should auto-fill with a slug derived from the alias value (spaces → hyphens, lowercase)
   - Once the user manually edits Webhook ID directly, the automatic sync from Alias is disabled for that session
   - Webhook ID remains fully editable at all times

3. **Wrap optional sections in collapsible accordions, collapsed by default**
   - Replace flat "Request verification (legacy header)" section with collapsible accordion titled "Advanced Security Settings (optional)", collapsed by default
     - Contains: **Secure Header Name**, **Secure Header Value to check**
   - Replace flat "GitHub" section with collapsible accordion titled "GitHub Settings (optional)", collapsed by default
     - Contains: **Require SHA-256 Signature** (toggle — moved from the verification section), **GitHub Webhook Secret**, **GitHub Event Filter**
   - Replace flat "GitLab" section with collapsible accordion titled "GitLab Settings (optional)", collapsed by default
     - Contains: **GitLab Webhook Secret Token**, **Filter merge request actions** (toggle)

4. **Replace "Resource ID" text input with a name-based "Resource" dropdown**
   - Remove the free-text Resource ID field
   - Add a "Resource" dropdown that loads entity names (Assistants, Workflows, Datasources) by Resource Type
   - Resource dropdown is disabled until Resource Type is chosen
   - Two dropdowns (Resource Type + Resource) rendered side by side
   - Underlying resource ID is stored but user picks by name

Project: codemie-ui (React/TypeScript frontend)

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` — top-level form shell; owns `buildWebhookURL` (line 298–301: `${api.BASE_URL}/v1/webhooks/${webhookId}`); passes `buildWebhookURL` down to `CredentialFields`; manages the `alias` field; zero test coverage
- `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` — data-driven field renderer; reads `note` + `showWebhookUrl` config flags (lines 172–178) to emit the inline hint text `Full URL: ${buildWebhookURL(formValues[name])}` that must be removed; handles all CredentialComponentType variants via switch
- `src/utils/settingsUIConfig.ts` (lines 740–861) — complete webhook credential config: `_general_section`, `webhook_id` (with `note`+`showWebhookUrl`), `is_enabled`, `_verification_section`, `secure_header_*`, `_github_section`, GitHub fields, `_gitlab_section`, GitLab fields, `_target_section`, `resource_type` (select), `resource_id` (free-text input)
- `src/types/settingsUI.ts` — `CredentialComponentType` enum (input/switch/textarea/select/multiselect/record/message/sectionHeader), `CredentialFieldConfig` type, `CredentialTypeConfig` type
- `src/pages/assistants/components/AssistantForm/components/FormAccordion/FormAccordion.tsx` — form-context accordion using `primereact/accordion`, `defaultOpen=false`, title+description header pattern — closest reusable accordion for the new collapsible sections
- `src/pages/workflows/editor/configPanels/components/ConfigAccordion.tsx` — alternate accordion with controlled/uncontrolled mode and `headerActions` slot
- `src/components/FilterAccordionItem/FilterAccordionItem.tsx` — simpler accordion wrapper with `defaultExpanded` prop
- `src/store/assistants.ts` — `getAssistantOptions`, `fetchPinnedAssistants`; API: `v1/assistants`
- `src/store/workflows.ts` — `getWorkflowOptions`, `fetchWorkflow`; API: `v1/workflows`
- `src/store/dataSources.ts` — datasource store; API: `v1/datasources`

### Architecture and Layers Affected

- **Config layer** (`src/utils/settingsUIConfig.ts`, `src/types/settingsUI.ts`): Field definitions and type enum must be extended. The `webhook_id` field config needs `showWebhookUrl` and `note` removed; a new `CredentialComponentType.webhookUrl` or inline read-only field type may be needed. The three `sectionHeader` pseudo-fields for verification/GitHub/GitLab must be replaced or wrapped.
- **Utility layer** (`src/utils/settings.ts`): `buildWebhookURL` already exists and is used in both `SettingsForm` and `CredentialFields`. No new utility needed for URL construction.
- **Component layer** (`CredentialFields.tsx`, `SettingsForm.tsx`): The renderer must support a new field type for read-only URL display with copy button. `SettingsForm` must add alias→webhook_id auto-fill logic with a manual-override flag.
- **Store layer** (`src/store/`): Valtio stores for assistants, workflows, and dataSources already expose option-list functions; a new hook `useResourceOptions(resourceType)` must wrap the three-way conditional fetch.
- **Page layer** (`NewProjectIntegrationPage`, `EditProjectIntegrationPage`, `NewIntegrationPopup`): Likely no direct changes — they consume `SettingsForm` as a black box.

### Integration Points

- `SettingsForm` calls `buildWebhookURL` and passes it to `CredentialFields` — must continue to produce the URL for the new read-only display field
- `CredentialFields` consumes the full Valtio-backed `formValues` (via `useWatch`) for `shouldShow` predicates — the resource dropdown's disable-until-type-chosen logic can use the same mechanism
- Three Valtio stores (`assistants`, `workflows`, `dataSources`) will be queried at runtime by the new resource dropdown; stores already expose option-list API helpers
- `primereact/accordion` and `AccordionTab` are the project-standard accordion primitives; `FormAccordion` is the nearest reusable wrapper already in the codebase

### Patterns and Conventions

- **Data-driven field rendering**: All credential fields are declared as `CredentialFieldConfig` entries in `settingsUIConfig.ts` and rendered by `CredentialFields` via a `CredentialComponentType` switch. New UI behaviors (read-only URL field, accordion grouping) must either be expressible as new `CredentialComponentType` variants or handled as special cases in `CredentialFields`.
- **`sectionHeader` pseudo-field**: Current grouping mechanism; inserts `<hr>` + heading inline. This is the target for replacement with collapsible accordion wrappers.
- **`showWebhookUrl` + `note` flags**: One-off flags on `webhook_id` config that trigger the inline hint in `CredentialFields`. These must be removed from config and the rendering branch deleted.
- **React Hook Form + Yup**: `useWatch` provides live `formValues` used for `shouldShow` predicates and URL construction. The alias auto-fill must use `setValue` from RHF and a `useRef` flag to track manual-edit state.
- **Valtio proxy stores**: Stores expose synchronous selectors and async fetch actions. The resource dropdown will follow this pattern.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/Yauheni_Dzenisenka/Development/codemie-dev/codemie-ui/.ai-run/guides/components/component-patterns.md` — component conventions relevant to new components being introduced (read-only URL field, resource dropdown)
- `/Users/Yauheni_Dzenisenka/Development/codemie-dev/codemie-ui/.ai-run/guides/components/reusable-components.md` — reusable component guide; relevant for determining whether new components (WebhookUrlField, ResourceDropdown) should be placed in `src/components/` or co-located

### Architectural Decisions

- The data-driven credential field system (`CREDENTIAL_UI_MAPPING` / `CredentialFieldConfig`) is the established pattern for all integration credential forms — any new field behavior must be expressible within or as an extension to this system.
- `primereact/accordion` is the project-standard accordion component; custom accordion wrappers (`FormAccordion`, `ConfigAccordion`, `FilterAccordionItem`) exist and should be evaluated for reuse before writing a new one.

### Derived Conventions

- New field types added to `CredentialComponentType` enum should have a matching rendering branch in `CredentialFields.tsx`
- Valtio store option fetches follow an `options: EntityOption[]` selector + `fetchXxx()` action pattern; the resource dropdown hook should follow this
- Co-located component directories are used for complex feature-specific components; a `src/pages/integrations/components/SettingsForm/components/` subdirectory would be appropriate for `WebhookUrlField` and `ResourceDropdown`

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` — covers: multiselect GitLab MR event filter rendering, backward-compatible defaults, stored filter reflection, Yup validation, and a `webhook form section grouping` describe block that **asserts the exact five section header labels** (`'Request verification (legacy header)'`, `'GitHub'`, `'GitLab'`) and their render order

### Testing Framework and Patterns

- **Framework**: Vitest + React Testing Library (`@testing-library/react`)
- **Patterns**: Component render tests with query assertions; Yup validation integration tests; no mock store setup found in this file specifically (stores likely hydrated via module-level defaults)

### Coverage Gaps

- `SettingsForm.tsx` has **zero test coverage** — the alias auto-fill logic, manual-override flag, and webhook URL field will be entirely untested unless new tests are added
- The resource dropdown's three-way conditional Valtio store fetch has no test precedent in this domain
- The new accordion grouping behavior (collapsed by default, keyboard expand) has no test coverage in the integration form context
- The copy-to-clipboard interaction on the webhook URL field has no existing test pattern in this area

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — base URL used by `api.BASE_URL` inside `buildWebhookURL`; the constructed URL is `${api.BASE_URL}/v1/webhooks/${id}`; implementer must verify whether `api.BASE_URL` already includes `/api` prefix to confirm the full URL matches `{base_url}/api/v1/webhooks/{webhook_id}` from the requirements

### Configuration Files

- `src/utils/settingsUIConfig.ts` — single source of truth for all credential field configs including the complete webhook definition; all four requirement changes touch this file

### Feature Flags and Deployment Concerns

- No feature flags found for this domain
- No deployment manifest changes anticipated — purely frontend form changes
- The webhook URL display exposes the base URL to end users — ensure `VITE_API_URL` is set to the publicly reachable base URL in all deployment environments

---

## 6. Risk Indicators

- **Test breakage (high)**: `CredentialFields.test.tsx` has a `webhook form section grouping` describe block asserting the exact five section header labels (`'Request verification (legacy header)'`, `'GitHub'`, `'GitLab'`) and their render order — replacing `sectionHeader` pseudo-fields with accordion wrappers will break these assertions; tests must be updated as part of the implementation
- **No SettingsForm coverage**: `SettingsForm.tsx` is the primary target for alias auto-fill and webhook URL field logic but has zero tests; all new behavior there is introduced without a safety net
- **Renderer extension complexity**: `CredentialFields` has no concept of "collapsible group wrapper" — adding accordion sections requires either a new `CredentialComponentType` variant (e.g. `accordionStart`/`accordionEnd` markers or a `group` container type) or a pre-processing pass that clusters fields between section headers into accordion groups; this is the highest-complexity architectural decision in the task
- **Resource dropdown new hook**: No existing hook abstracts a three-way conditional fetch across assistants, workflows, and dataSources stores; a new `useResourceOptions(resourceType)` hook must be created and tested
- **`buildWebhookURL` path verification**: Current implementation produces `${api.BASE_URL}/v1/webhooks/${id}`; if `api.BASE_URL` is `https://host/api`, the full URL is correct; if it is `https://host`, the path would be `/v1/webhooks/{id}` instead of `/api/v1/webhooks/{id}` — this must be verified against the live `VITE_API_URL` env value
- **Alias auto-fill RHF integration**: `SettingsForm` uses React Hook Form; triggering `setValue('webhook_id', slug)` programmatically must use `{ shouldDirty: false, shouldTouch: false }` options to avoid marking the field as user-touched before the manual-override condition; the `useRef` flag pattern for disabling sync is not currently established in this form
- **Requirements clarity — GitLab section**: The task states "GitLab section: wrap in 'GitLab Settings (optional)' accordion or confirm with PO" — this is an unresolved ambiguity that may require a product owner clarification before implementation

---

## 7. Summary for Complexity Assessment

This task touches four distinct architectural layers: the config layer (`settingsUIConfig.ts` and `settingsUI.ts` types), the component rendering layer (`CredentialFields.tsx` and `SettingsForm.tsx`), the store layer (assistants, workflows, dataSources Valtio stores via a new hook), and indirectly the test layer (one existing test file will break and new tests are needed for untested paths). The estimated file change surface is 5–8 files: `settingsUIConfig.ts` (field config changes for all four requirements), `settingsUI.ts` (new `CredentialComponentType` variant), `CredentialFields.tsx` (new rendering branch, removal of inline hint, accordion grouping logic), `SettingsForm.tsx` (alias auto-fill with manual-override, webhook URL field wiring), a new `useResourceOptions` hook file, and the existing `CredentialFields.test.tsx` which must be updated to reflect the new section structure.

The highest-complexity decision is the accordion grouping mechanism: the current `sectionHeader` pseudo-field type is a flat inline separator; making it collapsible requires either a pre-processing step that groups consecutive fields between section headers into logical accordion blocks, or introducing `accordionGroup` as a first-class `CredentialComponentType` container with nested `fields` array. The former is a rendering-layer concern that avoids touching the config schema; the latter requires schema changes but is more composable. This architectural decision has no prior precedent in the codebase (other accordion usages are all explicit, not data-driven) and represents genuine technical novelty for this codebase's patterns.

Test coverage posture is weak for the affected area: `SettingsForm.tsx` has zero coverage, and the one existing test file (`CredentialFields.test.tsx`) will break due to section label changes. The task introduces four independent features (URL display field, alias auto-fill, accordion sections, resource dropdown) each requiring new test cases, meaning the testing effort is proportional to the feature count. Overall complexity is medium-high: the individual changes are well-scoped but the accordion grouping mechanism and resource dropdown hook represent non-trivial design decisions with no established precedent in the integration form domain.
