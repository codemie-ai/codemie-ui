# Technical Research

**Task**: EPMCDME-15199 — Add Microsoft Exchange integration UI (Integrations page)
**Generated**: 2026-09-28
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-15199: Add Microsoft Exchange integration UI (Integrations page).

Let users create, edit and view a Microsoft Exchange integration on the Integrations page.
The backend already provides the credential type, config validation, secret encryption and masking
(backend MR done). This task covers only the UI form. Out of scope: mail reading, polling,
test-connection, and Exchange tools in the assistant tool picker (no backend protocol code / tools yet).

Backend contract (source of truth: src/codemie_tools/ms_exchange/models.py in the codemie repo):
- Credential type (server enum): MSExchange
- Tools label (backend ToolSet): "Microsoft Exchange" — display name in UI must match exactly
- Fields (credential keys):
  - auth_type (required, not sensitive): "oauth_azure" or "ntlm". No default — backend rejects missing/null.
  - mailbox (required on both paths, not sensitive): target mailbox address; blank/whitespace rejected.
  - oauth_tenant_id (required when auth_type=oauth_azure, not sensitive)
  - oauth_client_id (required when auth_type=oauth_azure, not sensitive)
  - oauth_client_secret (required when auth_type=oauth_azure, SENSITIVE)
  - ews_url (required when auth_type=ntlm, not sensitive)
  - service_account_username (required when auth_type=ntlm, not sensitive)
  - service_account_password (required when auth_type=ntlm, SENSITIVE)
- Required path fields: backend strips whitespace, rejects blank values. Fields of the unselected path are ignored.
- Both secrets encrypted at rest and masked (********) in API responses. UI has no LIST_OF_SENSITIVE_FIELDS
  equivalent — secrets are marked per-field with `sensitive: true` in the UI config.

What to change (per UI handoff doc, adjust to local conventions found in codebase):
1. src/utils/settingsUIConfig.ts: new entry (suggested key `msExchange`) in the credential UI mapping,
   following the existing `email` entry pattern (auth_type select with shouldShow-driven conditional
   fields) and the `MS Teams` entry pattern (no URL, no test button). testable: false. No defaultValue
   for auth_type since the user must choose.
2. Client-side Yup validation mirroring backend requiredness (auth_type required; mailbox required
   non-blank; selected-path fields required non-blank).
3. Tests: extend src/utils/__tests__/settingsUIConfig.test.ts (or nearest test file) covering: entry
   exists with serverEnum 'MSExchange' and displayName 'Microsoft Exchange'; auth_type has no default;
   OAuth fields visible only for oauth_azure, NTLM fields only for ntlm; mailbox visible for both;
   oauth_client_secret and service_account_password are sensitive: true.

Acceptance criteria:
1. "Microsoft Exchange" appears in the Integrations "new integration" type list, labelled exactly
   "Microsoft Exchange".
2. No auth method selected when the form opens.
3. Choosing OAuth shows tenant/client ID/client secret. Choosing NTLM shows EWS URL/username/password.
   Mailbox shown for both.
4. Saving sends credential type MSExchange with the keys above; backend accepts it.
5. Secrets masked in UI after saving; an edit that doesn't change a secret keeps the stored value,
   same as other sensitive fields.
6. No test-connection button.

---

## 2. Codebase Findings

### Existing Implementations

- `src/utils/settingsUIConfig.ts` — the single source of truth for per-credential-type UI config
  (`CREDENTIAL_UI_MAPPING: CredentialUIMap`, keyed by lowercase-ish credential key, e.g. `jira`,
  `email`, `sharepoint`, `[MS_TEAMS_CREDENTIAL_TYPE]`). Every entry declares `displayName`,
  `serverEnum`, `testable`, `fields: Record<string, CredentialFieldConfig>`. This is the file the
  task names as the change target — confirmed to exist and hold every other integration's config,
  including the two named reference patterns:
  - `email` entry (lines ~464–523): `auth_type` select with two options (`basic`, `oauth_azure`),
    `defaultValue: dynDefault('email', 'auth_type', 'basic')`, and a set of `oauth_*` fields each
    gated by `shouldShow: isOAuthAzureAuth` (a local predicate `(values) => values.auth_type === 'oauth_azure'`).
  - `[MS_TEAMS_CREDENTIAL_TYPE]` entry (lines ~1027–1045): no `url` field, `testable: false`,
    `fieldsSectionTitle: ''`, `accessType: CredentialAccessType.ALL`,
    `roleRestrictionType: CredentialRoleRestriction.ADMIN_ONLY`, `personalFeatureFlag`/`featureFlag`
    both set to `FEATURE_FLAGS.TEAMS_BOT_INTEGRATION`. No task requirement calls for a feature flag
    or role restriction on MS Exchange — those Teams-specific fields are not part of the reference
    pattern to copy, only "no URL, no test button".
