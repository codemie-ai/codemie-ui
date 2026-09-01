# Technical Research — Comment out OAuth switchers (EPMCDME-14586)

**Task**: temporarily hide gitlab-oauth type + jira/confluence oauth sign-in toggle by commenting code
**Generated**: 2026-09-01
**Research path**: filesystem (inline; precise two-spot change).
**Repo**: codemie-ui (frontend) · Branch: `EPMCDME-14586_comment-out-oauth-switchers` (from main)

---

## 1. Original Context

Team direction (temporary): comment out — do NOT delete — the OAuth switchers on the frontend so they
disappear from the integration form, while leaving the code in place for easy re-enable:
- **GitLab OAuth credential type** — removed from the credential-type dropdown.
- **Jira & Confluence "Use OAuth 2.0 sign-in" toggle** — removed from the form.

## 2. Codebase Findings

### Spot A — GitLab OAuth credential type
`src/utils/settingsUIConfig.ts:979-1005` — the `[GITLAB_OAUTH_CREDENTIAL_TYPE]: { … }` entry in
`CREDENTIAL_UI_MAPPING`. Its presence is why `gitlaboauth` appears in the credential-type select
(`getAvailableCredentialsTypes` returns `Object.keys(getCredentialUIMapping(...))`; GitLab has no base
type, so — unlike jira/confluence variants hidden via `OAUTH_VARIANT_CREDENTIAL_TYPES` — it shows
directly). `GITLAB_OAUTH_CREDENTIAL_TYPE` is imported at `:20` and used only for this key (grep confirms
`:20` and `:979` only), so commenting the entry also orphans the import (comment that import name too).
Nothing else in `settingsUIConfig` references it. `OAuthTestAction`/connect hooks branch on the
credential-type string, not this config entry, so they are unaffected (dead branch only).

### Spot B — Jira/Confluence "Use OAuth 2.0 sign-in" toggle
`src/pages/integrations/components/SettingsForm/SettingsForm.tsx`:
- Render block `:569-581` — `{showOAuthToggle && (<Switch … label="Use OAuth 2.0 sign-in" … />)}`.
- Supporting consts `:293-303` — `oauthVariantType` (293), `isOAuthVariantSelected` (294),
  `showOAuthToggle` (296-298), `handleOAuthToggle` (300-303). These are used ONLY by the toggle
  (`isOAuthVariantSelected`→573, `handleOAuthToggle`→574, `showOAuthToggle`→569, `oauthVariantType`→294/297/301).
- `baseCredentialType` (292) is used by the type select `value={baseCredentialType}` (`:558`) and must
  be KEPT; `getBaseTypeForOAuthVariant` (import) stays (used at 292 and 350).
- `OAUTH_VARIANT_BY_BASE_TYPE` (import) is used only at `:293` → orphaned when the consts are commented;
  comment that import too. `Switch` (import) stays (used by another switch at `:540`);
  `CREDENTIAL_VALUES_MAPPING` stays (used at `:155/:162`).

### Change shape (comment out, keep code)
- Spot A: block-comment the `[GITLAB_OAUTH_CREDENTIAL_TYPE]` entry; line-comment its import name.
- Spot B: block-comment the toggle JSX (`:569-581`) and the four supporting consts (`:293-303`, keeping
  `baseCredentialType` at 292); line-comment the `OAUTH_VARIANT_BY_BASE_TYPE` import.
- Add an `EPMCDME-14586:` marker comment at each site so it is obviously temporary and easy to revert.

## 3. Testing Landscape
- `src/utils/__tests__/settings.test.ts` — assert `getAvailableCredentialsTypes(...)` (and
  `CREDENTIAL_UI_MAPPING`) no longer includes `gitlaboauth`.
- `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx` — render
  `SettingsForm` for a jira credential and assert the `Use OAuth 2.0 sign-in` toggle is not rendered.
  (Rendering the `jira` base type triggers `dynPlaceholder('jira','url')`, which reads
  `appInfoStore.toolFieldPlaceholders`; the file's appInfoStore mock must include
  `toolFieldPlaceholders: {}`, and `getAvailableCredentialsTypes` must return the jira types.)

## 4. Risk Indicators
- **Lint/typecheck orphans**: commenting render code orphans its supporting consts/imports. The mapping
  above enumerates exactly what to comment (Spot B: 4 consts + 1 import; Spot A: entry + 1 import).
  Stage 6 typecheck/lint + the pre-commit hook will catch any missed reference.
- **Temporary by design**: this is a revert-later hack; the config-driven visibility work (MR !1783,
  the other branch) is the permanent solution — do not conflate.
- **Do not touch** the `jiraoauth`/`confluenceoauth` config entries — only the toggle that reaches them
  is hidden; the entries stay (harmless, unreachable via UI).
- Low risk: two-file, reversible comment-out; no behavior beyond hiding two UI affordances.
