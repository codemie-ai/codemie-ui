# EPMCDME-15199: Microsoft Exchange Integration UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Microsoft Exchange credential type to the Integrations page as a single new
declarative entry in `CREDENTIAL_UI_MAPPING`.

**Architecture:** One new object keyed `msExchange` in `src/utils/settingsUIConfig.ts`, combining
the `email` entry's auth-type-select-plus-`shouldShow`-gated-fields shape with the MS Teams entry's
no-URL/no-test-button shape, plus two local `isX(values)` predicates. `SettingsForm.tsx` and
`CredentialFields.tsx` already render any `CredentialTypeConfig` generically — no other file changes.

**Tech Stack:** TypeScript, Yup validation, Vitest (unit project).

**Commit convention:** Commit per task using the repository's existing convention (ticket-prefixed
subject, per `.ai-run/guides/standards/git-workflow.md`).

## Global Constraints

- `serverEnum: 'MSExchange'` must be the literal string — `getOriginalCredentialType`
  (`src/utils/settings.ts`) falls back to `capitalize(key)` when absent, which would send
  `'Msexchange'`, breaking the save contract with the backend.
- `displayName: 'Microsoft Exchange'` exactly — this is the label shown in the type list.
- `testable: false` explicit — several sibling entries default `true`; omission would silently show
  a test-connection button.
- No `accessType`, `roleRestrictionType`, `featureFlag`, `personalFeatureFlag`, `defaultUrl`, or
  field `rowGroup`/`position` — none requested; defaults apply.
- `auth_type` has no `defaultValue` — the user must choose; matches backend's `Field(default=None)`.

---

### Task 1: Add the `msExchange` credential UI config entry with tests

**Files:**
- Modify: `src/utils/settingsUIConfig.ts` — add two local predicates near
  `isBasicEmailAuth`/`isOAuthAzureAuth` (`settingsUIConfig.ts:110-111`), and a new `msExchange` entry
  in `CREDENTIAL_UI_MAPPING` near the `email` entry (`settingsUIConfig.ts:464-523`).
- Modify: `src/utils/__tests__/settingsUIConfig.test.ts` — add a `describe('msExchange', ...)` block
  alongside the existing `describe('sql', ...)` block (`settingsUIConfig.test.ts:21-30` for the
  `.validation!` extraction pattern, `:58-64` for required-when-selected assertions, `:111-142` for
  `shouldShow` matrix assertions — same shapes, new field names).

**Interfaces:**
- Produces: `CREDENTIAL_UI_MAPPING.msExchange` — a `CredentialTypeConfig` (type in
  `src/types/settingsUI.ts`) with fields `auth_type`, `mailbox`, `oauth_tenant_id`, `oauth_client_id`,
  `oauth_client_secret`, `ews_url`, `service_account_username`, `service_account_password`.
- Produces: local predicates `isOAuthAzureExchangeAuth`, `isNtlmExchangeAuth`, each
  `(values) => boolean`, referenced only by this entry's `shouldShow`/`validation`.

Test-first: yes — the new `describe('msExchange', ...)` block fails against the current mapping,
which has no `msExchange` key yet.

- [ ] **Step 1: Write the failing test block**

  In `src/utils/__tests__/settingsUIConfig.test.ts`:

  ```ts
  describe('msExchange', () => {
    const entry = CREDENTIAL_UI_MAPPING.msExchange
    const oauthFields = ['oauth_tenant_id', 'oauth_client_id', 'oauth_client_secret'] as const
    const ntlmFields = ['ews_url', 'service_account_username', 'service_account_password'] as const

    it('has exact serverEnum/displayName, is not testable, auth_type has no default', () => {
      expect(entry.serverEnum).toBe('MSExchange')
      expect(entry.displayName).toBe('Microsoft Exchange')
      expect(entry.testable).toBe(false)
      expect(entry.fields.auth_type.defaultValue).toBeUndefined()
    })

    it('requires auth_type and non-blank mailbox', async () => {
      await expect(entry.fields.auth_type.validation!.validate(undefined)).rejects.toThrow()
      await expect(entry.fields.mailbox.validation!.validate('   ')).rejects.toThrow()
    })

    it.each([
      ['oauth_azure', oauthFields, ntlmFields],
      ['ntlm', ntlmFields, oauthFields],
    ])('shows and requires only the %s path fields', async (authType, shown, hidden) => {
      for (const f of shown) {
        expect(entry.fields[f].shouldShow?.({ auth_type: authType })).toBe(true)
        await expect(
          entry.fields[f].validation!.validate('', { context: { auth_type: authType } })
        ).rejects.toThrow()
      }
      for (const f of hidden) {
        expect(entry.fields[f].shouldShow?.({ auth_type: authType })).toBe(false)
      }
    })

    it('marks both secrets sensitive', () => {
      expect(entry.fields.oauth_client_secret.sensitive).toBe(true)
      expect(entry.fields.service_account_password.sensitive).toBe(true)
    })
  })
  ```

  Match the `.validate(value, { context })` call shape to whatever the existing `sql.database_name`
  test (`settingsUIConfig.test.ts:58-64`) actually uses for a `when()`-conditional field — adjust only
  the call shape above if it differs, not the assertions.

