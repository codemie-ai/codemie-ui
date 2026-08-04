# Spec: User-friendly Webhook Integration Setup Screen

**Ticket**: EPMCDME-11747  
**Branch**: EPMCDME-11747_webhook-user-friendly-form  
**Complexity**: M (19/36)  
**Date**: 2026-07-27

---

## Overview

Four targeted improvements to the Webhook credential form on two pages:
- `/integrations/project/new` (Credential Type = Webhook)
- `/integrations/user/new` (Credential Type = Webhook)

Both pages render `SettingsForm` → `CredentialFields` with the same webhook credential config from `settingsUIConfig.ts`. Fixing the shared component tree and config covers both forms with no page-level changes required. No backend changes.

---

## Feature 1 — Read-only Webhook URL field with copy button

### What changes

- Remove the `showWebhookUrl` flag from the `webhook_id` field config in `settingsUIConfig.ts`, eliminating the inline hint text "Full URL: /api/v1/webhooks/\<id\>". Keep the `note` — it is a separate, generic helper description ("A webhook identifier is a unique ID…") that the ticket does not ask to remove; only the Full-URL hint (rendered by `showWebhookUrl`) is in scope.
- Add a new `webhookUrl` entry to the `CredentialComponentType` enum in `settingsUI.ts`.
- Insert a new field `{ name: 'webhook_url_display', type: CredentialComponentType.webhookUrl, label: 'Webhook URL' }` immediately after `webhook_id` in the webhook credential config in `settingsUIConfig.ts`.
- Add a rendering branch for `CredentialComponentType.webhookUrl` in `CredentialFields.tsx`:
  - Renders a read-only `Input` component (disabled/readOnly) whose value is `buildWebhookURL(formValues['webhook_id'])`.
  - Renders a copy-to-clipboard `Button` (from `src/components/Button/Button.tsx`) to the right of the input, calling `navigator.clipboard.writeText(...)` on click.
  - Uses the existing `buildWebhookURL` prop already passed to `CredentialFields` — no new prop required.

### Constraints

- `buildWebhookURL` in `SettingsForm.tsx` currently produces `${api.BASE_URL}/v1/webhooks/${id}`. The base URL is correct as-is (confirmed by user: no functional change needed). The read-only display simply calls `buildWebhookURL(formValues['webhook_id'] ?? '')`.
- The `webhook_url_display` field name is never submitted to the API — it is display-only. The `shouldShow` predicate for this field mirrors the `webhook_id` field (always visible when credential type is webhook).
- The copy button shows a success indicator (toast or icon flip) using the existing app toast pattern — if none exists in this area, use `navigator.clipboard.writeText` with no feedback as a fallback (simple is better than inconsistent).

---

## Feature 2 — Alias → Webhook ID auto-fill with manual override

### What changes

In `SettingsForm.tsx`:

- Watch the `alias` field value via `useWatch` (already used in this component).
- Declare a `useRef<boolean>(false)` flag named `webhookIdManuallyEdited`.
- In a `useEffect` keyed on the alias value: if `webhookIdManuallyEdited.current` is false, call `setFormValue('webhook_id', generateDefaultAlias(alias), { shouldDirty: false, shouldTouch: false })`. Use `generateDefaultAlias` from `src/utils/settings.ts` — this is the same slug function already used elsewhere in the app for alias generation.
- On any direct user input to `webhook_id`: set `webhookIdManuallyEdited.current = true` to disable further auto-sync. Wire this via the field's `onChange` handler using a `Controller` or `register` callback consistent with how other fields are managed in `SettingsForm`.
- When `credentialType` changes (triggering `reset()`), reset `webhookIdManuallyEdited.current = false` so that auto-fill re-activates for the new form state.

### Constraints

- Only trigger auto-fill for empty `alias` values if the current webhook_id is also empty — avoid overwriting a pre-populated webhook_id when the form is opened in edit mode.
- `setFormValue` must use `{ shouldDirty: false, shouldTouch: false }` to avoid triggering premature validation errors before the user has interacted.
- `generateDefaultAlias` is defined in `src/utils/settings.ts:199`. Use it directly — do not re-implement slug logic inline.

