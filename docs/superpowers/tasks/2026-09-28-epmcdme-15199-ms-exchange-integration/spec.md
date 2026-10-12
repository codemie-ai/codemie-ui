# EPMCDME-15199: Microsoft Exchange integration UI

## Purpose

Let users create, edit, and view a Microsoft Exchange integration on the Integrations page. Backend
credential type, validation, encryption, and masking already exist (codemie MR !4354, branch
`epmcdme-15199`). This is a UI-only, declarative-config change — no new component, store method, or
endpoint.

## Approach

Add one new entry to `CREDENTIAL_UI_MAPPING` in `src/utils/settingsUIConfig.ts`, keyed `msExchange`,
combining two existing patterns already in that file:

- **`email`** (`src/utils/settingsUIConfig.ts:464-523`): an `auth_type` select field whose value
  gates a set of conditional fields via local `isX(values)` predicates referenced in each field's
  `shouldShow`.
- **`[MS_TEAMS_CREDENTIAL_TYPE]`** (`src/utils/settingsUIConfig.ts:1027-1045`): no `url` field,
  `testable: false`. MS Exchange copies only this shape, not Teams's `featureFlag` /
  `roleRestrictionType` / `accessType` fields — no flag or role restriction is requested for this
  integration, so those keys are omitted entirely (defaults: `accessType: ALL`,
  `roleRestrictionType: GENERAL`).

No other file needs a code change: `SettingsForm.tsx` and `CredentialFields.tsx` already render any
`CredentialTypeConfig` generically (confirmed in the technical analysis), so a correct mapping entry
is sufficient for the full form to appear, submit, and mask correctly.

## Entry shape

- `displayName: 'Microsoft Exchange'` — exact string; also the label shown in the "new integration"
  type list, satisfying AC1.
- `serverEnum: 'MSExchange'` — required explicitly; `getOriginalCredentialType` (`src/utils/settings.ts`)
  falls back to `capitalize(key)` when `serverEnum` is absent, and `capitalize('msExchange')` would
  produce `'Msexchange'`, not `'MSExchange'`. This is the single highest-consequence line in the
  entry: a wrong value silently sends the wrong credential type on save (breaks AC4).
- `testable: false` — explicit, not omitted. Several sibling entries (`email`, `jira`) default
  `testable: true`; leaving this unset would silently violate AC6 (no test-connection button).
- No `defaultUrl` (MS Exchange has no URL field on the shared/base level; each auth path has its own
  URL-shaped field where relevant — `ews_url` for NTLM only).
- `fields.auth_type`: `type: select`, `label: 'Authentication Type'`, options
  `{ value: 'oauth_azure', label: 'OAuth via Microsoft Entra ID Application' }` and
  `{ value: 'ntlm', label: 'NTLM' }` (label wording follows `email`'s existing OAuth-Azure option
  label for consistency). **No `defaultValue`** — the user must actively choose, satisfying AC2, and
  matching the backend's `auth_type: ExchangeAuthType | None = Field(default=None)` which rejects a
  missing value.
- `fields.mailbox`: plain input, visible unconditionally (`shouldShow` omitted or always-true) since
  it is required on both paths. Required by Yup, non-blank.
- OAuth-path fields (`oauth_tenant_id`, `oauth_client_id`, `oauth_client_secret`): each
  `shouldShow: (values) => values.auth_type === 'oauth_azure'`. `oauth_client_secret` additionally
  `sensitive: true`.
- NTLM-path fields (`ews_url`, `service_account_username`, `service_account_password`): each
  `shouldShow: (values) => values.auth_type === 'ntlm'`. `service_account_password` additionally
  `sensitive: true`.
- A local predicate pair (e.g. `isOAuthAzureExchangeAuth` / `isNtlmExchangeAuth`) mirrors the existing
  `isBasicEmailAuth`/`isOAuthAzureAuth` and `isPatGitAuth`/`isGithubAppAuth` naming convention, rather
  than inlining the arrow function on every field.

## Validation

Each field carries its own Yup `validation`, mirroring the `sql` entry's dialect-conditional shape
(`src/utils/settingsUIConfig.ts:575-579` and similar):

- `auth_type`: `Yup.string().required(...)`.
- `mailbox`: `Yup.string().required(...)` (Yup's `required` already rejects a whitespace-only string
  once trimmed; use `.trim()` or an equivalent non-blank check so a spaces-only value is rejected
  client-side, matching the backend's `.strip()`-then-check).
- Each path-specific field: `Yup.string().when('auth_type', { is: <path check>, then: (s) =>
  s.required(...), otherwise: (s) => s.nullable().optional() })`, matching the `sql` pattern exactly.

This mirrors backend requiredness (`ms_exchange/models.py`'s `_validate_selected_path`) client-side
without duplicating backend logic elsewhere.

## Tests

Extend `src/utils/__tests__/settingsUIConfig.test.ts` with a new `describe('msExchange', ...)` block
(no existing generic assertion covers "entry has X displayName/serverEnum" across all types, so this
is new coverage, not an extension) asserting:

- `CREDENTIAL_UI_MAPPING.msExchange.serverEnum === 'MSExchange'` and `.displayName === 'Microsoft
  Exchange'`.
- `.fields.auth_type.defaultValue` is `undefined`.
- `.fields.oauth_tenant_id/oauth_client_id/oauth_client_secret.shouldShow` return `true` only when
  `auth_type === 'oauth_azure'`; `.fields.ews_url/service_account_username/service_account_password
  .shouldShow` return `true` only when `auth_type === 'ntlm'`.
- `.fields.mailbox.shouldShow` (if present) returns `true` for both auth types, or the field has no
  `shouldShow` at all.
- `.fields.oauth_client_secret.sensitive === true` and `.fields.service_account_password.sensitive
  === true`.
- Validation matrix: each path field's `.validation` rejects blank/whitespace when its path is
  selected and accepts a missing value when the other path is selected (same shape as the existing
  `sql` block's conditional-validation assertions).

No `SettingsForm`-level test is added — the acceptance criteria this task tracks (type list label,
conditional field visibility, masking) are all expressible against the config object directly, as
they already are for every other credential type.

## Non-goals

- No test-connection support (`testable: false`) — Exchange has no protocol/tool code yet.
- No mail-reading, polling, or assistant tool-picker changes — no backend tool implementation exists
  yet for this credential type.
- No feature flag or role restriction — none was requested, and none exists in
  `src/constants/featureFlags.ts` for this integration; the entry is visible to all users under the
  same `accessType`/`roleRestrictionType` defaults as most other credential types.
- No changes to `SettingsForm.tsx`, `CredentialFields.tsx`, the settings store, or any API layer —
  all consume `CREDENTIAL_UI_MAPPING` generically and need no MS-Exchange-specific branching.
- No specific field grouping/layout (`rowGroup`, `position: top`) is mandated; default single-column
  rendering in field-declaration order is acceptable unless a later review calls for grouping mailbox
  with the auth-path fields.

## Open risk

None outstanding beyond what this spec already pins down. The technical analysis's flagged
precision risks (exact `serverEnum` string, explicit `testable: false`, both secrets marked
`sensitive: true`, the not-yet-established "no defaultValue" test shape) are each addressed above.
