# Technical Research

**Task**: sharepoint integration datasource attributes
**Generated**: 2026-09-09T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Ticket EPMCDME-13990 — "User-friendly sequence of attributes for creating Sharepoint Integration" (Improvement)

Full description:
When creating a Sharepoint Integration, attributes are now presented in suboptimal order and with inconsistent naming, which leads to copy-paste errors.

Should be:
1. URL
2. Tenant ID
3. Application (Client) ID
4. Client Secret

Naming should be consistent with the naming used when creating a Sharepoint Datasource, otherwise users are confused, because creating such integrations or datasources is not trivial.

Acceptance criteria (derived from description, not a separate Jira field):
- Sharepoint Integration attributes should be shown in this order: URL, Tenant ID, Application (Client) ID, Client Secret.
- Attribute naming should be consistent with the naming used when creating a Sharepoint Datasource.

Linked tickets: none. Two screenshot attachments exist in Jira (not available locally) showing the current field order/naming presumably for Integration vs Datasource forms.

---

## 2. Codebase Findings

### Existing Implementations

**Sharepoint Integration form (the subject of this ticket):**
- `src/utils/settingsUIConfig.ts` (lines 720-748) — `CREDENTIAL_UI_MAPPING.sharepoint` entry defines the four "app registration" credential fields as a plain object, in this **declared key order**: `url`, `client_id`, `tenant_id`, `client_secret`.
  - `url`: `{ label: 'URL', placeholder: dynPlaceholder('sharepoint', 'url'), defaultValue: SHAREPOINT_URL }`
  - `client_id`: `{ placeholder: 'Azure AD Application (Client) ID', help: '...quickstart-register-app' }` — no explicit `label`.
  - `tenant_id`: `{ placeholder: 'Azure AD Tenant ID', help: '...how-to-find-tenant' }` — no explicit `label`.
  - `client_secret`: `{ placeholder: 'Azure AD Client Secret', sensitive: true, help: '...add-a-client-secret' }` — no explicit `label`.
- `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` — renders `Object.entries(credentialFields)` in **declaration order** (via `buildRenderGroups`/`groupByRow`, lines 362-397), so the object key order in `settingsUIConfig.ts` *is* the on-screen field order. No `order` field exists in `CredentialFieldConfig`; reordering is done purely by moving object keys.
  - `getLabel(label ?? placeholder)` (lines 167-171) derives the visible `<Input label>` when no explicit `label` is set: it takes the placeholder text and strips everything from the first `(`, first `,`, or "e.g." onward, then trims. For `client_id` this currently yields the *label* "Azure AD Application" (parenthetical "(Client) ID" is dropped from the label but stays in the placeholder text shown inside the field). `tenant_id` and `client_secret` have no parentheses, so their full placeholder becomes the label verbatim ("Azure AD Tenant ID", "Azure AD Client Secret").
- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` (lines 526-541, 671-687) — renders `<CredentialFields credentialFields={CREDENTIAL_VALUES_MAPPING[credentialType].fields} .../>` for the selected credential type; for `sharepoint` this only renders when `!isSharePointOAuth` (i.e., the "Azure app registration" auth method, see `SHAREPOINT_AUTH_METHODS.APP`).
- `src/pages/integrations/NewIntegrationPopup` (referenced from `IntegrationSection.tsx`) wraps this same `SettingsForm`, so the "create integration inline from a Datasource form" flow renders the identical field set/order — a single source of truth.

**Sharepoint Datasource form (the naming reference named by the ticket):**
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeSharePoint.tsx` — the Sharepoint datasource form. Field `siteUrl` is labeled **"SharePoint Site URL"** (a full site path, not the base org URL — a different concept from the Integration's `url`).
  - Three mutually-exclusive auth methods via `SHAREPOINT_AUTH_TYPES` (`src/constants/dataSources.ts`, lines 49-55): `INTEGRATION`, `OAUTH_CODEMIE`, `OAUTH_CUSTOM`.
  - `INTEGRATION` method (lines 189-206): delegates entirely to `IntegrationSection` → `IntegrationSelector` (pick an existing Sharepoint Integration) plus `NewIntegrationPopup` (create one inline) — i.e., it reuses the exact Integration form from `settingsUIConfig.ts` described above. No separate tenant/client/secret fields are rendered in this branch.
  - `OAUTH_CUSTOM` method (lines 208-243) is the only branch in the Datasource form that shows Tenant ID / Client ID style fields directly:
    - `sharepointCustomClientId`, declared **first**, label **"Azure Application (client) ID"**.
    - `sharepointTenantId`, declared **second**, label **"Azure Directory (tenant) ID"**.
    - Note the order here is Client ID before Tenant ID — the opposite of the order the ticket asks for on the Integration form — and the OAuth-custom flow has no client-secret field (it authenticates via a device-code/browser sign-in instead of a stored secret).
  - Field naming differs from the Integration form's naming: "Azure Application (client) ID" / "Azure Directory (tenant) ID" (Datasource, OAuth-custom) vs. "Azure AD Application (Client) ID" / "Azure AD Tenant ID" / "Azure AD Client Secret" (Integration). Both differ in capitalization of the parenthetical ("(client)" vs "(Client)"), in the qualifier used ("AD" prefix vs none, "Application" vs "Directory" before "(tenant)"), and only the Integration form provides a Client Secret field at all.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/IntegrationSection.tsx` — generic "pick or create an Integration" section reused by Sharepoint (and other) datasource types; delegates field rendering to `NewIntegrationPopup` → `SettingsForm` → `CredentialFields`, i.e. it does not define its own field set/order for the Sharepoint credential type.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/SharePointContentTypesSection.tsx` and `SharePointMicrosoftSignIn.tsx` — cover indexing-content-type toggles and the OAuth sign-in button; not attribute-naming-relevant to this ticket.
- `src/pages/dataSources/components/DataSourceForm/hooks/useSharePointOAuth.ts` — manages OAuth device-code / sign-in state for the Datasource's OAuth methods; not the field-order/naming surface for this ticket.

### Architecture and Layers Affected

- **Configuration layer** (`src/utils/settingsUIConfig.ts`): the `CREDENTIAL_UI_MAPPING.sharepoint.fields` object — this is where both field order and field `label`/`placeholder` text live for the Integration form. This is the layer the ticket's order requirement and (for the Integration side) naming requirement touch.
- **Presentation layer** (`src/pages/integrations/components/SettingsForm/CredentialFields.tsx`): consumes the config in declared-key order; no changes needed here unless the render/grouping logic itself must change (it currently does not need to — reordering keys in the config is sufficient).
- Comparison-only layer (`src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeSharePoint.tsx`): the Datasource form's `OAUTH_CUSTOM` labels are the naming reference the ticket points to; this file is not itself required to change unless the naming convention chosen requires updating it too for consistency (open question — see Risk Indicators).

### Integration Points

- `SettingsForm` (Integrations page) and `NewIntegrationPopup` (embedded inside the Datasource form's `IntegrationSection`) both render from the same `CREDENTIAL_UI_MAPPING.sharepoint` config, so a change to field order/labels there propagates identically to both the standalone Integrations page and the "create integration inline while building a Sharepoint Datasource" flow.
- `src/utils/settings.ts` — `getCredentialUIMapping()` returns `CREDENTIAL_UI_MAPPING` (test mocks confirm this, see `SettingsForm.sharePointAuth.test.tsx` line 29), the single source consumed by `SettingsForm`.
- `src/constants/integration.ts` — `SHAREPOINT_CREDENTIAL_TYPE`, `SHAREPOINT_AUTH_METHODS` (`OAUTH` / `APP`) gate which field set is visible; unrelated to ordering/naming within the `APP` field set itself.
- `src/constants/dataSources.ts` — `SHAREPOINT_AUTH_TYPES` (`INTEGRATION` / `OAUTH_CODEMIE` / `OAUTH_CUSTOM`) is the Datasource-side equivalent gate; the `OAUTH_CUSTOM` fields are declared directly in `IndexTypeSharePoint.tsx` rather than a shared config object.

### Patterns and Conventions

- Field order for any credential type in `settingsUIConfig.ts` is controlled purely by JS object key insertion order — there is no explicit `order`/`sortIndex` property in `CredentialFieldConfig` (`src/types/settingsUI.ts`). Every other credential type in the file (`jira`, `git`, `confluence`, `azure`, `xray`, `email`, etc.) follows the convention of listing `url` first, then identity/auth fields, then secrets last — the Sharepoint entry's current `url, client_id, tenant_id, client_secret` order is itself consistent with that broader convention (URL first, secret last); only the client_id/tenant_id pair is out of the sequence the ticket wants.
- Labels are either explicit (`label: 'URL'`) or derived from `placeholder` via `getLabel()`'s parenthetical-stripping heuristic — any renamed placeholder text should be checked against this heuristic since it changes what a field's *label* (not just its placeholder) displays.
- `sensitive: true` marks fields masked/toggle-revealed (`client_secret`); this flag is unaffected by reordering.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guide in `.ai-run/guides/` mentions SharePoint or documents a field-ordering convention for `settingsUIConfig.ts`. `.ai-run/guides/patterns/form-patterns.md` and `.ai-run/guides/development/api-integration.md` describe general react-hook-form/Yup and API patterns but not credential-field ordering — conventions here are derived from code (Section 2's "Patterns and Conventions").

### Architectural Decisions

No ADR or inline `DECISION:`/`ADR:` marker found for SharePoint field ordering. `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` (lines 207-209) carries a design comment: "SharePoint supports two mutually exclusive authentication methods, so only the fields belonging to the selected one are shown — mirrors the SharePoint datasource form." This documents an existing intent to keep the Integration and Datasource SharePoint experiences aligned, which is the same intent this ticket extends to field naming.

### Derived Conventions

- Every other multi-field credential type (jira, confluence, azure, xray, email/oauth_azure) lists `url` (or base URL) first and puts `sensitive: true` secret fields last — supports simply moving `tenant_id` before `client_id` in the Sharepoint entry without otherwise restructuring the object.
- No repo-wide constant centralizes "Tenant ID" / "Application (Client) ID" / "Client Secret" strings; each credential type's fields are inlined as literals in `settingsUIConfig.ts`, so achieving the naming-consistency half of the acceptance criteria means literally matching the wording between the two inlined-literal locations (Integration entry vs. Datasource's `OAUTH_CUSTOM` labels), not consuming a shared constant.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.sharePointAuth.test.tsx` — covers the SharePoint auth-method toggle (OAuth sign-in required vs. Azure app registration) and re-exports the real `CREDENTIAL_UI_MAPPING` from `settingsUIConfig.ts` via a mocked `getCredentialUIMapping`. It asserts on the "Alias" field and the auth-method radio label ("Azure app registration") but does **not** assert on the order or exact label text of `url`/`client_id`/`tenant_id`/`client_secret`.
- `src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/ToolkitSharePointIntegration.test.tsx` — covers the toolkit's integration-selector behavior (existing settings, preselection, add-new fallback), unrelated to field order/naming.
- `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx` — datasource-detail rendering; not scoped to Sharepoint field labels.
- No test in the repo currently asserts the rendered order or exact label text of the Sharepoint Integration's four app-registration fields, and no test asserts the Datasource `OAUTH_CUSTOM` labels either.

### Testing Framework and Patterns

Vitest + React Testing Library, two projects (`unit`, `integration`) per `vitest.workspace.ts`. Existing SharePoint-adjacent tests use `render`/`screen`/`userEvent`, mock `@/utils/settings` while re-importing the real `CREDENTIAL_UI_MAPPING`, and mock `SharePointOAuthField` to isolate form-contract behavior from the OAuth popup.

### Coverage Gaps

- No existing test pins the field order or label text this ticket changes — a regression test asserting field render order (e.g., via `screen.getAllByRole('textbox')` order or querying labels in DOM order) and/or exact label strings would be new coverage, not a modification of an existing assertion.

---

## 5. Configuration and Environment

### Environment Variables

None specific to this feature area beyond the already-existing `dynPlaceholder('sharepoint', 'url')` / `dynDefault('sharepoint', 'url')` mechanism (`src/utils/settingsUIConfig.ts` lines 49-52, 67), which reads runtime tool-field defaults/placeholders from `appInfoStore.toolFieldDefaults` / `toolFieldPlaceholders` (populated from a backend-served config, not a `.env`/`window._env_` value).

### Configuration Files

- `src/utils/settingsUIConfig.ts` — the single file governing Sharepoint Integration field labels, placeholders, help links, and order.
- `src/constants/integration.ts` / `src/constants/dataSources.ts` — credential-type and auth-type enums referenced by both forms; no field-label content lives here.

### Feature Flags and Deployment Concerns

No feature flag gates the Sharepoint "Azure app registration" field set itself (`SHAREPOINT_AUTH_METHOD_OPTIONS` is always shown for the `sharepoint` credential type). A feature flag (`features:sharepointCodeMieOAuth`, seen in `IndexTypeSharePoint.tsx` line 98) gates only the Datasource form's `OAUTH_CODEMIE` option, unrelated to this ticket's scope. No deployment-manifest or Dockerfile reference to SharePoint field content was found.

---

## 6. Risk Indicators

- Speculative: Reordering `client_id`/`tenant_id` in `CREDENTIAL_UI_MAPPING.sharepoint.fields` (settingsUIConfig.ts) is a pure object-key-order change with no schema/type impact, since `CredentialFields.tsx` already renders in declaration order — this is a low-risk, localized edit.
- Speculative: The ticket's naming-consistency criterion is ambiguous about direction — the Datasource form's `OAUTH_CUSTOM` labels ("Azure Application (client) ID", "Azure Directory (tenant) ID") and the Integration form's current labels ("Azure AD Application (Client) ID", "Azure AD Tenant ID", "Azure AD Client Secret") both differ from the ticket's own stated target strings ("Tenant ID", "Application (Client) ID", "Client Secret" — no "Azure"/"Azure AD"/"Azure Directory" prefix at all). The spec stage needs to pick one canonical wording, since matching the Datasource form's wording is not equivalent to matching the ticket description's literal wording.
- The two screenshot attachments referenced in the Jira ticket (showing current field order/naming for both forms) are not available in this repository or filesystem — the spec stage is working from the text description only, not the visual evidence the ticket author used to write it.
- `getLabel()` in `CredentialFields.tsx` derives the visible label by truncating placeholder text at the first `(`/`,`/"e.g."` — any new placeholder text chosen for `client_id` must be checked against this heuristic, since a naming change without an explicit `label` could unintentionally alter what's *displayed as the label* versus what's shown as placeholder-inside-the-field.
- No existing test pins current field order/labels, so there is no assertion to "notice" the requested change is missing (a gap, not a blocker) — the testing stage will need to add new assertions rather than update failing ones.
- The Sharepoint Datasource form has no standalone "app registration" (client_secret-bearing) field set of its own — its only path to Tenant/Client ID fields is the OAuth-custom sign-in flow (no secret) or delegating to the Integration form via `IntegrationSection`/`NewIntegrationPopup`. This means "consistent naming" cannot be achieved by literally reusing one shared fields object across both forms without also touching `IndexTypeSharePoint.tsx`'s inlined OAuth-custom field labels, if the chosen convention is meant to apply everywhere the ticket implies "Sharepoint Datasource" naming appears.

---

## 7. Summary for Complexity Assessment

This task touches a single configuration layer file, `src/utils/settingsUIConfig.ts`, specifically the `sharepoint` entry (four fields: `url`, `client_id`, `tenant_id`, `client_secret`) inside `CREDENTIAL_UI_MAPPING`. The rendering layer, `CredentialFields.tsx`, already iterates fields in object-declared order with no explicit ordering property, so the reorder itself is a small, mechanical edit (swap two object keys). The naming-consistency requirement is comparison-only against `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeSharePoint.tsx`'s `OAUTH_CUSTOM` auth branch, which is the only place in the Datasource form that declares Tenant ID/Client ID style labels directly (the Datasource form's "Use Integration" method reuses this same Integration form/config, so no code change is needed there for the reuse path).

Technical novelty is low — no new component, pattern, API call, or state shape is required; this is a content/order change inside an existing declarative config object consumed by an existing renderer. The primary complexity driver is not code mechanics but disambiguating which exact label text to converge on, since the ticket's own stated target wording ("Tenant ID", "Application (Client) ID", "Client Secret") does not exactly match either form's current wording, and the two Jira screenshots that presumably resolve this ambiguity are not available in this repository.

Test coverage posture: no existing test asserts field order or exact label text for either form, so this change requires new test coverage rather than modification of a failing assertion — a moderate, well-scoped addition using the existing Vitest/RTL patterns already established in `SettingsForm.sharePointAuth.test.tsx`. Key risk factors are entirely specification risk (exact wording, and whether the Datasource form's own labels should also change for true parity) rather than implementation risk.

---

## 8. External References

None named by the task. The task_context references two Jira screenshot attachments as supporting evidence for current field order/naming, but explicitly notes they are "not available locally" — no filesystem or URL path was given for them, so they could not be retrieved or read during this research.
