# Technical Research

**Task**: oauth integration field titles labels settingsUIConfig SettingsForm credential
**Generated**: 2026-09-02
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14580 (Sub-Bug, parent EPMCDME-13527) — "OAuth integration fields for GitLab, Jira, and Confluence have non-human-readable titles".

Summary: OAuth integration configuration fields for GitLab, Jira, and Confluence display non-human-readable titles. Some field titles duplicate tooltip/default placeholder values (raw URLs) instead of showing meaningful field names.

Actual result — field TITLES render as raw URLs:
  - GitLab: "https://gitlab.com", "https://your-codemie-host"
  - Jira: "https://your-codemie-host"
  - Confluence: "https://your-codemie-host"

Expected: OAuth config fields have clear, human-readable titles that describe each field's purpose. URL values appear only as placeholders/default examples, never as field titles.

Acceptance Criteria:
  - GitLab/Jira/Confluence OAuth config fields display human-readable titles.
  - Field titles do NOT duplicate tooltip values or default placeholder values.
  - URL values (https://gitlab.com, https://your-codemie-host) shown only as intended placeholders/examples, not titles.
  - The fix does not break OAuth configuration behavior.
  - Updated field titles are clear enough for users to understand the expected value.

The user also wants better (more human-readable) naming proposals for these fields.

Repo: codemie-ui (React/TypeScript/Vite). Relevant known files: src/utils/settingsUIConfig.ts (CREDENTIAL_UI_MAPPING with per-field placeholder/help/defaultValue), src/pages/integrations/components/SettingsForm/SettingsForm.tsx (renders the form fields). The OAuth credential type entries for GitLab/Jira/Confluence live in CREDENTIAL_UI_MAPPING (fields: instance_url, client_id, client_secret, callback_base_url).

---

## 2. Codebase Findings

### Existing Implementations

- `src/types/settingsUI.ts` — TypeScript types. `CredentialFieldConfig` (lines 49-78) is the per-field config type. **It already declares an optional `label` property at line 50: `label?: string | ((values: Record<string, unknown>) => string)`.** Other properties: `placeholder?` (51), `type?` (52), `help?` (54), `sensitive?` (55), `shouldShow?` (56), `note?` (57), `options?` (63), `validation?` (67), `defaultValue?` (69), `personalFeatureFlag?` (121).
- `src/utils/settingsUIConfig.ts` — defines `CREDENTIAL_UI_MAPPING`, all credential types and their per-field config. The three OAuth entries (GitLab lines 986-1012, Jira 1013-1034, Confluence 1035-1056) supply only `placeholder`/`help`/`defaultValue` and **omit `label`**.
- `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` — the component that actually renders each field and computes the visible title. **The bug lives here, not in SettingsForm.tsx.**
- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` — form container; passes `fields` down to `CredentialFields`. Also renders section titles via `getSettingsFieldsSectionTitle`.
- `src/utils/settings.ts` — `getCredentialUIMapping()`, `getCredentialDefaults()`, `getSettingsFieldsSectionTitle()` (line 179) wrap/consume `CREDENTIAL_UI_MAPPING`.

### Root Cause — how the field TITLE is derived

The rendered field title falls back to the placeholder when no explicit `label` is present:

- `src/pages/integrations/components/SettingsForm/CredentialFields.tsx:247` — Input renders `label={getLabel(label ?? placeholder)}`. Fallback chain is `label ?? placeholder`.
- `getLabel` (CredentialFields.tsx:166-170):
  ```ts
  const getLabel = (placeholder: any) => {
    const text = getPlaceholder(placeholder)
    const label = text.split(',')[0].split('(')[0].split('e.g.')[0].trim()
    return label.replace('Optional field', '').trim()
  }
  ```
  It only trims trailing qualifiers off whatever string it receives; it does **not** humanize a field key. `getPlaceholder` (159-164) resolves function-valued placeholders but otherwise returns the raw string.
- Because the OAuth fields have no `label`, the chain uses `placeholder`. For `instance_url` the placeholder is `'https://gitlab.com'` and for `callback_base_url` it is `'https://your-codemie-host'`, so the raw URL becomes the rendered title.
- `select`/`textarea` variants at CredentialFields.tsx:287 and :309 use `getLabel(placeholder)` (no label fallback at all) — same class of issue if their placeholders were URLs.

**Bug source (single line):** `src/pages/integrations/components/SettingsForm/CredentialFields.tsx:247` — `label={getLabel(label ?? placeholder)}` falling back to a URL placeholder. Root data cause: missing `label` on the OAuth field entries in `src/utils/settingsUIConfig.ts` (notably `instance_url` ~line 991 and every `callback_base_url` at ~1005/1027/1049).

### Affected OAuth mapping entries (`src/utils/settingsUIConfig.ts`) — none set `label`

- GitLab OAuth (lines 986-1012):
  - `instance_url` (991-995): placeholder + defaultValue `'https://gitlab.com'`, help present — **renders URL as title**
  - `client_id` (996-999): placeholder `'GitLab OAuth Application ID'`
  - `client_secret` (1000-1004): placeholder `'GitLab OAuth Application Secret'`, sensitive
  - `callback_base_url` (1005-1010): placeholder `'https://your-codemie-host'`, help present — **renders URL as title**
- Jira OAuth (lines 1013-1034):
  - `client_id` (1018-1021): placeholder `'Atlassian OAuth Client ID'`
  - `client_secret` (1022-1026): placeholder `'Atlassian OAuth Client Secret'`, sensitive
  - `callback_base_url` (1027-1032): placeholder `'https://your-codemie-host'` — **renders URL as title**
- Confluence OAuth (lines 1035-1056):
  - `client_id` (1040-1043): placeholder `'Atlassian OAuth Client ID'`
  - `client_secret` (1044-1047): placeholder `'Atlassian OAuth Client Secret'`, sensitive
  - `callback_base_url` (1049-1053): placeholder `'https://your-codemie-host'` — **renders URL as title**

Note: the `client_id`/`client_secret` fields render acceptably (their placeholders are text), but they still lack a concise explicit `label`.

### Architecture and Layers Affected

- **Config/Data layer**: `src/utils/settingsUIConfig.ts` (`CREDENTIAL_UI_MAPPING`) — the declarative field definitions. **This is where the fix belongs.**
- **Presentation/Render layer**: `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` — the fallback logic (`getLabel`, `label ?? placeholder`). Optional hardening lives here if the team wants to prevent URL-shaped placeholders from ever becoming titles.
- **Types layer**: `src/types/settingsUI.ts` — `CredentialFieldConfig` already has `label`; **no type change required.**

### Integration Points

Consumers of `CREDENTIAL_UI_MAPPING` / `CredentialFieldConfig` / `CredentialUIMap` (blast radius):
- `src/utils/settings.ts` — re-exposes via `getCredentialUIMapping`, `getCredentialDefaults`, `getSettingsFieldsSectionTitle`
- `src/hooks/useIntegrationTypeOptions.ts` — consumes the mapping for type options
- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` and `CredentialFields.tsx` — render consumers
- Tests: `src/utils/__tests__/settings.test.ts`, and `src/pages/integrations/components/SettingsForm/__tests__/{CredentialFields.test.tsx, SettingsForm.oauth.test.tsx, SettingsForm.autoFill.test.tsx, SettingsForm.resourceReset.test.tsx, SettingsForm.sharePointAuth.test.tsx}`

Because the fix only adds `label` values to existing entries (a property already in the type), the change is **data-only**; it does not ripple through the type system. Type-change blast radius is zero.

### Patterns and Conventions

- Form stack: `react-hook-form` (`Controller`, `useWatch`, `useFormState`), `@hookform/resolvers/yup` + `yup` for validation, `valtio` (`useSnapshot`), `lodash/orderBy`. Local form UI components: `@/components/form/Input`, `Autocomplete`, `Switch`, `Textarea`, `MultiSelect`, `RadioGroup`, `RecordInput`, `InputCopy`.
- **Existing intended label mechanism**: the `label` property on `CredentialFieldConfig` (type line 50). It is already widely used by other entries — e.g. `jira url` (`label: 'URL'`, settingsUIConfig.ts:189), `keycloak base_url` (`'Base URL'`, :369), `xray base_url` (`'Base URL'`, :632), `sql port` (`'Port Number'`, :552).
- **Closest precedent for OAuth-style fields**: the `email` OAuth block gives full descriptive labels — `'Email address to send from'` (:490), `'Microsoft Entra ID Tenant'` (:495), `'Microsoft Entra ID Application Client ID'` (:500), `'Microsoft Entra ID Application Secret'` (:505). The `webhook` block does likewise (`'Webhook ID'` :857, `'GitHub Webhook Secret'` :898, etc.).
- `client_id`/`client_secret` already appear elsewhere as `'Client ID'`/`'Client Secret'` (xray :637/:641, azure :384/:385, keycloak :374/:375).
- **Mechanical constraint**: `getLabel` strips everything after the first comma, `(`, or `e.g.`, so any `label` must be clean up front. Provider URLs must stay only in `placeholder`/`help`, never as the de-facto title.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/` exists at repo root.
  - `.ai-run/guides/patterns/form-patterns.md` — relevant. Codifies RHF + Yup + `src/components/form/` usage, `Input` with a human-readable `label` prop, and "`??` over `||` for defaults." No explicit field-label-naming rule.
  - `.ai-run/guides/components/component-patterns.md`, `.ai-run/guides/patterns/accessibility-patterns.md` — tangential (labels for a11y). No credential-field naming convention.
- No dedicated integration/credential-label naming guide exists.

### Architectural Decisions

- **An accepted fix for this exact ticket already exists as a recorded diff (not yet applied to the file on disk):**
  `docs/superpowers/tasks/2026-09-01-oauth-config-field-titles/code-review.diff` adds explicit `label:` to every OAuth field:
  - GitLab: `'GitLab Instance URL'`, `'Application ID'`, `'Application Secret'`, `'Callback Base URL'`
  - Jira/Confluence: `'Client ID'`, `'Client Secret'`, `'Callback Base URL'`
  - `docs/superpowers/tasks/2026-09-01-oauth-config-field-titles/.state.json` — flow `sdlc-light`, branch `EPMCDME-14587_reuse-existing-jira-confluence-integration-types`, phase `maintenance`.
  - `.ai-run/runs/EPMCDME-14587_reuse-existing-jira-confluence-integration-types.json` — related run record.
- `docs/superpowers/plans/2026-07-31-gitlab-oauth-per-user-connect-ui.md` — background on the GitLab OAuth UI (context only).
- No `TODO`/`HACK`/`FIXME` markers in `settingsUIConfig.ts` or `SettingsForm.tsx`. (Non-tagged explanatory comments exist at ~706-707, ~837-839, ~848-851 about section-title suppression and webhook grouping.)

### Derived Conventions

- Credential/OAuth fields should carry an explicit descriptive `label`; relying on placeholder-derived titles is the anti-pattern that caused this bug.
- Naming proposals grounded in existing precedent:
  - `instance_url` → `'GitLab Instance URL'` (mirrors the "URL"/"Base URL" convention at :189/:369/:632)
  - `client_id` → `'Client ID'` (or provider-flavored `'Application ID'` for GitLab, matching GitLab's own terminology)
  - `client_secret` → `'Client Secret'` (or `'Application Secret'` for GitLab)
  - `callback_base_url` → `'Callback Base URL'` (no prior instance; the accepted diff standardizes on this)
- Keep `https://gitlab.com` / `https://your-codemie-host` in `placeholder`/`help` only.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/settings.test.ts` — imports `CREDENTIAL_UI_MAPPING`; covers only URL field `defaultValue`/`placeholder` functions and boolean/string defaults. Zero `.label` references — field titles are NOT asserted.
- `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` — renders `CredentialFields` and asserts field/section-header label text (e.g. `getByRole('checkbox', { name: option.label })`, section header `<h5>`). Closest existing coverage to title rendering, but uses synthetic field configs, not the real OAuth mappings.
- `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx` — mocks `settings` + real `settingsUIConfig`; tests the `gitlaboauth` flow. Locates fields by `getByPlaceholderText(...)` (e.g. line 80 uses `'https://your-codemie-host'`) and asserts submitted payload. Does NOT assert human-readable titles. **Because it keys off placeholder, not title, it will keep passing after labels are added.**
- Other SettingsForm tests (`resourceReset`, `autoFill`, `sharePointAuth`, `OAuthTestAction`) are not title-related.

### Testing Framework and Patterns

- **Vitest 1.6.1** with `@testing-library/react@16.3.0`, `@testing-library/jest-dom@6.6.3`, `@testing-library/user-event@14.6.1`, `jsdom@24.1.3`, coverage via `@vitest/coverage-istanbul@1.6.1`. No Jest.
- Config: `vitest.workspace.ts` defines two projects — `unit` (jsdom, mocks Valtio/stores, setup `./src/setupTests` + `./src/setupTests.unit`) and `integration` (real Valtio, `.integration.test.*` only); both extend `vite.config.ts`.
- Patterns: `render`/`screen` + `userEvent`, `vi.mock` for `@/utils/settings`, `valtio`, `@/store/user`; query-by-role/placeholder/text. Shared helpers under `src/test-utils/` (`integration.tsx`, `_mock-state.ts`, `component-interactions/`). Representative example: `SettingsForm.oauth.test.tsx`.

### Coverage Gaps

- No test asserts the human-readable field TITLE/label for GitLab/Jira/Confluence OAuth credential types in `CREDENTIAL_UI_MAPPING` — the exact regression (title rendered as raw URL) is untested.
- `getSettingsFieldsSectionTitle` (`src/utils/settings.ts:179`) and its render usage in `SettingsForm.tsx` (~lines 654-658) are untested.
- No end-to-end assertion that a rendered SettingsForm shows a readable label rather than a URL for the affected OAuth types. **A regression test asserting the readable title is the natural TDD addition.**

---

## 5. Configuration and Environment

### Environment Variables

- No env vars govern these hosts. `.env` defines only `VITE_API_URL`, `VITE_ENV`, assistant slugs, `VITE_SUFFIX`, and Keycloak SSO vars — none relate to `callback_base_url`/`instance_url`. The only runtime URL indirection is `VITE_API_URL` via `window._env_?.VITE_API_URL` (`src/utils/api.ts:143`), unrelated to OAuth field titles.

### Configuration Files

- `src/utils/settingsUIConfig.ts` — credential-type field definitions (label/placeholder/help/defaultValue). **Fix belongs here.**
- `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` — rendering/fallback logic.
- `.env` — build-time VITE vars (not the OAuth hosts).
- `vite.config.ts` — build config.

### Feature Flags and Deployment Concerns

- No feature flag controls OAuth integration UI. Flags live in `src/constants/featureFlags.ts` (`ENTERPRISE_EDITION`, `COST_CENTERS`, `MCP_CONNECT`, ...) and are applied in `src/router.tsx`. A per-field `personalFeatureFlag?` type exists (`src/types/settingsUI.ts:121`) but is not used on these OAuth fields.
- **No i18n / localization.** No `i18next`/`react-i18next`/`react-intl` in `package.json`; no `useTranslation`/`FormattedMessage` in `src`. The only `i18n.ts` (`src/authentication/keycloak-theme/login/i18n.ts`) is Keycloakify login-theme scoped and unrelated. Labels are hardcoded strings, so the fix is a plain string edit — not adding translation keys.
- Default URL values are hardcoded literals in `settingsUIConfig.ts` (`your-codemie-host` appears only there plus one test), not env-driven.

---

## 6. Risk Indicators

- **No regression test exists for the exact bug** — no test asserts the rendered field title for GitLab/Jira/Confluence OAuth types. A fix could pass CI without proving the regression is closed unless a title assertion is added (`CredentialFields.test.tsx` / `SettingsForm.oauth.test.tsx` are the natural homes).
- **`getLabel` placeholder-parsing is fragile** (`CredentialFields.tsx:166-170`): it silently derives a title from the placeholder and strips after `,` `(` `e.g.`. Any future field that omits `label` and has a URL/opaque placeholder reintroduces this class of bug. Consider hardening the fallback (e.g. never use a URL-shaped string as a title) in addition to the data fix.
- **`select`/`textarea` branches lack even the `label ??` fallback** (`CredentialFields.tsx:287`, `:309` use `getLabel(placeholder)` directly) — if the fix adds `label` only for text inputs, other field kinds remain placeholder-driven. Verify the affected OAuth fields are all text inputs (they are: instance_url/client_id/client_secret/callback_base_url).
- **A previously reviewed fix diff already exists but is not applied** (`docs/superpowers/tasks/2026-09-01-oauth-config-field-titles/code-review.diff`, tied to branch `EPMCDME-14587_...`). Risk of duplicate/divergent work or a merge that conflicts with the current file. Reconcile with that diff before implementing; label wording should be consistent with it (GitLab `'GitLab Instance URL'`/`'Application ID'`/`'Application Secret'`/`'Callback Base URL'`; Jira/Confluence `'Client ID'`/`'Client Secret'`/`'Callback Base URL'`).
- **Placeholder-keyed tests couple to placeholder strings** (`SettingsForm.oauth.test.tsx:80` queries `getByPlaceholderText('https://your-codemie-host')`). Fine as long as placeholders are unchanged; but if the fix also edits placeholders, these tests break.
- **No documented field-label naming convention** in `.ai-run/guides/` — naming is inferred from precedent (`email`/`webhook` OAuth blocks). Low risk but worth capturing so future OAuth fields set `label`.
- **`getSettingsFieldsSectionTitle` (settings.ts:179) is untested** — adjacent title logic; not the bug, but touching the title path without coverage carries mild regression risk.
- Repo is not a git repo per environment (`Is directory a git repo: No`) — branch/merge reconciliation with the existing diff may need manual attention.

---

## 7. Summary for Complexity Assessment

This is a **low-complexity, data-layer bug fix**. The task touches primarily one file — `src/utils/settingsUIConfig.ts` — where the three OAuth credential blocks (GitLab lines 986-1012, Jira 1013-1034, Confluence 1035-1056) must each gain an explicit human-readable `label` on four fields (`instance_url`, `client_id`, `client_secret`, `callback_base_url`). The `label` property **already exists** on the `CredentialFieldConfig` type (`src/types/settingsUI.ts:50`) and is widely used by other credential entries, so **no type change and no signature change is needed** — the blast radius through the type system is zero. The render path (`CredentialFields.tsx:247`, `label={getLabel(label ?? placeholder)}`) already prefers `label` when present; supplying it eliminates the placeholder-URL fallback that is the root cause. Estimated file change surface: 1 file (data), plus 1 test file for a regression assertion, and optionally 1 render file if the team hardens `getLabel` against URL-shaped placeholders.

**Technical novelty is essentially nil** — the fix follows an established, in-repo pattern (the `email` and `webhook` OAuth blocks already set descriptive labels; `client_id`/`client_secret` labels appear across xray/azure/keycloak entries). There is no i18n, no env var, no feature flag involved; labels are hardcoded strings. Notably, **a previously reviewed fix diff already exists** at `docs/superpowers/tasks/2026-09-01-oauth-config-field-titles/code-review.diff` with concrete label wording — this should be reconciled to avoid duplicate/divergent work and is a mild coordination risk rather than a technical one.

**Test coverage posture is mixed-to-thin for the exact defect.** Vitest + Testing Library infrastructure is mature and the OAuth flow has behavioral tests (`SettingsForm.oauth.test.tsx`), but those key off placeholders, not titles, and **no test asserts the human-readable field title** — so the regression is currently unguarded. The main risk factors for scoring: (1) add a title-assertion regression test or the fix is unproven; (2) the `getLabel` placeholder-derivation is a fragile pattern that will re-bug future fields lacking `label`; (3) `select`/`textarea` render branches lack the `label ??` fallback entirely (not triggered by these text-input OAuth fields, but relevant if hardening); (4) reconcile with the pre-existing reviewed diff. Overall effort is small and well-scoped, with the primary judgment call being whether to also harden the renderer or only patch the data.