- `src/types/settingsUI.ts` — defines the types the new entry must conform to:
  `CredentialTypeConfig` (`fields`, `testable`, `displayName`, `serverEnum`, `accessType`,
  `roleRestrictionType`, `fieldsSectionTitle`, …) and `CredentialFieldConfig` (`label`, `placeholder`,
  `type`, `sensitive`, `shouldShow: (values) => boolean`, `validation?: Yup.Schema`, `defaultValue`,
  `autoComplete`, …). `shouldShow` and `validation` are exactly the mechanisms the task's conditional
  fields and required-path validation need.
- `src/utils/settings.ts` — consumes `CREDENTIAL_UI_MAPPING` via `getCredentialUIMapping` (filters by
  access type/role/feature flag), `getOriginalCredentialType` (maps a UI key to `serverEnum`, falling
  back to `capitalize(value)` if `serverEnum` is absent — confirms `serverEnum: 'MSExchange'` must be
  set explicitly since `capitalize('msExchange')` would not produce that string), `getTestableCredentialTypes`,
  `getCredentialMessage`, `getSettingsFieldsSectionTitle`.
- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` — the form component that renders
  any credential type from the mapping (`credentialTypeOptions` built from `CREDENTIAL_TYPES` filtered
  and labelled via `CREDENTIAL_VALUES_MAPPING[type]?.displayName`), submits
  `credential_type: getOriginalCredentialType(credentialType)` and `credential_values` built from
  form state via `convertCredsToKeyValue`. A new mapping entry is picked up here automatically — no
  SettingsForm code change is indicated by the research.
- `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` — renders the field list
  driven by `CredentialFieldConfig` (`shouldShow`, `sensitive`, `type`), covered by
  `CredentialFields.test.tsx` and `CredentialFields.cronInput.test.tsx`.
- `src/utils/msTeamsSettings.ts` — companion module for the Teams entry (`MS_TEAMS_CREDENTIAL_TYPE`,
  `ASSISTANT_IDS_KEY`); referenced only as a naming/co-location precedent, not code MS Exchange needs.

### Architecture and Layers Affected

- **Config layer** (`src/utils/settingsUIConfig.ts`, `src/types/settingsUI.ts`) — primary and
  likely only layer touched for a working form: this is a declarative config object, not a new
  component.
- **Form layer** (`src/pages/integrations/components/SettingsForm/`) — reads the config generically;
  research found no per-credential-type branching there for rendering (branching exists for the
  Google OAuth / OAuth-variant special cases and SharePoint auth toggle, but those are pre-existing
  and unrelated).
- **Store layer** (`src/store/settings.ts`, `src/store/projectSettings.ts` per the integrations page)
  — unaffected; settings are generic `Setting`/`UserSetting`/`ProjectSetting` records with
  `credential_values: SettingCredentialValue[]`, no MS-Exchange-specific typing.

### Integration Points

- No new HTTP endpoints: `SettingsForm` posts through the existing generic settings create/update
  flow (`api.ts` layer, not explored in detail here since no new endpoint is implied).
- No new store method: existing `settingsStore` / `userSettingsStore` / `projectSettingsStore`
  already index/list/save credentials by `credential_type` generically.

### Patterns and Conventions

- Every credential type follows the same `key → CredentialTypeConfig` shape; auth-method switching
  within one credential type is done with a local `isX(values)` predicate function referenced by each
  field's `shouldShow`, exactly as `email`'s `isBasicEmailAuth`/`isOAuthAzureAuth` and `git`'s
  `isPatGitAuth`/`isGithubAppAuth` demonstrate.
- Per-field Yup `validation` is attached directly on the field (e.g. `sql`'s dialect-conditional
  fields use `Yup.string().when('dialect', {...})`), which is the established way to express
  "required only when this path is selected" — the same shape the task's auth-type-conditional
  requiredness needs.
- Sensitive fields are marked with `sensitive: true` on the field config (no separate list); this is
  already the mechanism the task description assumes exists.
- Credential keys with no natural single-word lowercase name use bracket-computed keys sourced from
  an exported constant (`[MS_TEAMS_CREDENTIAL_TYPE]`, `[GOOGLE_OAUTH_CREDENTIAL_TYPE]`) rather than a
  literal string — worth following for consistency, though a literal `msExchange` key (as the task
  suggests) also matches simpler entries like `jira`, `git`, `sql`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/form-patterns.md` — React Hook Form + Yup via `@hookform/resolvers/yup`;
  schema-per-field is the convention this repo already uses inside `settingsUIConfig.ts` rather than
  a single external schema file, since each credential type's fields carry their own `validation`.
