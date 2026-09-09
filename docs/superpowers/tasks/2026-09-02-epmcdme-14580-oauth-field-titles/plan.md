# Plan — EPMCDME-14580: Human-readable OAuth integration field titles

## Requirements

OAuth integration config fields for GitLab, Jira, and Confluence render their **titles** as raw URL
placeholders (`https://gitlab.com`, `https://your-codemie-host`) because the field entries in
`CREDENTIAL_UI_MAPPING` omit an explicit `label`, and the renderer falls back to the placeholder
(`CredentialFields.tsx:247` → `label={getLabel(label ?? placeholder)}`).

Fix: give each OAuth field an explicit human-readable `label`. Data-only change — `label` already
exists on `CredentialFieldConfig` (`src/types/settingsUI.ts:50`) and is used across other credential
entries, so no type or renderer change is required.

### Confirmed naming (provider-accurate scheme)

| Provider | Field | Label |
|---|---|---|
| GitLab | `instance_url` | `GitLab Instance URL` |
| GitLab | `client_id` | `Application ID` |
| GitLab | `client_secret` | `Application Secret` |
| GitLab | `callback_base_url` | `CodeMie Callback Base URL` |
| Jira | `client_id` | `Client ID` |
| Jira | `client_secret` | `Client Secret` |
| Jira | `callback_base_url` | `CodeMie Callback Base URL` |
| Confluence | `client_id` | `Client ID` |
| Confluence | `client_secret` | `Client Secret` |
| Confluence | `callback_base_url` | `CodeMie Callback Base URL` |

Rationale: GitLab's OAuth application console labels its credentials "Application ID" / "Secret";
Atlassian's console labels them "Client ID" / "Client Secret". `callback_base_url` is the base URL of
*this CodeMie deployment* (per its help text), so the label names CodeMie explicitly. Placeholders and
help text are unchanged — the URLs remain only as placeholders/examples.

## Tasks

### Task 1 — Regression test: OAuth fields expose human-readable titles

Add a unit test that asserts each affected OAuth field in `CREDENTIAL_UI_MAPPING` has an explicit
human-readable `label` and that no field's `label` is a URL (i.e. the title no longer duplicates the
URL placeholder). Home: `src/utils/__tests__/settings.test.ts` (already imports `CREDENTIAL_UI_MAPPING`).

- Assert `CREDENTIAL_UI_MAPPING.gitlaboauth.fields.instance_url.label === 'GitLab Instance URL'`, etc.
  for all ten fields per the naming table.
- Assert no OAuth field `label` starts with `http` (guards the exact regression).

**Test-first: yes** — the test fails initially because the OAuth field entries have no `label`
(`label` is `undefined`), so both the exact-value and the "no URL title" assertions fail (RED).

### Task 2 — Add `label` to the OAuth field entries

In `src/utils/settingsUIConfig.ts`, add the confirmed `label` to each of the four fields in the
GitLab, Jira, and Confluence OAuth blocks. Do not change `placeholder`, `help`, `defaultValue`, or
`sensitive`. This makes Task 1's test pass (GREEN).

**Test-first: no** — implementation task; verified by Task 1's test going green plus `tsc --noEmit`.

## Out of scope

- Hardening `getLabel` against URL-shaped placeholders (renderer change) — noted as a follow-up risk
  in `technical-analysis.md`; not required to satisfy the acceptance criteria and left untouched to
  keep blast radius zero.
- The unrelated `vite.config.ts` working-tree change (dev proxy target) — left as-is.

## Reconciliation note

A prior reviewed diff (`docs/superpowers/tasks/2026-09-01-oauth-config-field-titles/code-review.diff`)
proposed the same mechanism with `callback_base_url` → `Callback Base URL`. This plan supersedes it with
the provider-accurate labels above (only `callback_base_url` wording differs: `CodeMie Callback Base
URL`). That prior diff was never applied to `settingsUIConfig.ts`.
