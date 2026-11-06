# Technical Research

**Task**: assistant sharing modal popup user-access
**Generated**: 2026-09-09T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-14786: Add a 'Share Assistant with Selected Users' feature to the frontend. The backend exposes four new endpoints: GET /v1/assistants/{id}/shared-with, POST /v1/assistants/{id}/share (body: {user_ids:[]}), DELETE /v1/assistants/{id}/share (body: {user_ids:[]}), GET /v1/assistants/{id}/sharable-users?q=<query>. The UI needs: (1) A Share button on the assistant card/detail view (owner-only). (2) A modal popup with: a chip-input for searching and adding users (search by name/email), a list of people currently with access (avatar + name + email), a Remove button per person, Cancel and Share action buttons. (3) API integration for all four endpoints. (4) Respect existing owner check — only owners see the Share button. The mock-up shows a 'Share for Collaboration' popup with chip-input (selected users shown as chips), a 'People With Access' section with avatar+name+email+Remove rows, and Cancel/Share buttons.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/assistants/AssistantActions/AssistantActions.tsx` — owner-gated action menu for assistant cards and detail views; renders actions as `ActionItem[]` inside `AssistantMenu`; uses `canEdit(assistant)` for owner-gated items
- `src/pages/assistants/AssistantActions/components/AssistantMenu.tsx` — `ActionItem` interface (`id`, `label`, `icon`, `isVisible`, `onClick`); renders via `NavigationMore`
- `src/utils/entity.ts` — `canEdit(entity)` and `canDelete(entity)` read `user_abilities` / `ABILITIES.WRITE` from the entity; this is the established owner-check pattern
- `src/types/entity/assistant.ts` — `Assistant` interface; has `user_abilities?: string[]` field which feeds `canEdit`/`canDelete`; existing `shared: boolean` field (per-assistant flag, unrelated to per-user sharing)
- `src/types/entity/user.ts` — `UserListItem` interface with `id`, `name`, `email`, `picture`, `username` fields — covers the shape needed for "people with access" rows
- `src/components/Popup/Popup.tsx` — mandatory modal wrapper (wraps PrimeReact Dialog); provides `visible`, `onHide`, `header`, `footerContent`, `className`, `bodyClassName` props
- `src/components/form/MultiSelect/MultiSelect.tsx` — chip-display multi-select with filter/search support; `display="chip"` renders selections as chips; `onFilter` callback for server-side search
- `src/components/form/MultiSelect/ChipWrapper.tsx` — chip rendering logic used by MultiSelect
- `src/components/Avatar/Avatar.tsx` — reusable avatar used throughout the assistant section; supports `iconUrl`, `name`, `type` (AvatarType enum)
- `src/pages/settings/administration/usersManagement/components/UserAvatar.tsx` — alternative user-specific avatar with `src`, `name`, `size` props; used in user management area
- `src/store/assistants.ts` — Valtio proxy store for all assistant API calls; pattern is `api.get/post/delete` + `await response.json()`; the correct place for the four new API methods
- `src/utils/api.ts` — single HTTP layer; supports `get`, `post`, `delete` with body; DELETE with body passes through `JSON.stringify(body)` in `makeRequest`
- `src/pages/assistants/components/ExportAssistantPopup/ExportAssistantPopup.tsx` — closest existing analog: assistant-specific popup that receives `assistant` prop, uses `Popup` wrapper, calls `assistantsStore` methods
- `src/pages/skills/components/AttachToAssistantsModal.tsx` — another direct analog: a `Popup`-based modal with a multi-select chip input (`AssistantSelector`) and custom footer buttons

### Architecture and Layers Affected

- **Store layer** (`src/store/assistants.ts`): four new store methods for the four new API endpoints
- **Page/feature layer** (`src/pages/assistants/`): new `ShareAssistantPopup` component under `src/pages/assistants/components/` (following `ExportAssistantPopup` placement), Share action item added to `AssistantActions`
- **Type layer** (`src/types/`): new interfaces for API response shapes (shared-with user list, shareable-users search result)

### Integration Points

- `AssistantActions` renders in three places: `AssistantDetailsActions`, `AssistantGrid`, `FavoritesPage` — all three surfaces will gain the Share button once the action item is added
- `AssistantCard` receives `isOwned` prop (passed by callers) and separately `AssistantActions` handles visibility via `canEdit`; the Share button gating should follow the same `canEdit(assistant)` check used for Edit/Publish
- `assistantsStore` is the established integration point for all assistant API calls
- `MultiSelect` with `onFilter` handles the debounced user search; the `AssistantSelector` shows exactly this pattern with server-side filtering

### Patterns and Conventions

- **Owner gate**: `canEdit(assistant)` from `src/utils/entity.ts` — reads `user_abilities` for `ABILITIES.WRITE`; used for Edit, Publish, Unpublish; Share should use the same check
- **Modal**: always `Popup` from `@/components/Popup`, never raw PrimeReact `Dialog`
- **Custom footer**: use `footerContent` prop on `Popup` when more than two buttons or loading state needed (see `AttachToAssistantsModal`)
- **API in stores only**: component never calls `api.*` directly; all calls go through `assistantsStore` methods
- **DELETE with body**: `api.delete(url, body)` passes body through `makeRequest`; no `.json()` call on response (per api-integration guide)
- **Chip input for multi-user select**: `MultiSelect` with `display="chip"` and `onFilter` for server-side search is the established pattern (used by `AssistantSelector`)
- **User avatar in lists**: `UserAvatar` (settings area) or `Avatar` component; both exist and work

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/modal-patterns.md` — critical: mandates `Popup` component, documents all props, custom-footer pattern (Pattern 2), and pre-delivery checklist
- `.ai-run/guides/development/api-integration.md` — documents store pattern, `api.*` methods, DELETE body semantics, error handling