- `.ai-run/guides/testing/testing-patterns.md` — Vitest with two projects (`unit`, `integration`);
  unit tests co-located in `__tests__/`, AAA style. `settingsUIConfig.test.ts` (existing, found at
  `src/utils/__tests__/settingsUIConfig.test.ts`) is a `unit`-project test exercising
  `CREDENTIAL_UI_MAPPING` field validations and `shouldShow` predicates directly against the exported
  object — the exact pattern the task's acceptance-test list expects to extend.

### Architectural Decisions

- No ADR specific to credential UI config found; the file's own inline comments document prior
  decisions relevant here (e.g. EPMCDME-14586/14587 comments explain why some OAuth variants fold to
  a base `serverEnum` rather than getting their own — not applicable to MS Exchange, which has its
  own distinct backend enum `MSExchange`).

### Derived Conventions

- Confirmed from code, not docs: `getOriginalCredentialType` requires an explicit `serverEnum` on the
  new entry, or it would fall back to `capitalize(key)` — for a camelCase key like `msExchange` this
  would produce `Msexchange`, not `MSExchange`. `serverEnum: 'MSExchange'` must be set explicitly.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/settingsUIConfig.test.ts` — currently only covers the `sql` entry's
  validations and `shouldShow` predicates; asserts directly against
  `CREDENTIAL_UI_MAPPING.<key>.fields.<field>.validation`/`.shouldShow`. This is the file the task
  names to extend, and its existing `sql` block is a template for testing conditional
  required-when-path-selected validation (`Yup...when('dialect', {...})`) and `shouldShow` matrices —
  directly analogous to auth_type-conditional oauth_azure/ntlm fields.
- `src/pages/integrations/components/SettingsForm/__tests__/` holds `SettingsForm.autoFill.test.tsx`
  and `SettingsForm.sharePointAuth.test.tsx` — form-level tests for specific credential-type
  behaviours (auto-fill alias, SharePoint auth-method switch UI). No MS Exchange-specific form test
  exists yet; not required by the acceptance criteria, which target `settingsUIConfig.test.ts`.
- `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` and
  `CredentialFields.cronInput.test.tsx` — cover the generic field-rendering component; no changes to
  that component are indicated, so no new tests there are implied by the task.

### Testing Framework and Patterns

Vitest 1.6.1 + React Testing Library; unit-project setup mocks `@/utils/api` and `useSnapshot`
globally. Config-level tests (like `settingsUIConfig.test.ts`) exercise plain objects/functions and
need no rendering or mocks — `CREDENTIAL_UI_MAPPING.msExchange.fields.<field>.shouldShow?.(values)` /
`.validation.validate(...)` is directly callable, consistent with the existing `sql` tests.

### Coverage Gaps

- No existing test asserts `serverEnum`/`displayName` pairs for any credential type by name (i.e. no
  "every entry has X" generic test) — the task's requirement to assert `serverEnum: 'MSExchange'` and
  `displayName: 'Microsoft Exchange'` will be new assertions in a new `describe('msExchange', ...)`
  block, not an extension of an existing generic assertion.
- No test currently exercises "field has no defaultValue" as a first-class check (existing
  entries mostly test presence of a default, e.g. `git.auth_type` defaults to `'pat'`); a new
  assertion of absence is a slightly different shape from established coverage.

---

## 5. Configuration and Environment

### Environment Variables

None found specific to MS Exchange in the frontend. `email`'s `EMAIL_URL` and similar `dynDefault`
values read from `appInfoStore.toolFieldDefaults`, itself populated from a backend `/v1/config`-style
endpoint — no equivalent field is implied for MS Exchange since the task specifies no `url`/default
and no test-connection.

### Configuration Files

- `src/utils/settingsUIConfig.ts` is itself the configuration file for this feature; no other
  config file (build-time or runtime) surfaced as relevant.

### Feature Flags and Deployment Concerns

- MS Teams's entry uses `featureFlag`/`personalFeatureFlag: FEATURE_FLAGS.TEAMS_BOT_INTEGRATION` to
  gate visibility; the task does not ask for a feature flag on MS Exchange, and none was found
  pre-declared in `src/constants/featureFlags.ts` for this integration. Absence of a flag means the
  entry is visible to all users satisfying `accessType`/`roleRestrictionType` once merged — worth
  the spec confirming this is intended (no flag mentioned in acceptance criteria).

---

## 6. Risk Indicators

- Speculative: the task suggests key `msExchange`; `getOriginalCredentialType` requires this entry's
  `serverEnum` to be the literal string `'MSExchange'` regardless of the object key chosen, or the
  wrong credential type will be sent to the backend on save.
- No existing UI test asserts "no defaultValue" as a pattern — the new test for `auth_type` having no
  default is a shape not yet established in `settingsUIConfig.test.ts`; low risk, but the assertion
  form should be written for clarity (checking `.defaultValue` is `undefined`).
- Two secrets (`oauth_client_secret`, `service_account_password`) must each be marked
  `sensitive: true`; the existing pattern is per-field and manual, so a missed flag on either field
  is a silent masking gap only caught by the dedicated test the task calls for.
- No test-connection requirement (`testable: false`) is a one-line omission risk: several
  neighboring entries (`email`, `jira`) default to `testable: true`, so leaving `testable` unset on
  the new entry would silently violate acceptance criterion 6.
- No feature-flag/role-restriction precedent was specified by the task; if the spec later decides
  MS Exchange should be `ADMIN_ONLY` or flag-gated like MS Teams, that is a design decision not
  present in current research and not assumed here.
- `SettingsForm.tsx` and `CredentialFields.tsx` were read only at the level needed to confirm they
  consume `CREDENTIAL_UI_MAPPING` generically; no line-by-line audit was done of every rendering edge
  case (e.g. `rowGroup`, `position: top`) — if the UI handoff doc referenced elsewhere specifies a
  particular field layout (grouping mailbox with auth-path fields), that layout is a form/plan
  decision, not confirmed here.

---

## 7. Summary for Complexity Assessment

This is a single-file, declarative-config change: the entire UI surface for MS Exchange is expressed
by adding one new entry to `CREDENTIAL_UI_MAPPING` in `src/utils/settingsUIConfig.ts`, following the
`email` entry's auth-type-select-plus-shouldShow-gated-fields shape and the MS Teams entry's
no-URL/no-test-button shape. No new components, store methods, or API endpoints were found to be
needed — `SettingsForm.tsx` and `CredentialFields.tsx` already render any credential type generically
from this mapping, and the settings store/API layer is credential-type-agnostic. The backend contract
was independently confirmed by reading `src/codemie_tools/ms_exchange/models.py` and
`src/codemie_tools/base/models.py` in the sibling `codemie` repository, and matches the task
description exactly (enum value `MSExchange`, `ToolSet.MS_EXCHANGE = "Microsoft Exchange"`, the two
auth paths and their required/sensitive fields).

Technical novelty is low — this is the same conditional-fields pattern already used by `email`,
`git`, `sql`, and `xwiki`, and the same per-field Yup `validation`/`shouldShow` mechanism the codebase
already relies on for "required only on this path" semantics (see `sql`'s dialect-conditional
fields). Test coverage posture is favorable: `settingsUIConfig.test.ts` already exercises this exact
kind of conditional-validation assertion for `sql`, giving a direct template to extend for
`msExchange`.

Key risk factors are precision risks rather than architectural ones: getting `serverEnum` exactly
right (`'MSExchange'`, since it does not derive automatically from the object key), remembering
`testable: false` explicitly (several neighbors default true), and marking both secret fields
`sensitive: true`. No missing test coverage gap of consequence was found beyond the new assertions
the task itself already enumerates.

---

## 8. External References

- `src/codemie_tools/ms_exchange/models.py` (task-named; resolved at
  `/Users/Oleksandr_Cherevach/work/codemie-dev/codemie/src/codemie_tools/ms_exchange/models.py` in
  the sibling `codemie` repository) — read in full. Confirms: `ExchangeAuthType` enum values
  `oauth_azure`/`ntlm`; `ExchangeToolConfig.credential_type` fixed to `CredentialTypes.MS_EXCHANGE`;
  `auth_type: ExchangeAuthType | None = Field(default=None, ...)` — no default, matching the task's
  "no default — backend rejects missing/null"; `mailbox: str = RequiredField(...)`; OAuth path fields
  `oauth_tenant_id`, `oauth_client_id`, `oauth_client_secret` (secret has
  `json_schema_extra={"sensitive": True}`); NTLM path fields `ews_url`, `service_account_username`,
  `service_account_password` (secret has the same `sensitive` marker); a `model_validator(mode="after")`
  (`_validate_selected_path`) that raises if `auth_type` is `None`, if `mailbox` is blank/whitespace
  after `.strip()`, or if any field named in `_PATH_FIELDS[self.auth_type]` is blank/whitespace after
  `.strip()` — exactly the requiredness the task asks the client-side Yup schema to mirror.
- `src/codemie_tools/base/models.py` (followed from the above; resolved at
  `/Users/Oleksandr_Cherevach/work/codemie-dev/codemie/src/codemie_tools/base/models.py`) — confirms
  `CredentialTypes.MS_EXCHANGE = "MSExchange"` and `ToolSet.MS_EXCHANGE = "Microsoft Exchange"`,
  independently verifying both label claims in the task's backend contract section.
