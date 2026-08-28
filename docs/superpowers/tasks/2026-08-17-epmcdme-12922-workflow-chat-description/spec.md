# EPMCDME-12922 — Show workflow description in workflow chat intro

## Problem

`ChatPromptStarters.tsx` is the shared intro/welcome screen for both assistant chats and workflow chats. Its description-fetching `useEffect` unconditionally calls `assistantsStore.getAssistant(lastAssistant.id, true)`. For a workflow chat, `lastAssistant.id` is actually the workflow's id, so this call hits the wrong endpoint, fails, and the failure is silently swallowed (`.catch(() => setDescription(null))`). As a result, workflow chat never shows a description, even when the workflow has one configured — inconsistent with assistant chat.

## Goal

When a workflow chat starts and the workflow has a configured description, show it in the intro screen in the same place/style the assistant description already uses. No visible change to assistant chats. No broken layout when a workflow has no description.

## Design

Two small, in-pattern changes:

1. **`src/store/workflows.ts` — `getWorkflow`**: add an optional `skipErrorHandling?: boolean` param, threaded into the `api.get` call, mirroring `assistantsStore.getAssistant(id, skipErrorHandling)`. Today `getWorkflow` always shows an error toast on failure; the chat-intro fetch should degrade silently (same expectation as the assistant path), so the signature needs this parity. This is a backward-compatible optional param — every existing call site is unaffected.

2. **`src/pages/chat/components/ChatPrompt/ChatPromptStarters.tsx`** — in the description-fetch `useEffect`, branch on the already-established `currentChat?.isWorkflow` discriminator (same idiom as `ChatHeader.tsx`, `ChatConfigAssistants.tsx`):
   - `isWorkflow` true: check `workflowsStore.workflows` cache for a matching `id` first (mirrors the existing assistant cache-check), else call `workflowsStore.getWorkflow(lastAssistant.id, true)`, then `setDescription(workflow.description ?? null)`; catch → `setDescription(null)`.
   - `isWorkflow` false (or undefined): unchanged — existing `assistantsStore` logic.

No changes to the render/JSX section — it already renders `description` generically (`{lastAssistant && description ? ... }`) regardless of entity type, so once `description` state is populated correctly for workflow chats, the existing markup, Tailwind classes (`text-text-quaternary`, `line-clamp-3`), and tooltip wiring (`data-tooltip-id="react-tooltip"`) apply unchanged. This also naturally satisfies "no empty placeholder when no description configured" — the ternary already falls through to nothing/subtitle when `description` is falsy.

No type changes: `Workflow.description?: string` and `Assistant.description: string` already exist. No new endpoints: `GET v1/workflows/id/${id}` already returns `description`.

## Out of scope

- The `text-text-quaternary` vs. `text-text-tertiary` styling-guide mismatch on the existing assistant description (flagged by tech-analyst) — not touched, to keep "existing assistant chat behavior remains unchanged."
- Any backend/API change — none needed.

## Testing

New test file `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptStarters.test.tsx` (none exists today; the parent test fully stubs this component out). Cover:
- Assistant chat: description shown when present (existing behavior, now under test for the first time).
- Assistant chat: no description → no placeholder/broken layout (existing behavior).
- Workflow chat: description shown when the workflow has one configured.
- Workflow chat: no description configured → no placeholder/broken layout.
- Workflow chat: fetch failure → degrades to no description, no error thrown.

Follows repo conventions: Vitest + RTL, `vi.mock('valtio', ...)` + `vi.hoisted` store-mocking pattern from `ChatPrompt.test.tsx`, AAA structure, "shows X when present" / "does not show X when absent" naming idiom.

## Acceptance criteria mapping

- Workflow chat displays configured description → covered by design change 2.
- Consistent location/style with assistant chat → unchanged shared markup.
- No configured description → no empty placeholder → existing ternary already handles this.
- Assistant chat behavior unchanged → assistant branch untouched; regression-guarded by new tests.
- Works for existing and newly created workflows → fetch is always live (cache-then-fetch), not tied to workflow creation time.