### Architectural Decisions

- All API calls belong in Valtio store methods; components read snapshots and call store methods — explicitly stated in `api-integration.md`
- `Popup` wraps PrimeReact Dialog; direct Dialog import is explicitly forbidden per `modal-patterns.md`
- DELETE requests: do not call `.json()` unless a body is confirmed — relevant for the DELETE `/share` endpoint

### Derived Conventions

- Action items added to `AssistantActions` follow the `ActionItem[]` array pattern with `isVisible` gating; new Share item slots in alongside Edit/Publish
- Popup components for assistants live under `src/pages/assistants/components/<FeatureName>/`
- User search with debounce: existing code uses `onFilter` on MultiSelect; cleanup via `useEffect` return

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx` — tests action visibility for `canEdit`/`canDelete` scenarios; directly relevant since the new Share action follows the same gate
- `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx` — AssistantCard rendering tests
- No tests found for `ExportAssistantPopup`, `ShareChatPopup`, or `AttachToAssistantsModal` — the closest analog popups have zero test coverage

### Testing Framework and Patterns

- Vitest with React Testing Library; two projects (`unit`, `integration`) per `vitest.workspace.ts`
- Accessibility tests exist for `AssistantActions` — the pattern used is rendering with mock `assistant` objects that have `user_abilities` set or absent

### Coverage Gaps

- The new `ShareAssistantPopup` component will have no existing tests (none exist for comparable assistant popups)
- The four new `assistantsStore` methods will have no existing tests
- `AssistantActions` accessibility test may need updating when the Share action item is added (it asserts on the full action list)

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — API base URL; all new endpoints route through this (set in `.env`, consumed by `api.ts`)
- No feature-flag usage found for sharing-specific features in the codebase

### Configuration Files

- `src/utils/api.ts` — HTTP layer; no changes needed for the new endpoints; `api.delete(url, body)` already supports request body
- `mock-server/db.json` — currently modified (per git status); mock server used for local development; new sharing endpoints will need mock entries for local testing

### Feature Flags and Deployment Concerns

- No feature flags identified for this feature area
- The existing `shared: boolean` field on `Assistant` is a different concept (marketplace/project visibility), not per-user sharing — no collision

---

## 6. Risk Indicators

- **`AssistantActions` action list is tested for accessibility** (`AssistantActions.accessibility.test.tsx`): adding a new action item may break that test if it asserts on a specific action count or set — verify before merging.
- **DELETE with body**: `api.delete` passes a body via `makeRequest`; the backend DELETE `/share` expects `{user_ids: []}`. The existing `api.delete(url, body)` call path is code-verified, but this is an uncommon HTTP pattern — test with the mock server first.
- **User search debounce cleanup**: `MultiSelect` `onFilter` fires on every keystroke; if the search calls the API directly rather than being debounced, it will hammer the `/sharable-users` endpoint. The `modal-patterns.md` guide mandates debounce cleanup in `useEffect`.
- **No tests for comparable popups**: `ExportAssistantPopup`, `AttachToAssistantsModal`, `ShareChatPopup` all have zero tests; the new popup will follow suit unless explicitly requested.
- **`mock-server/db.json` already modified**: per git status this file has uncommitted changes; adding new mock routes will need coordination to avoid conflicts.
- **`UserListItem` vs. API response shape mismatch**: the four new endpoints return user shapes not yet defined in the codebase; response types need new interfaces. The task names no external file defining these shapes.

---

## 7. Summary for Complexity Assessment

The task touches three architectural layers — store, types, and feature page components — all within the well-established assistant area. The surface is well-understood: owner gating via `canEdit`, action menu via the `ActionItem[]` array in `AssistantActions`, modal via `Popup`, API via `assistantsStore`. Three direct analogs exist in the codebase (`ExportAssistantPopup`, `AttachToAssistantsModal`, `CreateUserPopup`) covering nearly every sub-pattern: chip multi-select with search, custom footer, store method integration. The file change estimate is approximately 5–7 files: new popup component, new types, four store methods, one action item in `AssistantActions`, and mock-server additions.

Technical novelty is low. The multi-select user search pattern is present in `AssistantSelector`, the chip display is in `MultiSelect`, the Popup pattern is thoroughly documented, and DELETE-with-body is already handled by `api.ts`. The only pattern that has no existing exact parallel is the "people with access" list with inline Remove buttons — but that is standard list-with-action UI requiring no new primitives. The debounce for the `/sharable-users` search query is the main implementation detail that must not be skipped.

Test coverage posture is weak for this area: comparable popups (`ExportAssistantPopup`, `AttachToAssistantsModal`, `ShareChatPopup`) have no tests. The one risk point is the existing `AssistantActions` accessibility test, which may need updating when the Share action item is added. Overall this is a contained, medium-confidence feature addition with a clear implementation path and no undocumented domain.

---

## 8. External References

None named by the task.
