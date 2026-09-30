# Technical Research

**Task**: chat sidebar pinned focused-views sorting
**Generated**: 2026-09-28T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Ticket EPMCDME-15287 — Focused views: pinned chats are sorted by last chat activity instead of pinning time.

Description: In Focused views, chats in the Pinned section are sorted by the last chat activity time instead of the time when the chats were pinned. The Pinned section in Focused views should preserve a predictable order based on when chats were pinned. Currently, pinned chats are reordered according to the last usage/activity of the chats, which makes the Pinned section unstable and inconsistent with expected pinning behavior.

Acceptance Criteria:
1. Pinned chats in Focused views are sorted by pinning time.
2. Using or updating a pinned chat does not change its position in the Pinned section.
3. Newly pinned chats appear according to the defined pinning-time sorting logic.
4. The sorting behavior remains consistent after page refresh.
5. No regressions are introduced for chat sorting outside the Pinned section.

---

## 2. Codebase Findings

### Existing Implementations

The chat sidebar has two view modes — Unified and Focused — each built by its own pure view-model function, both exported from `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarListsHelpers.ts` and consumed side by side in `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx`:

- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/unifiedChatSidebarViewModel.ts` — `buildUnifiedChatSidebarViewModel(chats, settings, assistantFolders, pinOrder, moveOrder)`. Its private `sortPinnedByPinOrder(chats, pinOrder)` (lines 82-88) sorts `viewModel.pinnedChats` by `pinOrder[chat.id]`, falling back to `getValidDateTimestamp(chat.updateDate, chat.date)` only when a chat has no recorded pin-order entry.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/focusedChatSidebarViewModel.ts` — `buildFocusedChatSidebarViewModel(chats, settings, assistantFolders, chatFolders)`. Line 126 calls `sortChatsByMostRecent(collections.pinnedChats)` — the same recency sort used for `recentChats` and `workflowChats` (lines 127-128). This function takes **no `pinOrder` parameter at all**.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarCollectionHelpers.ts` — `sortChatsByMostRecent` (line 33) sorts purely by `getValidDateTimestamp(chat.updateDate, chat.date)`, descending. `getValidDateTimestamp` (line 24) accepts multiple string|null|undefined values and returns the first parseable timestamp.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/focusedChatSidebarCollections.ts` — `collectFocusedChats` routes any `chat.pinned` chat straight into `collections.pinnedChats` (function `collectListMembership`, lines 54-58) before any other classification, mirroring the Unified view's `getChatLocation`.
- `src/store/pinOrder.ts` — `pinOrderStore`, a Valtio proxy already built (per its own comment) to solve exactly this problem: "Tracks when each chat was last pinned, independent of `chat.updateDate`. The Pinned section sorts by this map instead of recency so that real activity inside a pinned chat... never reorders the Pinned section — only an explicit pin/unpin action does (EPMCDME-15009 reopened AC)." It exposes `getPinOrder()`, `recordPin(chatId)`, `clearPin(chatId)`, `ensurePinOrder(chatId, fallbackIso)`, all backed by per-user `storage` under key `pinned_chats_order`.
- `src/store/chats.ts` — wires the store's full lifecycle: `getChats()` (lines 322-327) backfills `pinOrderStore.ensurePinOrder(...)` for every already-pinned chat on load (covers chats pinned before the store existed); `pinChat()` (lines 604-615) calls `pinOrderStore.recordPin(id)` / `clearPin(id)` on toggle, explicitly noting "Pin/unpin is a menu action, not usage — it must not touch updateDate"; `deleteChat`/other chat-removal paths (lines 680, 723, 818, 850) call `pinOrderStore.clearPin(id)`.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx` — line 92 passes `pinOrderStore.getPinOrder()` into `buildUnifiedChatSidebarViewModel(...)`. The sibling call to `buildFocusedChatSidebarViewModel(...)` at lines 99-107 passes only `chats`, `settings`, `assistantFolders`, `chatFolders` — **no pin-order map is read or passed for the Focused view at all.**

In short: the pin-order tracking store, its persistence, and its consumption by the Unified view's sort are all already in place (built for a related, reopened AC under EPMCDME-15009). The Focused view's collection/view-model path was never wired to it and still uses the generic recency sort for its Pinned section — this is the exact defect the ticket describes.