---

## Feature 3 — Collapsible accordion sections

### What changes

**Config layer (`settingsUIConfig.ts`)**:

Add two optional fields to the `sectionHeader` `CredentialFieldConfig` variant in `settingsUI.ts`:
```ts
collapsible?: boolean
accordionTitle?: string
```

Update the three section header entries in the webhook credential config:

| Old `name` / label | New `accordionTitle` | `collapsible` | Fields contained |
|---|---|---|---|
| `_verification_section` / "Request verification (legacy header)" | "Advanced Security Settings (optional)" | `true` | Secure Header Name, Secure Header Value to check |
| `_github_section` / "GitHub" | "GitHub Settings (optional)" | `true` | **Require SHA-256 Signature** (moved here from the verification section), GitHub Webhook Secret, GitHub Event Filter |
| `_gitlab_section` / "GitLab" | "GitLab Settings (optional)" | `true` | GitLab Webhook Secret Token, Filter merge request actions (toggle) |

**Important field re-grouping**: "Require SHA-256 Signature" currently sits under the verification section header (`_verification_section`). Per the ticket (AC 3.2), it must move into the GitHub accordion. In `settingsUIConfig.ts`, the `require_sha256_signature` field entry must be repositioned from after `_verification_section` to after `_github_section`.

**Renderer layer (`CredentialFields.tsx`)**:

Apply a pre-processing pass before rendering the flat field list. The pass scans for `sectionHeader` entries with `collapsible: true` and groups the subsequent non-sectionHeader fields (up to the next sectionHeader or end of array) into accordion sections. Each accordion section is rendered using `ConfigAccordion` from `src/pages/workflows/editor/configPanels/components/ConfigAccordion.tsx` with `defaultExpanded={false}` and `title={field.accordionTitle}`.

Non-collapsible `sectionHeader` entries (i.e., `collapsible` is absent or false) continue to render as the current `<hr>` + heading inline element — no change to any existing non-webhook credential form.

### Constraints

- `ConfigAccordion` is the established accordion wrapper in this codebase (used across workflow config panels). Use it directly — do not create a new accordion component.
- `defaultExpanded={false}` for all three sections — all collapsed by default as required.
- The pre-processing grouping logic lives inside `CredentialFields.tsx` as a pure function (takes `CredentialFieldConfig[]`, returns a grouped render structure). This keeps the rendering concern isolated from the config schema.
- The existing test in `CredentialFields.test.tsx` (`webhook form section grouping` describe block) asserts the old section header labels. These assertions must be updated to reflect the new accordion titles and the new collapsed-by-default behavior.
- GitLab accordion is fully specified by the ticket (AC 3.3): GitLab Webhook Secret Token + Filter merge request actions toggle. No PO confirmation needed.

---

## Feature 4 — Name-based Resource dropdown (replaces free-text Resource ID)

### What changes

**Config layer**:

- Add `resourceSelect` to `CredentialComponentType` enum in `settingsUI.ts`.
- In the webhook credential config in `settingsUIConfig.ts`:
  - Replace the `resource_id` free-text input entry with no field entry (the ID is stored implicitly).
  - Change `resource_type` to a standard `select` type (already is a select — no change needed).
  - Add a new `resource` field with `type: CredentialComponentType.resourceSelect` immediately after `resource_type`.
  - Add `rowGroup: 'resource_row'` to both `resource_type` and `resource` fields (see layout below).

**Layout flag**:

Add optional `rowGroup?: string` to `CredentialFieldConfig` in `settingsUI.ts`. `CredentialFields.tsx` pre-processing groups consecutive fields sharing the same `rowGroup` string into a `<div className="flex gap-4">` row wrapper. Fields with no `rowGroup` render normally. This is a general mechanism usable by any credential form.

**New hook — `useResourceOptions`**:

Location: `src/pages/integrations/components/SettingsForm/hooks/useResourceOptions.ts`

```ts
useResourceOptions(resourceType: string): { options: { label: string; value: string }[], loading: boolean }
```

