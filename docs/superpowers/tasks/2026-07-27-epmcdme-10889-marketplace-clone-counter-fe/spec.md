# EPMCDME-10889 (frontend): Marketplace clone counter

## Context

Backend has already shipped, on a separate branch, a fixed contract:
- `AssistantListResponse` / `Assistant` gain a response field `clone_count: Optional[int]`.
- `POST /v1/assistants` accepts an optional request field `source_assistant_id: Optional[str]` (unvalidated; silently no-ops if the source doesn't exist).

This spec covers only the frontend half: display `clone_count` on the Marketplace assistant card, and send `source_assistant_id` when a user clones an assistant. No backend, ranking, or infra changes are in scope.

## Scope

1. **Types** (`src/types/entity/assistant.ts`):
   - Add `clone_count?: number` to `Assistant` and `AssistantListResponse`, alongside the existing `is_pinned`/`is_favorited` optional fields.
   - Add `source_assistant_id?: string` to `CreateAssistantDto`.

2. **Outbound payload** (`src/store/utils/assistants.ts`):
   - Add an optional second parameter to `transformAssistantToCreateDTO(assistant, sourceAssistantId?)`. When provided, set `source_assistant_id` on the returned DTO. This keeps payload shaping in the existing DTO-transform seam rather than splitting it across files.

3. **Clone submit** (`src/pages/assistants/NewAssistantPage.tsx`):
   - In `handleSubmit`, pass `isCloning ? id : undefined` (the route param, not form state — `AssistantFormSchema` has no source-id concept) through to `transformAssistantToCreateDTO` via the call chain into `assistantsStore.createAssistant`.

4. **Store passthrough** (`src/store/assistants.ts`):
   - `indexAssistants`/`normalizeAssistant` already spread `...assistant`, so `clone_count` should flow through once typed. Confirm during implementation that no explicit mapping narrows the type; add explicit passthrough only if needed.

5. **UI** (`src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx`):
   - In `renderActions()`, add a third stat button inside the existing `isGlobal &&` gate, following the identical structure used for like/dislike: `Button type="tertiary"` + icon + `<span className="text-sm-1" aria-hidden="true">{clone_count ?? 0}</span>`, separated by the existing `h-[12px] w-px bg-border-structural` divider.
   - Reuse the existing `src/assets/icons/copy.svg` icon (imported via the `?react` Vite suffix, matching `ThumbUpSvg`/`ThumbDownSvg` conventions) — no new icon asset.

## Testing

- `AssistantCard.test.tsx`: the mock assistant currently has `is_global: false`, so the entire gated stat-button block (including where clone-count will render) is never exercised. Flip the mock to `is_global: true` to exercise the block, then assert the clone-count span renders, including the `?? 0` default when `clone_count` is absent.
- `NewAssistantPage.integration.test.tsx`: add one assertion to the existing clone-mode test (routes to `/assistants/assistant-1/clone`, mocks `POST v1/assistants`) checking that the request body includes `source_assistant_id` matching the source assistant's id.

## Out of scope

- Backend changes (already shipped).
- Marketplace ranking/sort logic (already handled on the backend branch).
- Removing the `?? 0` defensive fallback (explicit follow-up, deferred until backend confirms `clone_count` is always populated).
- `mock-server/db.json` fixture update for local dev visual parity (nice-to-have, not required by acceptance criteria).

## Risks (accepted, no mitigation needed)

- No security-sensitive surface: no auth or validation change on the FE side.
- No feature flag: ships unconditionally, consistent with other marketplace-card fields.
- No performance concern: purely additive fields, no new joins/computation.
