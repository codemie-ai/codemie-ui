# Spec: EPMCDME-10928 — Configurable Integration Field Defaults (UI)

## Problem

Integration form field defaults in `settingsUIConfig.ts` were hardcoded. URL fields showed the same
example URLs regardless of the company's actual infrastructure. Boolean toggles (`is_cloud`,
`use_bearer`) and select fields (`auth_type`) had static defaults that did not reflect the
deployment's environment. The backend now serves deployment-configured values via
`GET /v1/tools/configs`. The UI must read them at startup and use them to pre-fill form fields and
set URL placeholder text.

Additionally, the create-integration form never pre-filled URL fields even when a `defaultUrl` was
configured, because `defaultUrl` was only consumed by the integration list display
(`getSettingCredsURL`). A separate `defaultValue` mechanism was needed to populate form inputs.

---

## Solution Overview

1. Fetch `GET /v1/tools/configs` once at app startup (fire-and-forget, after user authentication).
   Parse the response into two flat stores: `toolFieldDefaults` (string and boolean field defaults,
   keyed as `${credType}.${fieldName}`) and `toolFieldPlaceholders` (placeholder text overrides,
   same key pattern). When the store has no value the fields return `''` or `false` — no hardcoded
   example fallbacks.
2. Replace the hardcoded defaults in `settingsUIConfig.ts` with three factory functions:
   `dynDefault(credType, field)` → `() => string`, `dynDefaultBool(credType, field)` → `() =>
   boolean`, and `dynPlaceholder(credType, field)` → `() => string`. Wire these to `defaultValue`
   and `placeholder` on form fields and to `defaultUrl` on credential type configs.
3. Extend coverage beyond URL fields to include: `auth_type` (git, email, azuredevops), `cloud`
   stored as `is_cloud` in the UI (jira, confluence), and `use_bearer` (xwiki). Placeholder text
   overrides are wired for all 15 URL fields.
4. Rename keycloak and xray URL form fields from `url` to `base_url` to match the canonical backend
   field name. `getSettingCredsURL` is updated to find both `url` and `base_url` stored keys so
   existing credentials and new ones both work.

---

## File-by-file Design

### `src/types/settingsUI.ts`

Widen `CredentialFieldConfig.defaultValue` thunk to allow boolean returns (needed for
`dynDefaultBool`):

```typescript
// Before
defaultValue?: string | boolean | (() => string)

// After
defaultValue?: string | boolean | (() => string | boolean)
```

---

### `src/store/appInfo.ts`

**New constant** — maps backend config class names to UI credential type and which fields to
extract. Single `fields[]` array handles both URL fields and non-URL fields uniformly:

```typescript
const TOOL_CONFIG_FIELD_MAP: Record<string, { credentialType: string; fields: string[] }> = {
  jiraconfig:           { credentialType: 'jira',         fields: ['url', 'cloud']       },
  confluenceconfig:     { credentialType: 'confluence',   fields: ['url', 'cloud']       },
  genericgitconfig:         { credentialType: 'git',         fields: ['url', 'auth_type']  },
  genericazuredevopsconfig: { credentialType: 'azuredevops', fields: ['url', 'auth_type']  },
  emailtoolconfig:      { credentialType: 'email',        fields: ['url', 'auth_type']   },
  xwikiconfig:          { credentialType: 'xwiki',        fields: ['url', 'use_bearer']  },
  keycloakconfig:       { credentialType: 'keycloak',     fields: ['base_url']           },
  xrayconfig:           { credentialType: 'xray',         fields: ['base_url']           },
  elasticconfig:        { credentialType: 'elastic',      fields: ['url']                },
  sonarconfig:          { credentialType: 'sonar',        fields: ['url']                },
  zephyrconfig:         { credentialType: 'zephyrscale',  fields: ['url']                },
  servicenowconfig:     { credentialType: 'servicenow',   fields: ['url']                },
  reportportalconfig:   { credentialType: 'reportportal', fields: ['url']                },
  kubernetesconfig:     { credentialType: 'kubernetes',   fields: ['url']                },
  sharepointconfig:     { credentialType: 'sharepoint',   fields: ['url']                },
}
```

**New store members** added to `AppInfoStoreType` and `appInfoStore`:

```typescript
toolFieldDefaults:     Record<string, string | boolean>  // keyed as ${credType}.${fieldName}
toolFieldPlaceholders: Record<string, string>            // same key pattern, for placeholder text
fetchToolConfigs:      () => Promise<void>
```

**`extractConfigEntry` helper** — extracted to module level to keep `fetchToolConfigs` within the
SonarJS cognitive complexity limit of 15:

