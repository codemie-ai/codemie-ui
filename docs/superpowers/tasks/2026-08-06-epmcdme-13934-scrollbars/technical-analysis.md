# Technical Research

**Task**: scrollbar scroll overflow css layout sidebar panel
**Generated**: 2026-08-06T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix scrollbar-related issue EPMCDME-13934 which was introduced as a side effect of EPMCDME-11292 scope. The branch is named EPMCDME-13934_scrollbars. EPMCDME-11292 appears to have been a previous feature/refactor. We need to identify what CSS/layout changes from EPMCDME-11292 broke scroll behavior and how to fix it.

---

## 2. Codebase Findings

### What EPMCDME-11292 Changed (the root cause commits)

EPMCDME-11292 ("Add draggable resize handle between chat history and prompt") landed across six commits. The primary layout-breaking changes are:

**`src/pages/chat/components/ChatHistory/ChatHistory.tsx`** — line 44:
```
- className="grow w-full pt-8 pb-12 px-6 overflow-y-auto scrollbar-gutter"
+ className="h-full w-full pt-8 pb-12 px-6 overflow-y-auto scrollbar-gutter"
```
`grow` was replaced with `h-full`. This was intentional — once ChatHistory lives inside a `Panel` (from `react-resizable-panels`), `grow` does nothing because the Panel's flex layout is managed by the library. `h-full` fills the Panel's allocated height. This is correct for the resizable mode.

**`src/pages/chat/ChatPage.tsx`** — the chat main-content area was restructured:
```tsx
// Before
<div className="flex h-full">
  {currentChat && (
    <div className="flex flex-col items-center grow min-w-0 pb-4">
      {!!currentChat?.history.length && <ChatHistory />}
      <ChatPrompt />
    </div>
  )}
  <ChatConfiguration ... />
</div>

// After
<div className="flex h-full">
  {currentChat && (
    <div className="flex flex-col grow min-w-0 overflow-hidden">
      {hasHistory ? (
        <Group orientation="vertical" ...>
          <Panel id="chat-history" defaultSize={70} minSize={80}>
            <ChatHistory />
          </Panel>
          <ChatResizableSeparator />
          <Panel id="chat-prompt" defaultSize={30} minSize={130}>
            <ChatPrompt resizable />
          </Panel>
        </Group>
      ) : (
        <ChatPrompt />
      )}
    </div>
  )}
  <ChatConfiguration ... />
</div>
```