- When `resourceType === 'assistant'`: reads from the assistants Valtio store via `getAssistantOptions()` / `fetchPinnedAssistants()`.
- When `resourceType === 'workflow'`: reads from the workflows store via `getWorkflowOptions()` / `fetchWorkflow()`.
- When `resourceType === 'datasource'`: reads from the dataSources store.
- When `resourceType` is empty/unknown: returns `{ options: [], loading: false }`.
- Triggers a store fetch on mount (or on `resourceType` change) only if the store's option list is empty.
- Returns `options` as `{ label: name, value: id }` pairs.

**Renderer branch for `resourceSelect`**:

In `CredentialFields.tsx`, the `resourceSelect` branch:
- Reads `formValues['resource_type']` to determine `resourceType`.
- Calls `useResourceOptions(resourceType)`.
- Renders a `Select` component (the existing `src/components/form/Select`) with `options` from the hook.
- Disabled when `resourceType` is empty.
- On selection change: calls `setValue('resource_id', selectedOption.value)` to persist the entity ID to the actual form field; the dropdown's displayed value is the selected option's label.
- The hidden `resource_id` field is still present in form state (for submission) but not rendered in the UI.

### Constraints

- `resource_id` must remain registered with React Hook Form so its value is included in the form submission payload. Keep the `resource_id` entry in `settingsUIConfig.ts` but add `shouldShow: () => false` so it is never rendered in the UI. The `resourceSelect` rendering branch calls `setValue('resource_id', selectedOption.value)` on selection, writing the entity ID into the invisible-but-registered field.
- The `resourceSelect` field's `shouldShow` predicate mirrors the `resource_type` field (always visible when credential type is webhook).
- `useResourceOptions` uses Valtio's `useSnapshot` to subscribe to store state reactively — follow the existing store access pattern in `SettingsForm.tsx` (lines around `appInfoStore`).

---

## Files Changed

| File | Nature of Change |
|---|---|
| `src/types/settingsUI.ts` | Add `webhookUrl`, `resourceSelect` to `CredentialComponentType`; add `collapsible`, `accordionTitle`, `rowGroup` optional fields to `CredentialFieldConfig` |
| `src/utils/settingsUIConfig.ts` | Remove `showWebhookUrl` from `webhook_id` (keep `note`); add `webhook_url_display` field; update three section headers to collapsible with new titles; replace `resource_id` input with hidden + `resource` resourceSelect; add `rowGroup` to `resource_type` and `resource` |
| `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` | Add `webhookUrl` and `resourceSelect` rendering branches; add pre-processing pass for collapsible accordion groups and `rowGroup` row layout; remove `showWebhookUrl` inline Full-URL hint rendering branch (the generic `note` rendering is retained) |
| `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` | Add alias→webhook_id auto-fill logic with `useRef` manual-override flag |
| `src/pages/integrations/components/SettingsForm/hooks/useResourceOptions.ts` | New hook — three-way conditional Valtio store fetch |
| `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` | Update `webhook form section grouping` assertions to match new accordion titles and collapsed state |

---

## Testing

### Unit tests (new)

- `SettingsForm.tsx` — alias auto-fill: alias change populates webhook_id as slug; direct edit of webhook_id stops auto-fill.
- `SettingsForm.tsx` — alias auto-fill does not overwrite pre-populated webhook_id in edit mode.
- `useResourceOptions` hook — returns correct options per resourceType; returns empty when resourceType is empty.
- `CredentialFields.tsx` — `webhookUrl` field renders with correct URL and copy button.
- `CredentialFields.tsx` — `resourceSelect` field is disabled when resource_type is empty; enabled with options when resource_type is set.

### Existing tests (update)

- `CredentialFields.test.tsx` — `webhook form section grouping` describe block: update assertions from old section header labels to new accordion titles (`'Advanced Security Settings (optional)'`, `'GitHub Settings (optional)'`, `'GitLab Settings (optional)'`). Assert accordion is collapsed by default.

---

## Open Questions

- **Copy button feedback**: Use whatever clipboard-success pattern already exists in the codebase. If none, skip visual feedback for now.