```typescript
function extractConfigEntry(
  entry: Record<string, Record<string, unknown>>,
  defaults: Record<string, string | boolean>,
  placeholders: Record<string, string>
): void {
  const entries = Object.entries(entry)
  if (!entries.length) return
  const [configKey, configVal] = entries[0]
  if (!configVal || typeof configVal !== 'object') return
  const mapping = TOOL_CONFIG_FIELD_MAP[configKey.toLowerCase()]
  if (!mapping) return
  for (const fieldName of mapping.fields) {
    const field = configVal[fieldName] as Record<string, unknown> | undefined
    if (!field) continue
    const defaultVal = field.default
    if (defaultVal !== undefined && defaultVal !== null && defaultVal !== '') {
      defaults[`${mapping.credentialType}.${fieldName}`] = defaultVal as string | boolean
    }
    const placeholderVal = field.placeholder
    if (typeof placeholderVal === 'string' && placeholderVal) {
      placeholders[`${mapping.credentialType}.${fieldName}`] = placeholderVal
    }
  }
}
```

Note: `false` is a valid boolean default and is stored (the `!== ''` guard preserves it). Empty
string and null defaults are skipped — fields fall back to `''`/`false` when unconfigured.

---

### `src/hooks/appLevel/useInitialDataFetch.tsx`

`fetchToolConfigs()` is called after `fetchCustomerConfig()` completes (user is authenticated at
that point). Fire-and-forget, consistent with other non-blocking startup fetches.

---

### `src/utils/settingsUIConfig.ts`

**Three factory functions** replace the earlier `dynUrl`:

```typescript
const dynDefault =
  (credType: string, field: string): (() => string) =>
  () => (appInfoStore.toolFieldDefaults[`${credType}.${field}`] as string) ?? ''

const dynDefaultBool =
  (credType: string, field: string): (() => boolean) =>
  () => (appInfoStore.toolFieldDefaults[`${credType}.${field}`] as boolean) ?? false

const dynPlaceholder =
  (credType: string, field: string): (() => string) =>
  () => appInfoStore.toolFieldPlaceholders[`${credType}.${field}`] ?? ''
```

No hardcoded example URLs. URL fields return `''` when unconfigured (showing the placeholder hint);
boolean fields return `false`.

**15 named URL constants** defined after the factories:

```typescript
const JIRA_URL         = dynDefault('jira',         'url')
const GIT_URL          = dynDefault('git',          'url')
const CONFLUENCE_URL   = dynDefault('confluence',   'url')
const KUBERNETES_URL   = dynDefault('kubernetes',   'url')
const KEYCLOAK_URL     = dynDefault('keycloak',     'base_url')
const AZUREDEVOPS_URL  = dynDefault('azuredevops',  'url')
const ELASTIC_URL      = dynDefault('elastic',      'url')
const EMAIL_URL        = dynDefault('email',        'url')
const SONAR_URL        = dynDefault('sonar',        'url')
const ZEPHYRSCALE_URL  = dynDefault('zephyrscale',  'url')
const XRAY_URL         = dynDefault('xray',         'base_url')
const SERVICENOW_URL   = dynDefault('servicenow',   'url')
const XWIKI_URL        = dynDefault('xwiki',        'url')
const SHAREPOINT_URL   = dynDefault('sharepoint',   'url')
const REPORTPORTAL_URL = dynDefault('reportportal', 'url')
```

**Updated `CREDENTIAL_UI_MAPPING` entries:**

