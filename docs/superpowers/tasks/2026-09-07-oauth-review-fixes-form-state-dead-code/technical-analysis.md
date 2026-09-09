# Technical Analysis — Fix two MR !1798 review comments (OAuth form-state + dead helpers)

**Task:** Address Yana_Asadchaya's two unresolved review comments on codemie-ui MR !1798:
1. **(design)** `credentialType` encodes two concepts (integration type + auth method) via OAuth-variant
   folding; adopt the SharePoint pattern (a separate `isOAuth` flag) instead.
2. **(dead code)** Remove the six unused `use*OauthEnabled` / `is*OauthEnabled` helpers.

**Feature area:** oauth, integrations, settings-form, feature-flags.
**Repo/branch:** codemie-ui, `EPMCDME-14587_remove-new-types-fix-bugs` (MR !1798).

> Research conducted inline with tool-verified reads (consistent with this session's prior sdlc-light run).

## Codebase Findings

### Issue #2 — dead helpers (small, self-contained)
- `src/hooks/useFeatureFlags.ts`: `useGitlabOauthEnabled` / `useJiraOauthEnabled` / `useConfluenceOauthEnabled`.
- `src/utils/featureFlags.ts`: `isGitlabOauthEnabled` / `isJiraOauthEnabled` / `isConfluenceOauthEnabled`.
- Verified: each appears **only at its own definition — zero callers** across `src`. `SettingsForm` reads
  flags via `useFeatureFlag(OAUTH_VARIANT_FEATURE_FLAG[oauthVariantType])` directly. Safe to delete all six.

### Issue #1 — OAuth folding into `credentialType` (the design comment)
Current model in `src/pages/integrations/components/SettingsForm/SettingsForm.tsx`:
- **Initial state (`:150-165`)**: `credentialType` is set to the *OAuth variant* (`jiraoauth`/`gitlaboauth`/
  `confluenceoauth`) when editing a saved base integration carrying `auth_type=oauth`. So the variant IS
  the form-state value.
- **Toggle (`:326-328`)**: `handleOAuthToggle` calls `handleCredentialTypeChange(useOAuth ? oauthVariantType : baseCredentialType)` → `setCredentialType(...)`. Toggling changes the type value.
- **Field config**: `CREDENTIAL_VALUES_MAPPING[credentialType]` drives fields; when `credentialType` is the
  variant, OAuth fields render (variant keys exist in `CREDENTIAL_UI_MAPPING`).
- **Submit (`:509-519`)**: `credential_type: getOriginalCredentialType(credentialType)` folds the variant
  back to the base serverEnum, and when `isOAuthVariantSelected` a `{key:'auth_type',value:'oauth'}`
  marker is pushed into `credential_values`.
- **Select (`:594`)**: shows `value={baseCredentialType}` (folds the variant back for display).

Compensating helpers that exist *because* of the encoding:
- `OAUTH_VARIANT_BY_BASE_TYPE`, `OAUTH_VARIANT_CREDENTIAL_TYPES` (`src/constants/integration.ts:49,57`)
- `resolveOAuthVariant` (`integration.ts:90`), `getBaseTypeForOAuthVariant` (`integration.ts`)
- `getOriginalCredentialType` OAuth folding (`src/utils/settings.ts:112`)
- `useIntegrationTypeOptions` filter + the in-form `credentialTypeOptions` filter (`SettingsForm.tsx:332`)

### The SharePoint reference pattern (the comment's model) — verified it exists
- `const [sharePointAuthMethod, setSharePointAuthMethod]` (`SettingsForm.tsx:227`), initialized from
  `initialCredentialValues?.auth_type` (`:228`); `credentialType` stays `'sharepoint'` throughout.
- `isSharePointOAuth = isSharePoint && sharePointAuthMethod === OAUTH` (`:237`).
- Submit sends `auth_type = sharePointAuthMethod` explicitly (`:499`); fields keyed by a config lookup,
  not by `credentialType`.

## Risk Indicators (issue #1 is broader than the comment implies)

1. **The type-options filter cannot be fully removed as the comment claims.** `getAvailableCredentialsTypes`
   returns *all* non-deprecated keys of `CREDENTIAL_UI_MAPPING`, which still includes the variant keys
   (`jiraoauth`…). So even after `credentialType` stops holding the variant, the dropdown still needs to
   exclude those keys — either keep `OAUTH_VARIANT_CREDENTIAL_TYPES` + the filter, or add a new
   "hidden-from-select" mechanism. The reviewer's "eliminates the filter" is only partially true.
2. **Multi-file, multi-layer:** `SettingsForm.tsx` (state, toggle, fields, submit, select), plus decisions
   about `integration.ts` / `settings.ts` helpers, plus `useIntegrationTypeOptions.ts`.
3. **High test churn:** `SettingsForm.oauth.test.tsx`, `useIntegrationTypeOptions.test.tsx`,
   `settings.test.ts` (folding), `OAuthTestAction.test.tsx`, `integration.test.ts` all assert on the
   current variant-as-`credentialType` behaviour and would need rework.
4. **Near-merge MR:** !1798 is rebased, conflict-free, Sonar-clean, awaiting merge. #1 is a sizeable
   internal refactor that re-opens a large surface.
5. Backend contract is unaffected (submit still sends base type + `auth_type=oauth`) — so #1 is
   FE-internal, matching the reviewer's "no backward-compat concern."

## Scope conclusion
- **#2** is XS and safe — do it.
- **#1** is a legitimate design improvement but a broad refactor with real test churn and partial helper
  elimination — a **scope decision** the user should confirm (full refactor now on this MR vs. follow-up).
  Surface at the clarity check.
