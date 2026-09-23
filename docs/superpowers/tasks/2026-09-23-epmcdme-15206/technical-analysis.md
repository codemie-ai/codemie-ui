# Technical Research

**Task**: chats sidebar folder focused-mode
**Generated**: 2026-09-23T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Summary: User cannot create a folder in Focused sidebar mode because the Add folder button is not displayed.

Description: In the redesigned Chats side panel UI, users should be able to create folders from the sidebar regardless of the selected sidebar mode. In Focused sidebar mode, the Add folder button is missing, which prevents users from creating a new folder from this view.

Preconditions:
- The user is logged in to AI/Run CodeMie.
- The redesigned Chats side panel UI is available.
- The sidebar is switched to Focused mode.

Steps to Reproduce:
1. Open AI/Run CodeMie.
2. Open the Chats side panel.
3. Switch the sidebar to Focused mode.
4. Check the folders area/sidebar controls.
5. Try to create a new folder.

Expected Result: The Add folder button is visible and available in Focused sidebar mode, allowing the user to create a new folder.

Actual Result: The Add folder button is missing in Focused sidebar mode, so the user cannot create a folder.

Affected Areas: Chats side panel, Focused sidebar mode, Folder creation UI, Sidebar controls

Acceptance Criteria:
- The Add folder button is displayed in Focused sidebar mode.
- The user can create a new folder from Focused sidebar mode.
- Folder creation behavior is consistent with other supported sidebar modes.
- The button placement and visual style match the redesigned Chats side panel UI.
- No existing folder/sidebar behavior is broken in other modes.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarLists.tsx` — top-level orchestrator for the redesigned sidebar. It:
  - Reads `organizeBy` from `chatViewSettingsStore` (`useSnapshot`) and computes `isFocused = organizeBy === ChatOrganizeMode.FOCUSED || focusedView.type !== 'root'` (line 68).
  - Builds a `createFolderButton` JSX element (lines 165–182) — a `<button>` with `PlusSvg`, `title`/`aria-label="Create Folder"`, that calls `setActivePopup('folder-form')` on click.
  - Renders either `<FocusedChatSidebar .../>` (lines 189–199) or `<UnifiedChatSidebar .../>` (lines 201–215) based on `isFocused`.
  - **`createFolderButton` is passed only to `UnifiedChatSidebar`** as the `createFolderButton` prop (line 210). It is **not passed to `FocusedChatSidebar`** — `FocusedChatSidebar`'s prop list (lines 189–199: `view`, `viewModel`, `chatActions`, `currentChatId`, `density`, `navigationSection`, `onViewChange`, `onNewChat`, `registerChatElement`) has no such prop and `FocusedChatSidebarProps` (in `FocusedChatSidebar.tsx`) does not declare one.
  - `FolderFormPopup` (the actual create-folder dialog) is rendered unconditionally at the bottom of `ChatSidebarLists` (lines 235–239), gated only by `activePopup === 'folder-form'`, and its `onCreate` is wired to `handleCreateFolder` from `useChatSidebarSections`. So the creation *logic* is mode-agnostic; only the *trigger button* is mode-specific.

- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/UnifiedChatSidebar.tsx` — receives `createFolderButton` as a prop and renders it via `headerContentTemplate={createFolderButton}` on the "Folders" `ChatSidebarAccordion` (lines 158–182). This is how the Add-folder button reaches the UI in Unified mode.

- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedChatSidebar.tsx` — renders the Focused-mode root view. Its own "Folders" `ChatSidebarAccordion` (lines 252–281) is only rendered `{viewModel.groups.length > 0 && (...)}`  and is given `title`, `count`, `isExpanded`, `onToggle`, `scrollable` — **no `headerContentTemplate` prop is passed**, so no button renders in that header regardless of what `ChatSidebarLists` supplies. The component neither accepts nor forwards any create-folder affordance. The drill-down branch (lines 142–184, rendered when `view.type !== 'root'`) uses `FocusedViewHeader`, which only exposes a "New chat" button (`onNewChat`), not folder creation.

- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/FocusedViewHeader.tsx` — header for a drilled-down folder/assistant view; shows avatar, title, conversation count, a "New chat" `Button` (unless it's an import folder), a back button, and search input. No folder-creation control here either — consistent with it being a single-folder detail view rather than a place to create a *new* folder.

- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarAccordion.tsx` — shared accordion primitive; accepts `headerContentTemplate?: ReactNode` and renders it inside the header's right-hand `<div className="flex shrink-0 items-center gap-2">` (lines 91–96), alongside an optional `count`. This is the generic slot both sidebar modes could use to host the Add-folder button.

- `src/pages/chat/components/ChatSidebar/FolderList/FolderFormPopup.tsx` — the folder-creation dialog/form itself (shared, mode-agnostic).

- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/useChatSidebarSections.ts` — `handleCreateFolder` (line 150) is the creation handler passed to `FolderFormPopup`'s `onCreate`; also returns `folders`, `folderKinds`, `activeFolderIndices`, etc. used by `UnifiedChatSidebar`/`FolderList`. Not specific to a sidebar mode.

- `src/store/chatViewSettings.ts` — defines `ChatOrganizeMode` enum (`UNIFIED`, `FOCUSED`), the `chatViewSettingsStore` (Valtio) with `organizeBy` (default `ChatOrganizeMode.UNIFIED`), `density`, `showRecentAssistants`, `showWorkflowRunsSeparately`, persisted/restored from storage.

- `src/pages/chat/components/ChatSidebar/ChatViewSettings/ChatViewSettings.tsx` — the settings popover where the user switches sidebar mode; labels the two `ORGANIZE_OPTIONS` as **"Unified sidebar"** and **"Focused views"** (value `ChatOrganizeMode.FOCUSED`), confirming "Focused sidebar mode" in the ticket maps to `ChatOrganizeMode.FOCUSED` / the `FocusedChatSidebar` component tree.

### Architecture and Layers Affected

- **Presentation / component layer** only: `ChatSidebarLists.tsx` (container), `FocusedChatSidebar.tsx` (Focused-mode view), `ChatSidebarAccordion.tsx` (shared header slot), and optionally `FocusedChatSidebarProps` typing. No store, API, or backend layer changes are implicated — `handleCreateFolder`/`FolderFormPopup` already work regardless of mode.
- No routing, no new API calls; this is purely a prop-plumbing/rendering gap between a container component and one of its two mode-specific child views.

### Integration Points

- `ChatSidebarLists` → `FocusedChatSidebar` / `UnifiedChatSidebar` (internal, prop-driven).
- `ChatSidebarLists` → `FolderFormPopup` (shared popup, triggered via `activePopup` state — mode-agnostic).
- `chatViewSettingsStore.organizeBy` (Valtio) drives which child renders; read via `useSnapshot` in `ChatSidebarLists`.
- `useChatSidebarSections` supplies `handleCreateFolder`, folder lists, and registration callbacks consumed by `UnifiedChatSidebar`/`FolderList`; `FocusedChatSidebar` currently consumes only `viewModel.groups` (built by `buildFocusedChatSidebarViewModel` in `chatSidebarListsHelpers.ts` / `focusedChatSidebarViewModel.ts`) for its "Folders" section, not `useChatSidebarSections`' folder data.

### Patterns and Conventions

- Header-slot pattern: `ChatSidebarAccordion` exposes `headerContentTemplate?: ReactNode` specifically so a caller can inject a trailing action (used today for the Unified "Folders" section's Add-folder button, and for `count` badges). Reusing this same prop on `FocusedChatSidebar`'s "Folders" accordion is the pattern already established for Unified mode.
- The Add-folder button itself is a small inline `<button>` built once in the container (`ChatSidebarLists.tsx`) and passed down as a `ReactNode`, rather than being a separate named component — consistent with "container builds trigger, child renders it in its header" convention already used for `createFolderButton`.
- Popups (`FolderFormPopup`, `DeleteChatPopup`, `MoveChatPopup`, etc.) are all mounted once at the bottom of `ChatSidebarLists`, gated by a single `activePopup: PopupName | null` state — mode-agnostic by design, so no new popup wiring is implied by this task.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md`, `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/architecture/architecture.md` exist under `.ai-run/guides/` per `AGENTS.md`'s routing table, but none were found to mention the Chats sidebar's Focused/Unified split by name — this feature is recent enough (redesign commits `8bdde35f2`, `1757eca17`) that no dedicated guide section for it was located during this pass.
- `.ai-run/guides/testing/testing-patterns.md` (read) documents general Vitest/RTL conventions (see Section 4) but has no Chats-sidebar-specific guidance.

### Architectural Decisions

- No inline `NOTE:`/`HACK:`/`ADR:`/`DECISION:` markers were found in the files read (`ChatSidebarLists.tsx`, `FocusedChatSidebar.tsx`, `UnifiedChatSidebar.tsx`, `FocusedViewHeader.tsx`, `ChatSidebarAccordion.tsx`, `ChatViewSettings.tsx`).
- Commit history for these files (`git log --oneline -- <path>`, per `AGENTS.md`'s Orient table) was not walked in this pass; the two commits named in the task (`8bdde35f2`, `1757eca17`) are visible in the branch's recent-commits list but their diffs were not opened.

### Derived Conventions

- Container-builds-trigger / child-renders-via-slot for accordion header actions (see Patterns above).
- Sidebar-mode branching is centralized in one place (`ChatSidebarLists.tsx`'s `isFocused` ternary) rather than duplicated per feature — any parity fix belongs there or in the two child components it renders, not in a third location.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.test.tsx` — extensive coverage of folder/recent/pinned sorting, folder expand/collapse, import-folder dedup, and pin/move ordering (14 `it` blocks, lines 145–491+), but every test mocks `@/store/chats`, `@/store/pinOrder`, `@/store/moveOrder` and `valtio`'s `useSnapshot` — it does **not** mock `@/store/chatViewSettings`, so `organizeBy` resolves to the real store's default, `ChatOrganizeMode.UNIFIED`. None of these tests exercise Focused mode or assert on the Add-folder button's presence/absence.
- `src/pages/chat/components/ChatSidebar/__tests__/FolderList.test.tsx` and `FolderList/__tests__/FolderFormPopup.test.tsx` cover the folder list/creation popup in isolation, mode-agnostically.
- `src/pages/chat/components/ChatSidebar/__tests__/FocusedConversationSections.test.tsx` and `ChatSidebarLists/__tests__/FocusedAggregateRow.test.tsx`, `ChatSidebarLists/__tests__/useChatSidebarFolders.test.ts` cover pieces of Focused-mode rendering/data-shaping but not the root "Folders" accordion header or its action button.
- No test file found that renders `FocusedChatSidebar` directly with `viewModel.groups.length > 0` and asserts on the "Folders" accordion header content.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library, two workspace projects (`unit`, `integration`) per `vitest.workspace.ts`.
- Unit tests mock `useSnapshot`/Valtio stores directly (`vi.mock('valtio', ...)`, `vi.hoisted` store objects) and mock sibling components like `ChatSidebarAccordion` to isolate the container's logic — e.g. `ChatSidebarLists.test.tsx` mocks `../ChatSidebarLists/ChatSidebarAccordion` to a simplified stand-in exposing `children`, `isExpanded`, `onToggle`, `title`.
- AAA (Arrange/Act/Assert) style, `afterEach(cleanup)`, `describe`/`it` blocks per behavior — per `.ai-run/guides/testing/testing-patterns.md`.

### Coverage Gaps

- No existing test switches `chatViewSettingsStore.organizeBy` to `ChatOrganizeMode.FOCUSED` and asserts on the "Add folder"/"Create Folder" button's presence in the Focused root view — this is the exact scenario the ticket describes, and it is currently untested in either direction (i.e., the current missing-button bug is not caught by any test).
- No test asserts parity of the folder-creation button between Unified and Focused modes.

---

## 5. Configuration and Environment

### Environment Variables

- None found referencing this feature area. `grep`s for `import.meta.env`/`window._env_` in the Chats sidebar files returned no matches; sidebar-mode selection is entirely client-side state persisted via `chatViewSettingsStore`, not environment/config-driven.

### Configuration Files

- None specific to this feature. `chatViewSettingsStore` (in `src/store/chatViewsettings.ts`) persists `organizeBy`/`density`/etc. to browser storage (restored on init, per lines ~80 of that file), not to a config file.

### Feature Flags and Deployment Concerns

- No feature flag gates Focused vs. Unified mode — it is a user-facing radio-button preference in `ChatViewSettings.tsx`, not a rollout flag. No Dockerfile/CI reference to "focused" or "folder" was found.

---

## 6. Risk Indicators

- The fix is localized (prop plumbing + one accordion header), but confirming the *correct* fix requires deciding, as a design/spec question, whether the Add-folder trigger belongs on `FocusedChatSidebar`'s "Folders" accordion header (mirroring Unified mode) — this is not asserted as fact here since it is a design decision, not a discovered constraint.
- Speculative: `FocusedChatSidebar`'s "Folders" `ChatSidebarAccordion` (lines 252–281) is only rendered when `viewModel.groups.length > 0`. If the intended fix is to add `headerContentTemplate` to that same accordion, a user with **zero** folders in Focused mode would still see no Add-folder control, because the whole section is absent — the ticket's acceptance criteria ("consistent with other supported sidebar modes") implies checking how Unified mode behaves with zero folders (its "Folders" accordion in `UnifiedChatSidebar.tsx` is *not* conditionally hidden — it always renders with `createFolderButton` in the header) for parity.
- Speculative: `FocusedChatSidebarProps` would need a new prop (e.g. `createFolderButton?: ReactNode` or an `onCreateFolder` callback) threaded from `ChatSidebarLists.tsx` through `FocusedChatSidebar.tsx` to the accordion's `headerContentTemplate` — an interface change to a component with an existing, actively-used prop contract and existing consumers/tests.
- No automated test currently exercises Focused mode's root "Folders" header, so a regression here would not have been caught — any fix should add coverage for this exact scenario (button visible in Focused mode; clicking it opens `FolderFormPopup`; behavior otherwise unchanged in Unified mode).
- The drill-down `FocusedViewHeader.tsx` (folder/assistant detail view) intentionally has no create-folder control (it shows a "New chat" button instead) — care is needed not to conflate "Add folder" (root Focused view, creating a new top-level folder) with anything in the drill-down header, which is a different context (viewing/creating chats *within* an already-selected folder or assistant).
- Two prior redesign commits (`8bdde35f2` "Redesigned Chats side panel", `1757eca17` "Chats redesign bugfixes") touch this exact component tree; their diffs were not inspected in this pass, so it is unconfirmed whether the missing button is a regression introduced by one of them or a gap present since the Focused view's introduction.

---

## 7. Summary for Complexity Assessment

This is a presentation-layer-only fix confined to the Chats sidebar's Focused-mode component tree. The root cause is identified with high confidence: `ChatSidebarLists.tsx` builds a single `createFolderButton` element and passes it only to `UnifiedChatSidebar` (which renders it via the shared `ChatSidebarAccordion`'s `headerContentTemplate` slot on the "Folders" section); `FocusedChatSidebar.tsx` has no equivalent prop and its own "Folders" accordion (rendered only when `viewModel.groups.length > 0`) omits `headerContentTemplate` entirely. The folder-creation mechanics themselves (`FolderFormPopup`, `handleCreateFolder`) are already mode-agnostic and require no changes. Expected change surface: `ChatSidebarLists.tsx` (pass the button/handler down), `FocusedChatSidebar.tsx` (accept and render it), and possibly its prop-type declaration — roughly 2-3 files for the implementation.

Technical novelty is low — this reuses an existing, already-proven pattern (`headerContentTemplate` on `ChatSidebarAccordion`) rather than inventing new UI or wiring. The main open design question, not a research finding, is whether/how to also surface folder creation when Focused mode has zero folders (since that accordion section is currently conditionally hidden), which affects whether the fix is a one-line prop pass-through or also touches the conditional-render guard.

Test coverage posture is a genuine gap: no existing test switches the sidebar into `ChatOrganizeMode.FOCUSED` and asserts on the Folders header, so this bug shipped undetected and a fix should add that coverage. No backend, store-logic (beyond an existing read), routing, or configuration changes are implicated. Given the narrow, well-localized fix, well-understood existing patterns, and absence of cross-cutting or data-layer risk, this reads as a small task whose main effort is precise prop plumbing plus new targeted tests, tempered slightly by the open zero-folders design question noted above.

---

## 8. External References

None named by the task. The task references commit hashes (`8bdde35f2`, `1757eca17`) as context for what changed recently, but does not name an external file, directory, or URL as the source of truth to read from. Those commits are visible in this branch's recent-commit list; their diffs were not opened in this research pass (see Section 6).