| Credential | Field | Change |
|---|---|---|
| `keycloak` | `url` → **`base_url`** | Renamed to match backend canonical name; `defaultUrl` and `defaultValue` set to `KEYCLOAK_URL`; `placeholder` from `dynPlaceholder('keycloak', 'base_url')` |
| `xray` | `url` → **`base_url`** | Same rename; `defaultUrl` and `defaultValue` set to `XRAY_URL`; `placeholder` from `dynPlaceholder('xray', 'base_url')` |
| `jira` | `url` | `defaultValue: JIRA_URL`; `placeholder: dynPlaceholder('jira', 'url')` |
| `jira` | `is_cloud` | `defaultValue: dynDefaultBool('jira', 'cloud')` (UI key is `is_cloud`; store key is `jira.cloud`) |
| `confluence` | `url` | `defaultValue: CONFLUENCE_URL`; `placeholder: dynPlaceholder('confluence', 'url')` |
| `confluence` | `is_cloud` | `defaultValue: dynDefaultBool('confluence', 'cloud')` |
| `git` | `url` | `defaultValue: GIT_URL`; `placeholder: dynPlaceholder('git', 'url')` |
| `git` | `auth_type` | `defaultValue: dynDefault('git', 'auth_type')` |
| `azuredevops` | `url` | `defaultValue: AZUREDEVOPS_URL`; `placeholder: dynPlaceholder('azuredevops', 'url')` |
| `email` | `url` | `defaultValue: EMAIL_URL`; `placeholder: dynPlaceholder('email', 'url')` |
| `email` | `auth_type` | `defaultValue: dynDefault('email', 'auth_type')` |
| `xwiki` | `url` | `defaultValue: XWIKI_URL`; `placeholder: dynPlaceholder('xwiki', 'url')` |
| `xwiki` | `use_bearer` | `defaultValue: dynDefaultBool('xwiki', 'use_bearer')` |
| remaining 9 URL-only | `url` | `defaultValue: <CONSTANT>`; `placeholder: dynPlaceholder(credType, 'url')` each |
| `kubernetes` | `kubernetes_url` | `defaultValue: KUBERNETES_URL`; `placeholder: dynPlaceholder('kubernetes', 'url')` (UI field is `kubernetes_url`; store key is `kubernetes.url`) |

---

### `src/pages/integrations/components/SettingsForm/SettingsForm.tsx`

**Reactive backfill for late-loading defaults**: `useForm` evaluates `defaultValues` once at mount.
If `fetchToolConfigs` has not completed by then, the store is empty and dynamic defaults (including
`auth_type` selects) are not applied. A one-time `useEffect` watches `isToolDefaultsLoaded` and
calls `reset(getCredentialDefaults(credentialType))` when the store first becomes non-empty — only
on create forms (guarded by `!initialCredentialValues`). A `useRef` initialized to `true` when the
store is already populated at mount prevents double-firing on fast networks.

---

### `src/utils/settings.ts`

`getSettingCredsURL()` updated in two ways:

1. Finds both `url` and `base_url` stored keys — handles keycloak/xray credentials stored under
   either key (old records use `url`, new ones use `base_url`):
   ```typescript
   const urlObj = credentialValues.find((cv) => cv.key === 'url' || cv.key === 'base_url')
   ```
2. Guards against an empty thunk return:
   ```typescript
   return (urlObj?.value as string) || defaultUrl || ''
   ```

---

### `mock-server/db.json`

`tools_configs` fixture extended with `cloud`, `auth_type`, `use_bearer`, and `placeholder` fields
on the relevant config entries to exercise the new extraction in local dev.

---

## Data Flow

```
App startup (after auth)
  └── useInitialDataFetch
        └── appInfoStore.fetchToolConfigs()   [fire-and-forget]
              └── GET /v1/tools/configs
                    └── extractConfigEntry per entry
                          → toolFieldDefaults:     { 'jira.url': '...', 'jira.cloud': false, ... }
                          → toolFieldPlaceholders: { 'jira.url': '...', 'keycloak.base_url': '...' }

Settings list render
  └── getSettingCredsURL('keycloak', values)
        └── CREDENTIAL_UI_MAPPING.keycloak.defaultUrl()
              → KEYCLOAK_URL() → toolFieldDefaults['keycloak.base_url'] ?? ''

Settings form render (create / edit)
  └── getCredentialDefaults('jira')
        └── fields.url.defaultValue()     → JIRA_URL() → toolFieldDefaults['jira.url'] ?? ''
        └── fields.is_cloud.defaultValue() → dynDefaultBool()() → toolFieldDefaults['jira.cloud'] ?? false
        └── fields.url.placeholder()      → dynPlaceholder()() → toolFieldPlaceholders['jira.url'] ?? ''
```

---

## Fallback / Error Behaviour

| Scenario | Result |
|---|---|
| `fetchToolConfigs` throws (network, 5xx) | Both stores stay `{}` — all factory calls return `''` or `false` |
| Endpoint returns empty array | Same — both stores stay `{}` |
| Entry present but `default` is `""` or `null` | Skipped — field falls back to `''`/`false` |
| `default` is `false` | Stored as a valid configured value |
| Settings page renders before fetch completes | Both stores are `{}` at that moment — empty/unchecked shown |
| Edit form for credential saved without URL | Stored `url: ''` is filtered out in `SettingsForm.tsx` — form falls back to configured default |
| Old keycloak/xray credential with `url` key | `getSettingCredsURL` finds it via the `|| cv.key === 'base_url'` guard |

---

## Out of Scope

- `github` credential type — no `githubconfig` mapping in the UI.
- Re-rendering when stores change after initial load — fetch completes before users can navigate to
  the settings page.
