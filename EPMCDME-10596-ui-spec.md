# EPMCDME-10596 — UI Implementation Spec: Skill Tools Selection

**Jira**: [EPMCDME-10596](https://jiraeu.epam.com/browse/EPMCDME-10596)
**Backend branch**: `EPMCDME-10596`

---

## Overview

Skills now support an optional list of required tools (same concept as Assistants having toolkits). When a user adds a skill to an assistant, the skill's tools are automatically merged into the assistant's toolset at runtime — no UI change is needed for the assistant form itself.

The **only UI change** is on the **Skills create/edit form**: add an optional tools selector, reusing the exact same component already used in the Assistants form.

---

## What to Build

### Location
- **Skills Create Form** — add optional tools section
- **Skills Edit Form** — add optional tools section (pre-populated from existing skill data)

### Component Reuse
Reuse the **same tools selection component** that exists in the Assistants create/edit form. The component should behave identically, except it is **optional** for skills (the assistant form may already require tools, but skills must not).

If the user saves a skill without selecting any tools, `toolkits` is sent as an empty array `[]`.

---

## API Contract Changes

### `POST /v1/skills` — Create Skill

**Request body** — new optional field `toolkits`:

```json
{
  "name": "jira-skill",
  "description": "Helps with Jira operations",
  "content": "## Instructions\n...",
  "project": "my-project",
  "visibility": "private",
  "categories": ["project_management"],
  "toolkits": [
    {
      "toolkit": "jira",
      "tools": [
        {
          "name": "jira_search",
          "label": "Jira Search"
        }
      ],
      "label": "Jira",
      "settings_config": true,
      "settings": {
        "id": "<integration-settings-id>",
        "credential_type": "Jira"
      },
      "is_external": false
    }
  ]
}
```

> `toolkits` is **optional**. If omitted or set to `[]`, no tools are required.

---

### `PUT /v1/skills/{skill_id}` — Update Skill

**Request body** — new optional field `toolkits`:

```json
{
  "toolkits": [
    {
      "toolkit": "jira",
      "tools": [...],
      "label": "Jira",
      "settings_config": true,
      "settings": { "id": "...", "credential_type": "Jira" },
      "is_external": false
    }
  ]
}
```

> To **clear all tools** from a skill, send `"toolkits": []`.
> If `toolkits` key is **omitted entirely**, existing tools are preserved (partial update behavior).

---

### `GET /v1/skills/{skill_id}` — Get Skill Detail

**Response** — new field `toolkits` in `SkillDetailResponse`:

```json
{
  "id": "abc123",
  "name": "jira-skill",
  "description": "...",
  "content": "...",
  "project": "my-project",
  "visibility": "private",
  "categories": ["project_management"],
  "createdDate": "2026-02-19T10:00:00Z",
  "updatedDate": null,
  "assistants_count": 2,
  "user_abilities": ["read", "write", "delete"],
  "unique_likes_count": 0,
  "unique_dislikes_count": 0,
  "toolkits": [
    {
      "toolkit": "jira",
      "tools": [
        {
          "name": "jira_search",
          "label": "Jira Search"
        }
      ],
      "label": "Jira",
      "settings_config": true,
      "settings": {
        "id": "<integration-settings-id>",
        "credential_type": "Jira"
      },
      "is_external": false
    }
  ]
}
```

> `toolkits` defaults to `[]` if no tools were set.

---

## `ToolKitDetails` Object Shape

This is the **identical structure** used in `AssistantRequest.toolkits` and `AssistantDetailResponse.toolkits`. No changes to the shape — just reuse it.

| Field | Type | Description |
|-------|------|-------------|
| `toolkit` | `string` | Toolkit identifier (e.g. `"jira"`, `"confluence"`, `"platform_tools"`) |
| `tools` | `Tool[]` | List of selected tools within the toolkit |
| `label` | `string` | Display label for the toolkit |
| `settings_config` | `boolean` | Whether this toolkit requires settings/credentials |
| `settings` | `SettingsBase \| null` | Credential settings (integration ID + credential type) |
| `is_external` | `boolean \| null` | Whether this is an external toolkit |

**`Tool` object:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Tool identifier |
| `label` | `string \| null` | Display label |
| `settings_config` | `boolean` | Whether tool has its own settings |
| `settings` | `SettingsBase \| null` | Tool-level settings |
| `user_description` | `string \| null` | Optional description override |

---

## UI Component Behavior

### Tools Section in Skills Form

1. **Label**: `"Required Tools"` (or reuse the existing label from Assistants form)
2. **Optional indicator**: Make it visually clear that this field is optional (e.g., `"Optional"` badge next to the label, or helper text: _"Select tools this skill requires to work correctly. Leave empty if no tools are needed."_)
3. **Component**: Reuse the existing `ToolkitsSelector` (or however the Assistants form component is named) **without modification**
4. **Default state**: Empty (no tools selected) when creating a new skill
5. **Edit state**: Pre-populate with `toolkits` array from `GET /v1/skills/{skill_id}` response

### Empty State

If a skill has no tools (`toolkits: []`), show the empty state identical to how the Assistants form handles it (no tools selected yet).

### Validation

- No minimum requirement — `toolkits: []` is valid
- Maximum/format validation is handled by the backend; use the same validation rules as the Assistants form

---

## Where the Existing Component Is Used (Assistants Form)

Find the tools selector component in the **Assistants Create/Edit form** — it is the section labeled "Tools" or "Toolkits". Extract or reference that component and render it in the Skills form's create/edit view.

The component is driven by:
1. `GET /v1/tools` — to fetch the available tools list for selection
2. The selected `toolkits` array — pre-populated from the skill or empty for new skills

On save (create or update), include the `toolkits` array in the request body.

---

## Affected UI Screens / Components

| Screen | Change |
|--------|--------|
| Skills Create Form | Add optional tools selector section |
| Skills Edit Form | Add optional tools selector pre-populated from skill data |
| Skills Detail View (read-only) | Optionally show selected tools (same as Assistants detail) |
| Assistants Form | **No change needed** — skill tools are auto-merged at runtime |

---

## Notes

- **No changes** required on the assistant form or assistant detail page — the backend automatically merges skill tools into the assistant's toolset during execution.
- The `GET /v1/skills` (list) endpoint does **not** return `toolkits` (only `SkillListResponse` is used there, which does not include it). Only `GET /v1/skills/{skill_id}` returns the full detail including `toolkits`.
- When editing a skill, if `toolkits` is omitted from the PUT request body, existing tools are preserved (safe partial update). To explicitly clear tools, send `"toolkits": []`.
