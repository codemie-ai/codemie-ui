# Spec: EPMCDME-10926 — AzureDevOps Credential Field Order and Validation (Frontend)

## Goal

Align the AzureDevOps credential form with the backend model changes: reorder fields to match
the logical setup flow and enforce mandatory fields at the form validation layer.

## Scope

Frontend only. Single source file (`settingsUIConfig.ts`) plus new unit tests.
No component, route, store, or API changes.

## Changes

### `src/utils/settingsUIConfig.ts` — `azuredevops` credential entry

**Field order** (JavaScript object key order drives render order):

| Position | Field key | Label/Placeholder |
|---|---|---|
| 1 | `url` | URL (existing, with dynamic placeholder and default) |
| 2 | `organization` | Organization Name |
| 3 | `project` | Project Name |
| 4 | `token` | Personal Access Token (PAT) |

Current order is `url → project → organization → token`; new order is `url → organization → project → token`.

**Yup validation** — added to three mandatory fields following the `jira` pattern:

```ts
url:          Yup.string().required('URL is required').url('Value must be a valid URL')
organization: Yup.string().required('Organization is required')
token:        Yup.string().required('Personal Access Token is required')
```

`project` receives no `validation` property — it remains optional.

## What is NOT changed

- `src/store/appInfo.ts` — `TOOL_CONFIG_FIELD_MAP` is not touched (out of scope)
- `SettingsForm.tsx` or any other component — the form already builds Yup schema generically
- Any existing field labels, placeholders, `sensitive`, or `defaultValue` properties

## Acceptance Criteria

1. The credential form renders AzureDevOps fields in order: URL → Organization Name → Project Name → PAT.
2. Submitting the form with a blank URL, Organization, or PAT shows a validation error for that field.
3. Submitting the form with a blank Project Name does not produce a validation error.
4. A unit test asserts `Object.keys(CREDENTIAL_UI_MAPPING.azuredevops.fields)` equals `['url', 'organization', 'project', 'token']`.
5. Unit tests assert `url`, `organization`, and `token` validation schemas reject empty string and accept a non-empty value.
6. Unit test asserts `project` field has no `validation` property.
7. All existing unit and integration tests pass.