### Architecture and Layers Affected

- **View-model / presentation-logic layer**: `focusedChatSidebarViewModel.ts` (the function needing the sort change) and its type `FocusedChatSidebarViewModel` in `chatSidebarTypes.ts`.
- **Container/wiring layer**: `ChatSidebarLists.tsx`, which currently reads `pinOrderStore.getPinOrder()` for the Unified call only.
- **Store layer**: `src/store/pinOrder.ts` (already implements persistence; no changes evident as needed) and `src/store/chats.ts` (already records/clears/backfills pin order on the relevant chat mutations).
- **Rendering layer**: `FocusedChatSidebar.tsx` / `FocusedConversationSections.tsx` render `viewModel.pinnedChats` in list order — they do not re-sort, so a corrected view-model order flows straight through to the UI.

### Integration Points

- `chatsStore` (`src/store/chats.ts`) is the source of `chats` passed into both view-model builders; it already maintains `pinOrderStore` side effects on pin/unpin/delete/load.
- `chatViewSettingsStore` (`ChatOrganizeMode`) determines whether Unified or Focused is rendered, but both view-models are built unconditionally on every render in `ChatSidebarLists.tsx` (lines 76-109), each memoized independently via `useMemo`.
- `useChatSidebarPagination.ts` and `useChatSidebarSections.ts` consume `pinnedChats` (from either view model) purely by array order/length (e.g. `pinnedChatIndex = pinnedChats.findIndex(...)`, slicing for batched rendering) — they are order-sensitive but sort-agnostic, so correcting the sort at the view-model layer is sufficient for them to reflect it.
- Persistence for AC4 (survive refresh) is already handled by `pinOrderStore`'s `storage`-backed, per-`userId` map — the same mechanism the Unified view already relies on.

### Patterns and Conventions

