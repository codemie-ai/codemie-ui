# Design: Teams Bot Integration Settings Page (EPMCDME-13354)

**Date**: 2026-07-08
**Ticket**: EPMCDME-13354
**Branch**: `EPMCDME-13354_teams-bot-integration`
**Status**: Approved

---

## Overview

Add a "Teams Bot Integration" management page under Settings → Administration. Project admins use it to configure which assistants act as a Teams bot for each project.

Feature is gated behind the `features:teamsBotIntegration` config flag.

---

## Architecture

### Routing

| Route | Component | Purpose |
|---|---|---|
| `/settings/administration/teams` | `TeamsBotPage` | Page 1 — project list |
| `/settings/administration/teams/:projectName` | `TeamsBotProjectPage` | Page 2 — assistant list for a project |

Both routes are registered in `src/router.tsx` inside the settings route group.

### Navigation

A new tab "Teams bot integration" is added to the Administration section in `src/pages/settings/tabs.tsx`. It is:
- Visible when `features:teamsBotIntegration` is enabled
- Visible to anyone with any project-admin role (access enforcement is on the backend)

New enum value in `src/constants/index.ts`:
```typescript
TEAMS_BOT_INTEGRATION = 'teams_bot_integration'
```

### Feature Flag

Config key: `"features:teamsBotIntegration"`

Added to:
- `src/utils/featureFlags.ts`: `isTeamsEnabled()` utility
- `src/hooks/useFeatureFlags.ts`: `useTeamsEnabled()` hook

---

## Store: `src/store/assistantsProjectMapping.ts`

```typescript
type AssistantProjectFeature = "teams"; // enum, will grow — handle unknown values gracefully

interface AssistantsProjectMappingStore {
  assistants: Assistant[]
  pagination: Pagination          // { page, perPage, totalPages, totalCount }
  loading: boolean
  error: string | null

  fetchMappings(project: string, page?: number, perPage?: number): Promise<void>
  // GET /v1/assistants/projects/mapping?feature=teams&project=<name>&page=&per_page=

  addMapping(assistantId: string, projectName: string): Promise<void>
  // POST /v1/assistants/{assistantId}/projects/mapping
  // body: { project_name: projectName, feature: "teams" }
  // Idempotent — 200 if already enabled

  removeMapping(assistantId: string, projectName: string): Promise<void>
  // DELETE /v1/assistants/{assistantId}/projects/mapping?project=<name>&feature=teams
  // 404 treated as no-op
}
```

State is reset (page back to 0, assistants cleared) when `projectName` changes.

---

## New Types: `src/types/entity/assistantProjectMapping.ts`

```typescript
export type AssistantProjectFeature = "teams";

export interface AssistantProjectMappingRequest {
  project_name: string
  feature: AssistantProjectFeature
}

export interface AssistantProjectMappingResponse {
  message: string
}
```

---

## Page 1: `TeamsBotPage.tsx`

**Route**: `/settings/administration/teams`

- `SettingsLayout` with title "Teams bot integration"
- Feature flag guard: if `features:teamsBotIntegration` disabled → redirect to `/settings/administration`
- Search input (debounced, 300ms) bound to `projectsStore.indexProjects(page, perPage, search)`
- `Table` columns: **Name** | **Actions** (Configure button per row)
- Clicking "Configure" navigates to `/settings/administration/teams/:projectName`
- Pagination: standard table pagination, uses `projectsStore.pagination`
- Empty state when no projects

---

## Page 2: `TeamsBotProjectPage.tsx`

**Route**: `/settings/administration/teams/:projectName`

- `SettingsLayout` with title `"Teams bot — {projectName}"`
- Back link to `/settings/administration/teams`
- "Add assistant" button (top-right) — opens `AddAssistantModal`
- `Table` columns: **Name** | **Actions** (Delete button per row)
- Delete row: calls `removeMapping(assistant.id, projectName)` → success toast "Assistant removed" → refresh list
- On mount: calls `fetchMappings(projectName, 0, defaultPerPage)`
- Pagination: bound to `assistantsProjectMappingStore.pagination`
- Empty state: "No assistants configured for Teams bot on this project" + "Add assistant" CTA
- 403 response: show error state "Access denied" rather than empty list

---

## Modal: `AddAssistantModal.tsx`

**File**: `src/pages/settings/administration/components/AddAssistantModal.tsx`

- Standard Dialog modal, title "Add assistant"
- Uses existing `AssistantSelector` from `src/pages/assistants/components/AssistantSelector.tsx`
  - Props: `singleValue={true}`, `project={projectName}`, scope limited to project
- Confirm + Cancel buttons
- Flow:
  1. User selects one assistant in the selector
  2. Clicks "Add" (confirm)
  3. Calls `addMapping(selected.id, projectName)`
  4. Success → toast "Assistant added" → modal closes → list refreshes
  5. Error → toast error → modal stays open (allows retry)

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Flag disabled on load | Redirect to `/settings/administration` |
| Page 1 — no projects | Table empty state |
| Page 2 — no assistants | Empty state with "Add assistant" CTA |
| `addMapping` 404 | Toast "Assistant not found" |
| `removeMapping` 404 | Treat as success (idempotent no-op) |
| Any 403 on `fetchMappings` | Show error state "Access denied" |
| `addMapping` — assistant already enabled | Backend 200 (idempotent), UI refreshes |
| Direct URL navigation to Page 2 | Mount triggers `fetchMappings` |

---

## Files Changed / Created

| File | Change |
|---|---|
| `src/constants/index.ts` | + `TEAMS_BOT_INTEGRATION` enum value |
| `src/utils/featureFlags.ts` | + `isTeamsEnabled()` |
| `src/hooks/useFeatureFlags.ts` | + `useTeamsEnabled()` |
| `src/types/entity/assistantProjectMapping.ts` | NEW |
| `src/store/assistantsProjectMapping.ts` | NEW |
| `src/pages/settings/tabs.tsx` | + Teams bot nav entry |
| `src/router.tsx` | + 2 new routes |
| `src/pages/settings/administration/TeamsBotPage.tsx` | NEW — Page 1 |
| `src/pages/settings/administration/TeamsBotProjectPage.tsx` | NEW — Page 2 |
| `src/pages/settings/administration/components/AddAssistantModal.tsx` | NEW |