- [ ] **Step 2: Run the test file and confirm the new block fails**

  Run: `npx vitest run src/utils/__tests__/settingsUIConfig.test.ts`
  Expected: FAIL — `CREDENTIAL_UI_MAPPING.msExchange` is `undefined`.

- [ ] **Step 3: Add the two predicates and the `msExchange` entry**

  In `settingsUIConfig.ts`, next to `isBasicEmailAuth`/`isOAuthAzureAuth` (`:110-111`):

  ```ts
  const isOAuthAzureExchangeAuth = (values) => values.auth_type === 'oauth_azure'
  const isNtlmExchangeAuth = (values) => values.auth_type === 'ntlm'
  ```

  In `CREDENTIAL_UI_MAPPING`, add next to the `email` entry:

  ```ts
  msExchange: {
    displayName: 'Microsoft Exchange',
    serverEnum: 'MSExchange',
    testable: false,
    fields: {
      auth_type: {
        label: 'Authentication Type', type: CredentialComponentType.select,
        options: [
          { value: 'oauth_azure', label: 'OAuth via Microsoft Entra ID Application' },
          { value: 'ntlm', label: 'NTLM' },
        ],
        validation: Yup.string().required('Authentication Type is required'),
      },
      mailbox: {
        label: 'Mailbox', placeholder: 'user@example.com',
        validation: Yup.string().trim().required('Mailbox is required'),
      },
      oauth_tenant_id: {
        label: 'Microsoft Entra ID Tenant', placeholder: 'Required', shouldShow: isOAuthAzureExchangeAuth,
        validation: Yup.string().when('auth_type', { is: (v) => isOAuthAzureExchangeAuth({ auth_type: v }), then: (s) => s.trim().required('Tenant ID is required'), otherwise: (s) => s.nullable().optional() }),
      },
      oauth_client_id: {
        label: 'Microsoft Entra ID Application Client ID', placeholder: 'Required', shouldShow: isOAuthAzureExchangeAuth,
        validation: Yup.string().when('auth_type', { is: (v) => isOAuthAzureExchangeAuth({ auth_type: v }), then: (s) => s.trim().required('Client ID is required'), otherwise: (s) => s.nullable().optional() }),
      },
      oauth_client_secret: {
        label: 'Microsoft Entra ID Application Secret', placeholder: 'Required', sensitive: true, shouldShow: isOAuthAzureExchangeAuth,
        validation: Yup.string().when('auth_type', { is: (v) => isOAuthAzureExchangeAuth({ auth_type: v }), then: (s) => s.trim().required('Client secret is required'), otherwise: (s) => s.nullable().optional() }),
      },
      ews_url: {
        label: 'EWS URL', placeholder: 'https://outlook.office365.com/EWS/Exchange.asmx', shouldShow: isNtlmExchangeAuth,
        validation: Yup.string().when('auth_type', { is: (v) => isNtlmExchangeAuth({ auth_type: v }), then: (s) => s.trim().required('EWS URL is required'), otherwise: (s) => s.nullable().optional() }),
      },
      service_account_username: {
        label: 'Service Account Username', placeholder: 'Required', shouldShow: isNtlmExchangeAuth,
        validation: Yup.string().when('auth_type', { is: (v) => isNtlmExchangeAuth({ auth_type: v }), then: (s) => s.trim().required('Service account username is required'), otherwise: (s) => s.nullable().optional() }),
      },
      service_account_password: {
        label: 'Service Account Password', placeholder: 'Required', sensitive: true, shouldShow: isNtlmExchangeAuth,
        validation: Yup.string().when('auth_type', { is: (v) => isNtlmExchangeAuth({ auth_type: v }), then: (s) => s.trim().required('Service account password is required'), otherwise: (s) => s.nullable().optional() }),
      },
    },
  },
  ```

  Formatting will be normalized automatically by the repo's post-edit prettier/eslint hook — write it
  as above and let the hook reflow it.

- [ ] **Step 4: Run the test file and confirm it passes**

  Run: `npx vitest run src/utils/__tests__/settingsUIConfig.test.ts`
  Expected: PASS — all `msExchange` assertions green, `sql` block still green.

- [ ] **Step 5: Commit**

  Commit per the repository's existing convention (see header).

---

## Negative-constraint pass

- No test-connection code/button: `testable: false` set explicitly in Task 1 Step 3 —
  `negative-constraints: honored`.
- No mail-reading, polling, or assistant tool-picker changes: this plan touches only
  `settingsUIConfig.ts` and its test file; no protocol/tool code is added — `negative-constraints:
  honored`.
- No feature flag or role restriction: the entry omits `featureFlag`, `personalFeatureFlag`,
  `roleRestrictionType`, `accessType` entirely, unlike the MS Teams entry it borrows the
  no-URL/no-test-button shape from — `negative-constraints: honored`.
- No changes to `SettingsForm.tsx`, `CredentialFields.tsx`, the settings store, or any API layer:
  Task 1 modifies only `settingsUIConfig.ts` and `settingsUIConfig.test.ts` —
  `negative-constraints: honored`.
- No field grouping/layout (`rowGroup`, `position`): no field in the new entry sets either key —
  `negative-constraints: honored`.