Key structural changes that affect scroll:
- `items-center` was removed from the inner container (was centring content horizontally)
- `pb-4` was removed (bottom padding gone from the outer container)
- `overflow-hidden` was added to the inner container (clips any overflow — this blocks scrollbars from appearing on the Group's container itself)
- A `<Group orientation="vertical">` wraps the history+prompt split when `hasHistory` is true
- `minSize={80}` on chat-history panel and `minSize={130}` on chat-prompt panel are **percentage values** in `react-resizable-panels` default unit system (not pixels), since no `unitSystem` prop is set on the Group — these are very small percentages (80% and 130% of the group height... but 130% > 100% is impossible and gets clamped). **This is likely a bug.** The workflow reference implementation uses `minSize={53}` and `minSize={25}` as percentages; 130 as a minSize percentage would always be invalid.

**`src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`** — dual-mode sizing:
- When `resizable=false` (no-history state): `'min-h-32 h-fit -translate-y-3 shrink-0'` on outer scroll div
- When `resizable=true` (has-history state): `'flex-1 min-h-0'` on outer scroll div
- The border wrapper adds `'h-full flex flex-col'` when `resizable=true`
- The inner input container: `resizable ? 'h-full min-h-0' : 'min-h-32 max-h-64'`

**Note on indentation bug in ChatPage.tsx** — the `<div className="flex h-full">` at line 102 and subsequent children have inconsistent indentation (the `</PageLayout>` closing tag at line 127 is mis-indented relative to the opening at line 101). This is cosmetic but signals a merge/rebase conflict residue.

### Existing Implementations

- `src/pages/chat/ChatPage.tsx` — Chat page root. Horizontal `Group` (sidebar / main-content). Within main-content, a vertical `Group` (history / prompt panels) when `hasHistory` is true; bare `<ChatPrompt />` when no history.
- `src/pages/chat/components/ChatHistory/ChatHistory.tsx` — Scrollable message list. Root div uses `h-full overflow-y-auto scrollbar-gutter`. Attaches `scrollContainerRef` used by `useChatScroll` hook.
- `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` — Dual-mode prompt input. `resizable=true` fills Panel height; `resizable=false` (initial/no-history state) falls back to fixed `min-h-32 max-h-64` with `-translate-y-3` visual trick.
- `src/pages/chat/components/ChatPrompt/ChatPromptStarters.tsx` — Shown when no history. Root div: `"flex justify-center py-8 grow w-full overflow-y-auto"`. Uses `grow` — in the no-history state this needs a flex parent with bounded height to work. With `overflow-hidden` now on the parent container, this may not scroll correctly.
- `src/pages/chat/components/ChatResizableSeparator.tsx` — Custom `Separator` for the history/prompt split. Inline `h-4 -my-2` (4px height with -8px margin compensation via negative margins). The `-my-2` creates an 8px negative margin on both sides which, combined with `h-4`, effectively creates a zero-height separator with an 8px invisible drag zone above and below.
- `src/components/ResizableSeparator/ResizableSeparator.tsx` — Used for the horizontal sidebar/content split. Different from `ChatResizableSeparator`.
- `src/components/Sidebar/Sidebar.tsx` — Generic sidebar container. Inner content div at line 90: `"mt-7 h-full z-[10] overflow-y-auto px-6"` — this creates a scroll container for all sidebar content. The `h-full` here, combined with `overflow-y-auto`, is the sidebar's own scroll mechanism.
- `src/components/Layouts/Layout/PageLayout.tsx` — Page wrapper. The children container at line 113: `"flex-grow overflow-y-auto show-scroll h-full w-full px-6"`. When used with `childrenClassName="px-0"` (as in ChatPage), this becomes `"flex-grow overflow-y-auto show-scroll h-full w-full"`. **This outer `overflow-y-auto` creates a scroll container around the entire chat content area, which can conflict with the inner scroll containers (ChatHistory, ChatPrompt).** The inner `<div className={cn('h-full', ...)}>` that wraps `children` means the Group fills this container.
- `src/pages/chat/hooks/useChatPromptResize.ts` — Manages panel layout persistence via `react-resizable-panels`' `useDefaultLayout`, keyed to `localStorage` with `chat-prompt-height-${userId}`.
- `src/assets/stylesheets/main.scss` — Global scroll utilities:
  - `.scrollbar-gutter { scrollbar-gutter: stable both-edges; }` — reserves gutter space for scrollbar to prevent layout shift
  - `.scrollbar-gutter-edge { scrollbar-gutter: stable; }` — single-edge variant
  - `.hide-scrollbar` — hides scrollbars via `scrollbar-width: none`
  - `.show-scroll` — styled scrollbar (8px thumb, structural color)
  - Lines 66–68: `:not(textarea):not(.show-scroll)::-webkit-scrollbar { display: none; }` — **all WebKit scrollbars are hidden globally unless `.show-scroll` is present**
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarAccordion.tsx` — Scrollable accordion sections. The `scrollable` variant uses `flex-1 min-h-0 overflow-hidden` on the root to allow flex-shrinking.

### Architecture and Layers Affected

- **UI / Page layer** (`src/pages/chat/ChatPage.tsx`): Owns the panel layout structure. The dual `Group` nesting (horizontal sidebar + vertical history/prompt) is the root of the scroll context hierarchy.
- **Component layer** (`src/pages/chat/components/ChatHistory/ChatHistory.tsx`): Self-contained scroll container. `h-full overflow-y-auto` depends on the Panel providing a bounded height.
- **Component layer** (`src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`): Dual-mode sizing. When `resizable=true`, the component must fill Panel height via flex column chain: `h-full flex flex-col` → `flex-1 min-h-0` → `h-full flex flex-col` → `h-full min-h-0`.
- **Layout layer** (`src/components/Layouts/Layout/PageLayout.tsx`): Wraps the entire chat content area. Its `overflow-y-auto` on the children container is the outermost scroll boundary.
- **Shared CSS layer** (`src/assets/stylesheets/main.scss`): Global scrollbar hiding and `.scrollbar-gutter` utility.

### Integration Points

- `react-resizable-panels` (v4.x) — `Group`, `Panel`, `Separator`, `useDefaultLayout`. The library manages panel heights via inline `flex` styles set imperatively on panel elements. Panel children must use `h-full` to fill allocated space.
- `useChatScroll` hook — attaches to `scrollContainerRef` on ChatHistory root div. Responsible for auto-scroll-to-bottom on new messages. If the ChatHistory div's scroll container relationship changes, this hook may fail to detect scroll position correctly.
- `useChatInfiniteScroll` hook — uses an intersection observer (`sentryRef`) at the top of ChatHistory to trigger loading more messages. Depends on the scroll container being the ChatHistory root div (passed as `rootRef`).
- `useChatPromptResize` hook — localStorage persistence of panel layout percentages.

### Patterns and Conventions

- **Scroll container chain**: `html/body/#app` (no scroll, `h-screen`) → `PageLayout` children div (`overflow-y-auto show-scroll h-full`) → ChatPage inner div (`flex h-full`) → inner container (`flex flex-col grow min-w-0 overflow-hidden`) → `Group` (react-resizable-panels manages flex) → `Panel` (bounded height set by library) → component root (`h-full`).
- **Scrollbar visibility rule**: Scrollbars are hidden by default in WebKit. Only elements with `.show-scroll` class show a styled scrollbar. `ChatHistory` uses `.scrollbar-gutter` (no visible scrollbar, just space reservation) — the WebKit scrollbar remains hidden there too. `PageLayout`'s children container uses `.show-scroll`.
- **Global scrollbar hiding**: The `:not(textarea):not(.show-scroll)::-webkit-scrollbar { display: none }` rule inside `html, body, #app {}` block (lines 66–68 of main.scss) suppresses all scrollbars for WebKit browsers unless `.show-scroll` is explicitly applied.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No frontend-specific guides found in `.ai-run/guides/`. All guides cover the backend (FastAPI, LangChain, SQLModel, etc.). Conventions are derived entirely from code exploration.

The prior EPMCDME-11292 SDLC artifacts are available at:
- `docs/superpowers/tasks/2026-07-16-context-window-resize/technical-analysis.md` — pre-implementation research (already reviewed above)
- `docs/superpowers/tasks/2026-07-16-context-window-resize/spec.md` — feature specification
- `docs/superpowers/tasks/2026-07-16-context-window-resize/plan.md` — implementation plan
- `docs/superpowers/tasks/2026-07-16-context-window-resize/qa-report.md` — QA report

### Architectural Decisions

The prior tech-analysis for EPMCDME-11292 explicitly identified the following risks (all of which became the implementation reality):
1. `PageLayout` `overflow-y-auto` on children container conflicting with Group-controlled inner scroll — addressed by adding `overflow-hidden` to the inner flex container in ChatPage.
2. `grow` on ChatHistory root needing to become `h-full` — done.
3. `h-fit shrink-0` on ChatPrompt scroll container needing to become `flex-1 min-h-0` — done.
4. Conditional rendering: Panel split only when `hasHistory` is true — done.

### Derived Conventions

- Panel children must always use `h-full` as root class to fill allocated panel space.
- Scrollable containers inside Panels use `overflow-y-auto` with `h-full` (not `flex-grow` or `min-h`).
- The global WebKit scrollbar-hide rule means any new scroll container needs an explicit decision: add `.show-scroll` for a visible scrollbar, or leave it hidden (content accessible but no visual indicator). `ChatHistory` deliberately hides the scrollbar via the global rule (no `.show-scroll`, no `.hide-scrollbar` — just hidden by the global WebKit rule).

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/__tests__/ChatPage.test.tsx` — Unit tests. Mocks `react-resizable-panels` (Panel, Group), `useChatPromptResize`, and all child components. Does NOT test scroll behaviour or CSS classes.
- `src/pages/chat/__tests__/ChatPage.integration.test.tsx` — Integration tests added by EPMCDME-11292. Tests resize separator presence and basic render. Does NOT test scroll behaviour.
- `src/pages/chat/__tests__/ChatPage.resize.test.tsx` — Resize-specific tests from EPMCDME-11292. Tests separator accessibility.
- `src/pages/chat/components/ChatHistory/hooks/` — Tests for `useChatScroll` and `useChatInfiniteScroll` exist.
- No tests exercise scroll container geometry, scrollbar visibility, or `scrollbar-gutter` behaviour.

### Testing Framework and Patterns

- Vitest + React Testing Library + `@testing-library/user-event`
- `ResizeObserver` is globally mocked in `setupTests.tsx` — required for `react-resizable-panels`
- `localStorage` is globally mocked in `setupTests.tsx` — covers `useChatPromptResize` persistence
- `react-resizable-panels` is NOT globally mocked in integration tests

### Coverage Gaps

- No test for ChatHistory scrolling within the Panel (auto-scroll-to-bottom, infinite scroll sentinel positioning)
- No test for the ChatPrompt scroll container in `resizable=true` mode
- No visual/regression test for scrollbar visibility or `scrollbar-gutter` layout shift prevention
- No test for the no-history state scroll behaviour (`ChatPromptStarters` overflow)

---

## 5. Configuration and Environment

### Environment Variables

None relevant. This is a pure CSS/layout change.

### Configuration Files

- `src/assets/stylesheets/main.scss` — Global scrollbar rules, `.scrollbar-gutter`, `.hide-scrollbar`, `.show-scroll` definitions. The primary CSS source for scroll-related utilities.
- `tailwind.config.ts` — Tailwind config (no custom scroll utilities defined; standard Tailwind overflow/height classes are used).
- `vite.config.ts` — Modified on the current branch (`EPMCDME-13934_scrollbars`) but unrelated to scroll (unstaged change, likely from a different concern).

### Feature Flags and Deployment Concerns

None. No feature flags gate the scroll behaviour.

---

## 6. Risk Indicators

- **`minSize={130}` on the chat-prompt Panel is invalid as a percentage** — `react-resizable-panels` defaults to percentage units (0–100). A `minSize` of 130 means 130% of the Group height, which is impossible. The library will likely clamp this to 100% or ignore it, preventing the prompt panel from being shrunk below some internal minimum. This could cause the prompt panel to be stuck at a fixed minimum that ignores the `defaultSize={30}` (30%). The intended value was likely 130px (pixels), requiring `unitSystem="pixels"` on the Group or using the pixel-based API. Analogous value in the workflow page is `minSize={53}` where the Group does not specify pixel units either, so workflow panels use percentages too.

- **`PageLayout` wraps chat content with `overflow-y-auto show-scroll h-full`** — The `overflow-y-auto` on the PageLayout children container (line 113) creates an outer scroll boundary. The inner `<div className="flex h-full">` in ChatPage and the subsequent `overflow-hidden` container should prevent this outer scroll from activating. However, if any child element's height exceeds the Group's allocated space, content can escape the `overflow-hidden` boundary and trigger the outer scroll instead of the inner ChatHistory scroll. The result would be the entire page scrolling rather than just the message list.

- **Double `overflow-y-auto` chain in ChatPrompt (`resizable=true`)** — In resizable mode, the outer scroll div (`flex-1 min-h-0 overflow-y-auto`) wraps the border wrapper, which in turn contains the inner div (`h-full min-h-0`). The intent is that the outer div scrolls if the prompt content exceeds the Panel height. However, the inner div also has `h-full`, which means it tries to be 100% of the Panel — so there is no content overflow to trigger scroll. The `overflow-y-auto` on the outer div in resizable mode may be redundant, or may conflict with the `h-full flex flex-col` chain.

- **`ChatPromptStarters` uses `grow` inside `overflow-hidden` parent** — In the no-history state, `ChatPage` renders `<ChatPrompt />` (without `resizable`) inside `<div className="flex flex-col grow min-w-0 overflow-hidden">`. `ChatPromptStarters` renders inside `ChatPrompt` and its root has `"flex justify-center py-8 grow w-full overflow-y-auto"`. The `grow` here requires a flex parent with bounded height. The `overflow-hidden` on the ancestor container should bound the height, but the no-history state has no Panel to set the height — the height comes from the flex layout of the outer container and PageLayout. If the outer container height is unbounded, `grow` + `overflow-y-auto` on starters won't create a scroll — it will expand indefinitely.

- **`ChatResizableSeparator` uses `-my-2` (negative margin)** — The separator has `h-4 -my-2`. Negative margins can interact with `overflow-hidden` on parent containers, potentially clipping the drag hit zone or causing visual artefacts. The separator's `-8px` vertical margin means part of the drag zone extends outside the Panel boundaries into adjacent Panel space, which is the intended behavior for hit-testing but can be visually disrupted by `overflow-hidden`.

- **`scrollbar-gutter: stable both-edges` on ChatHistory** — The `.scrollbar-gutter` class applies `scrollbar-gutter: stable both-edges`, reserving space on both sides for a scrollbar gutter even when no scrollbar is visible. Since WebKit hides the scrollbar globally (via the `:not(.show-scroll)::-webkit-scrollbar { display: none }` rule), this reserved space creates a phantom margin on both sides of ChatHistory content. This is the intended behavior (prevents layout shift when scrollbar appears/disappears on Firefox), but confirms the scrollbar itself is intentionally invisible on Chrome/Safari.

- **No codegraph indexing** — Research was conducted via filesystem only. Any cross-file symbol relationships (e.g., all consumers of `ChatHistory`, all uses of `scrollbar-gutter`) were found via grep rather than semantic analysis. There may be additional affected components not found.

- **Branch `EPMCDME-13934_scrollbars` has no dedicated fix commits yet** — The branch is currently at the same commit as `main` (HEAD = `25464aee3`). Only `vite.config.ts` is modified (unstaged). The fix work has not started. This analysis is a pre-fix research document.

---

## 7. Summary for Complexity Assessment

EPMCDME-11292 introduced a vertical `react-resizable-panels` split between `ChatHistory` and `ChatPrompt` inside `ChatPage`. The implementation correctly followed the established workflow-page panel pattern for the most part, but introduced several scroll-related side effects. The primary architectural layers affected are the UI/Page layer (`ChatPage.tsx`), the Component layer (`ChatHistory.tsx`, `ChatPrompt.tsx`), and the shared CSS layer (`main.scss`).

The most likely sources of the reported scrollbar regression are: (1) `minSize={130}` on the chat-prompt Panel is an invalid percentage value (> 100) that may prevent the panel from reaching its intended `defaultSize={30}`, causing layout thrashing; (2) the `overflow-hidden` added to the inner chat container in `ChatPage` may clip content in edge cases, especially in the no-history state where `ChatPromptStarters` uses `grow` without a Panel-bounded height; and (3) the `scrollbar-gutter: stable both-edges` on ChatHistory combined with the global WebKit scrollbar-hide rule creates a reserved gutter space that may appear as unexpected padding/margin if the CSS rule order changes or if the `.show-scroll` class is inadvertently applied to a ChatHistory ancestor.

The estimated fix surface is narrow: 1–3 files (`ChatPage.tsx`, possibly `ChatHistory.tsx` or `ChatPrompt.tsx`), with a potential correction in `useChatPromptResize.ts` if the Panel sizing unit issue is confirmed. No new dependencies, no API changes, no store changes are expected. Test coverage for the specific regression scenario (scroll behaviour within resizable panels) is absent and would need to be added. The fix complexity is low-to-medium: the root cause is identifiable from static analysis, but verifying the exact broken scroll scenario requires runtime observation to confirm which of the candidate issues listed above is the actual manifestation.