- Sorting is centralized as small named comparator functions (`sortChatsByMostRecent`, `sortPinnedByPinOrder`, `sortByRecencyWithMoveOrder`) that mutate an array in place with `Array.prototype.sort`, called explicitly at the end of the relevant `build*ViewModel` function — not inside collection/grouping helpers.
- The Unified view's `sortPinnedByPinOrder` (in `unifiedChatSidebarViewModel.ts`) is the direct precedent: `pinOrder[id] ?? fallback-to-own-recency`, using the same `getValidDateTimestamp` helper already imported and reused across both view-model files.
- `pinOrderStore` is deliberately decoupled from `chatsStore` and read via `.getPinOrder()` at the call site (`ChatSidebarLists.tsx`) rather than inside the pure view-model builder — the builder functions stay pure/testable with the map passed as a parameter (see `buildUnifiedChatSidebarViewModel`'s `pinOrder: Record<string, string> = {}` parameter with a default).
- Inline `// EPMCDME-XXXXX` comments are used throughout this file family to record non-obvious sort/AC decisions (e.g. the pinOrder.ts docstring citing EPMCDME-15009, the moveOrder comment citing EPMCDME-15007, `chatSidebarSectionsHelpers.ts`/`focusedChatSidebarViewModel.ts` citing EPMCDME-15206).

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guide under `.ai-run/guides/` is specific to chat pinning/sorting; the applicable general guides are `.ai-run/guides/patterns/state-management.md` (Valtio store conventions) and `.ai-run/guides/development/api-integration.md` — neither was found to mention pin-order behavior specifically. `AGENTS.md` routes state/store questions there.

### Architectural Decisions

Recorded directly in code comments rather than a separate ADR file:
- `src/store/pinOrder.ts` (lines 31-36): the store's entire purpose statement, explicitly citing "EPMCDME-15009 reopened AC" as the reason pin order must be tracked independently of `updateDate`.
- `src/store/chats.ts` line 610-611 (`pinChat`): "Pin/unpin is a menu action, not usage — it must not touch updateDate. The Pinned section's own order comes from pinOrderStore instead."
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/unifiedChatSidebarViewModel.ts` lines 90-94: contrasts Pinned-section stability with folder-list `moveOrder` behavior (which does allow real activity to override), and notes Recent is deliberately excluded from `moveOrder` per EPMCDME-15007.
- `git log` shows the EPMCDME-15009 commit series ("Implement fix-activity-timestamp-leaks", "Finalize... after verification", "Merge fix-activity-timestamp-leaks into EPMCDME-13270") as the origin of `pinOrderStore` and the Unified-view wiring; `chatSidebarListsHelpers.test.ts` already contains a `describe('pinned section ordering')` block under `buildUnifiedChatSidebarViewModel` covering exactly AC1/AC2/AC3-equivalent cases for the Unified view.

### Derived Conventions

- Test file naming: one consolidated `*.test.ts`/`*.test.tsx` per logical area under a component's `__tests__/` directory, with `describe` blocks per exported function and nested `describe` blocks for sub-behaviors (e.g. `describe('pinned section ordering')`, `describe('move order')`).
- New tests for regressions/AC clarifications routinely reference the originating ticket in the `it(...)` title or an inline comment, e.g. `'moves a pinned workflow chat into Pinned instead of Workflows (EPMCDME-15010)'`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatSidebar/__tests__/chatSidebarListsHelpers.test.ts` — the primary unit-test file for both view-model builders.
  - `describe('buildUnifiedChatSidebarViewModel') > describe('pinned section ordering')` (lines 311-435) already fully covers pin-order-driven sorting, immunity to `updateDate` changes, unpin removing an entry while preserving relative order, and fallback-to-`updateDate` when no pin-order entry exists — a template directly reusable for the Focused view.
  - `describe('buildFocusedChatSidebarViewModel')` (lines 548-956) has pinned-related tests, but they assert the **current, bug-matching** behavior: e.g. `'shows two pinned folder chats as individual rows without aggregation'` (lines 668-695) expects `pinnedChats` ordered `['newer-pinned', 'older-pinned']` based purely on `date`, and `'keeps a pinned chat as a chat and does not add an annotated assistant row'` (lines 654-666) also orders by `date`/recency. No existing Focused-view test passes a pin-order map or asserts pin-order-based stability.
- `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx` — integration-level test for the sidebar container. It mocks `@/store/pinOrder` (`vi.mock('@/store/pinOrder', ...)`, line 45) and has `'renders the Pinned section ordered by pinOrderStore, not by updateDate'` (line 450) — but this test exercises only the **Unified** rendering path (`UnifiedChatSidebar`/`data-testid="pinned-section"` list), not the Focused rendering path.
- `src/store/__tests__/pinOrder.test.ts` — full unit coverage of `pinOrderStore` itself (`getPinOrder`, `recordPin`, `clearPin`, `ensurePinOrder`), independent of either view model.
- `src/store/__tests__/chats.pinRenameUpdateDate.test.ts` — covers `chatsStore.pinChat`/rename not touching `updateDate` inappropriately (adjacent, store-layer coverage).

### Testing Framework and Patterns

- Vitest (`vitest run`, workspace projects `unit` and `integration` per `vitest.workspace.ts`), React Testing Library for component tests.
- Pure view-model functions are tested directly (no rendering) by calling the exported builder with a `createChat(overrides)` factory and asserting on the returned object's arrays/maps.
- `vi.mock` + `vi.hoisted` used to stub `@/store/pinOrder` and `@/utils/storage` at the store level in both `ChatSidebarLists.test.tsx` and `pinOrder.test.ts`.
- Component-level pinned-order assertions read a rendered list's `data-testid` container and check a joined-ids attribute or `data-expanded`/ordering of child test ids (see `ChatSidebarLists.test.tsx` lines 475-484).

### Coverage Gaps

- No test asserts `buildFocusedChatSidebarViewModel`'s Pinned section is stable against `updateDate` changes or ordered by an injected pin-order map — mirroring the gap in the implementation itself.
- No test exercises the Focused-view *rendering* path (`FocusedChatSidebar`) for pinned-section order, analogous to the Unified-view assertion in `ChatSidebarLists.test.tsx` line 450.
- The two existing Focused-view tests that assert `date`-based ordering for pinned chats (lines 654-666, 668-695 of `chatSidebarListsHelpers.test.ts`) currently encode the reported-buggy behavior as expected output; they are a coverage item to reconcile, not a gap, but are worth flagging since they will read as failing/contradictory once the sort criterion changes.

---

## 5. Configuration and Environment

### Environment Variables

None found specific to pinning or Focused-view sorting. `pinOrderStore` reads no env var; it is purely `storage`-backed per authenticated `userId`.

### Configuration Files

- No dedicated config file for chat sorting. `ChatOrganizeMode` (in `src/store/chatViewSettings.ts`) is a persisted user setting (Unified vs Focused) but does not gate which sort algorithm runs for Pinned — both view-model builders currently run unconditionally per render in `ChatSidebarLists.tsx`.
- `src/constants/featureFlags.ts` defines `PINNED_ASSISTANTS: 'features:pinnedAssistants'`, which is unrelated — it gates the Navigation sidebar's *pinned assistants* feature (`src/components/Navigation/NavigationPinnedSection/`), a different domain from chat pinning.

### Feature Flags and Deployment Concerns

No feature flag or deployment manifest reference to chat-pinning sort behavior was found. This is a pure client-side logic fix with no config/deployment surface.

---

## 6. Risk Indicators

- The two existing tests in `chatSidebarListsHelpers.test.ts` (lines 654-666 and 668-695) assert pinned-chat ordering by `date`/recency for the Focused view. Speculative: correcting the sort to pin-order will very likely make these specific assertions fail and require them to be updated as part of this change, since they currently encode the defect as expected behavior.
- Speculative: `buildFocusedChatSidebarViewModel`'s signature (`chats, settings, assistantFolders, chatFolders`) has no slot for a pin-order map today; adding one changes a widely-used function signature (also re-exported from `chatSidebarListsHelpers.ts` and called from `ChatSidebarLists.tsx`), so every call site and its tests that invoke it positionally would need to pass the new argument.
- No Focused-view-specific integration test exists at the `ChatSidebarLists.test.tsx` level (only a Unified-view one), so a rendering-level regression in the Focused Pinned section would not be caught without new coverage — this task adds a testing gap risk if only the view-model unit tests are updated.
- `pinOrderStore` already carries a one-time backfill (`ensurePinOrder` in `chats.ts` `getChats()`) and lifecycle wiring (`pinChat`, delete paths) that is view-mode agnostic — low risk that any store-layer change is needed at all; the defect appears isolated to the read/wiring side in the Focused view-model and its caller.

---

## 7. Summary for Complexity Assessment

This is a narrowly scoped, well-precedented bug fix confined to the presentation/view-model layer of the chat sidebar. The defect is concretely located: `focusedChatSidebarViewModel.ts` line 126 sorts the Focused view's Pinned section with the generic `sortChatsByMostRecent` (recency-based) instead of a pin-order-based comparator, and `ChatSidebarLists.tsx` never reads/passes `pinOrderStore.getPinOrder()` into `buildFocusedChatSidebarViewModel(...)` (it does pass it to the sibling `buildUnifiedChatSidebarViewModel(...)`, which already implements and tests the exact behavior this ticket wants). The persistence layer (`pinOrderStore` in `src/store/pinOrder.ts`) and its lifecycle wiring (`recordPin`/`clearPin`/`ensurePinOrder` in `src/store/chats.ts`) already exist, are fully unit-tested, and were built specifically to solve this class of problem for a related, reopened AC (EPMCDME-15009) — so this ticket does not need new store-layer work, only wiring the existing store into the Focused view's build function and view-model signature, mirroring the Unified view's precedent almost line for line.

Test coverage posture is mixed: the Unified view's equivalent behavior has thorough, directly-reusable test patterns (`describe('pinned section ordering')` in `chatSidebarListsHelpers.test.ts`), but the Focused view currently has two tests that assert the buggy date-based order as expected, and no test exercises the Focused-view rendering path's pinned-section order the way `ChatSidebarLists.test.tsx` does for Unified. Technical novelty is low — the pattern, helper (`getValidDateTimestamp`), and even the comparator shape already exist verbatim in the codebase for the sibling view. The main risk is scope discipline: touching a shared, positionally-parameterized builder function and its several call sites/tests without over-reaching into unrelated Focused-view behavior (folders, assistant groups, workflow runs) which must remain on `sortChatsByMostRecent` per AC5.

---

## 8. External References

None named by the task.
