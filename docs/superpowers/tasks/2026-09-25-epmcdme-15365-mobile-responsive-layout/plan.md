# Implementation Plan — Mobile and Tablet Adaptation

**Scope:** codemie-ui only; UI layer and `appInfoStore`. No API, routing or dependency change.
**Branch:** EPMCDME-15365
**Spec:** `docs/superpowers/tasks/2026-09-25-epmcdme-15365-mobile-responsive-layout/spec.md`
**Status:** All tasks implemented.

Rule for every task: mobile changes are gated by `max-lg:`/`max-sm:` or `useIsMobileLayout()`; desktop
class sets and behaviour stay identical.

---

## Task 1 — Breakpoint and mobile shell state

**Files:** `src/constants/mobileLayout.ts` (new), `src/hooks/useIsMobileLayout.ts` (new), `src/store/appInfo.ts`

**Steps:**
- `MOBILE_LAYOUT_MEDIA_QUERY` = the query Tailwind emits for `max-lg:`; `MOBILE_OVERLAY_CLASS_NAME` for
  full-width overlays under the top bar; `--mobile-top-bar-bottom` CSS variable name.
- `useIsMobileLayout()` via `useSyncExternalStore` + `matchMedia`; `matchesMobileLayout()` for one-off reads.
- Store: `mobileNavigationOpen`, `mobileSidebarOpen` (mutually exclusive setters) and
  `pageSidebarCount` with `registerPageSidebar()` returning its cleanup.

## Task 2 — Top bar and navigation overlay

**Files:** `src/components/Navigation/MobileTopBar.tsx` (new), `useNavigationExpanded.ts` (new),
`Navigation.tsx`, `NavigationSection/NavigationLink.tsx`, `NavigationPinnedSection.tsx`,
`NavigationProfile.tsx`, `src/components/NavigationMore/NavigationMore.tsx`, `src/App.tsx`,
`src/__tests__/App.test.tsx`

**Steps:**
- Top bar: logo (new chat), sidebar button (only with a registered page sidebar), section switcher
  (current section from the first path segment, route title fallback). Publishes its bottom edge for
  the overlays (the dismissible banner moves it). Closes both overlays on navigation, except for a
  query-only change, and when it unmounts.
- Navigation renders as a full-screen overlay while open (always expanded, closes on link tap and
  Escape); logo and expand button hidden. Bottom-section colours readable in the light theme.
- `NavigationMore` flips on mobile so menus stay on screen.
- App: top bar and column layout below `lg`; gradient and floating help launcher desktop-only.
- App test mocks `MobileTopBar` (its `react-router` mock has no router).

## Task 3 — Page sidebars as overlays

**Files:** `src/components/Sidebar/Sidebar.tsx`, `src/components/Sidebar/useMobileSidebar.ts` (new),
`src/hooks/useSidebarOffsetClass.ts`, `src/pages/workflows/details/WorkflowExecutions/WorkflowExecutions.tsx`

**Steps:**
- `useMobileSidebar()` registers the sidebar with the top bar and closes it on Escape.
- `Sidebar` and the execution-history aside: overlay under the top bar, hidden until opened, no
  `SidebarToggle` on mobile; desktop class sets unchanged.
- Pagination offset: `left-0` on mobile.

## Task 4 — Page header, dialogs, tabs, cards

**Files:** `PageLayout.tsx`, `Popup.tsx`, `Tabs.tsx`, `Tab.tsx`, `Card.tsx`, `SelectButton.tsx`,
`DetailsSidebar.tsx`

**Steps:** header wraps and truncates; dialogs capped at screen width; tabs scroll horizontally; cards
grow to fit a wrapping footer; select-button captions visually hidden; decorative glow hidden on phones.

## Task 5 — Tables as cards

**Files:** `src/components/Table/Table.tsx`, `TableCardList.tsx` (new), `TableCell.tsx`, `TableColHeader.tsx`

**Steps:**
- `TableCellContent` extracted from `TableCell` (same logic) so cards reuse cell rendering.
- Default-variant tables without footers or custom rows render `TableCardList` on mobile: title,
  actions, labelled fields, expandable content.
- Card toolbar with "Select all" (shared `getSelectAllState` from the header) and "Sort by" buttons
  calling the same `onSort`.
- Taps inside expanded content do not toggle selection, matching the table's separate expansion row.

## Task 6 — Chat and conversations

**Files:** `src/pages/chat/ChatPage.tsx`, `ChatConfiguration/ChatConfiguration.tsx`,
`ChatConfiguration/useChatConfigResize.ts`, `ChatSidebar/useChatSidebarResize.ts`,
`ChatHeader/ChatHeader.tsx`, `ChatPrompt/ChatPrompt.tsx`, `ChatPrompt/ChatPromptSkillsButton.tsx`,
`ChatPrompt/ChatPromptLlmSelector.tsx`, `src/components/ToolCallPolicyDropdown/ToolCallPolicyDropdown.tsx`,
`ChatHistory/ChatAiMessage/ChatAiMessage.tsx`

**Steps:**
- Mobile tree without resizable panels: chat list as page sidebar, configuration as overlay with a close
  button; picking another chat closes the configuration. Desktop tree unchanged.
- Panel sync effects re-run when the desktop panels mount again after the mobile layout.
- Compact header (icon-only actions, no New Chat button), icon-first prompt toolbar that keeps Send
  visible, compact AI metadata with a small inline avatar.

## Task 7 — Forms

**Files:** `AssistantForm.tsx`, `SystemPromptCurrentTab.tsx`, `ToolsConfiguration.tsx`,
`ToolkitsPanelLayout.tsx`, assistants and skills `FormGenAIPopup.tsx`, `SkillForm.tsx`,
`SkillInstructions.tsx`, `SkillsGrid.tsx`, `DataSourceForm.tsx`

**Steps:** assistant form uses the existing compact layout on mobile; rows wrap; toolkits panes stack;
skill form without side padding; data source rows wrap.

## Task 8 — Other pages

**Files:** workflows `WorkflowCard.tsx`, `WorkflowsList.tsx`; `FloatingKataWindow.tsx`; analytics
`MetricsGrid.tsx`, `AnalyticsWidget.tsx`, `OverviewView.tsx`, `EfficiencyView.tsx`,
`ExtendedSessionsModal.tsx`, `DonutChartWidget.tsx`, `PieChartWidget.tsx`; `UsersManagementPage.tsx`,
`UsersManagementFilters.tsx`; `OnboardingToursSection.tsx`; `AutoPopupManager.tsx`

**Steps:** card footers wrap; empty states without large margins; kata window width clamped to the
screen; metric tiles 2 columns, charts stacked; user filters in a grid; tours neither auto-started nor
offered on mobile (first visits stay pending).

## Task 9 — Global styles and login

**Files:** `index.html`, `src/assets/stylesheets/main.scss`, `StandaloneLayout.tsx`

**Steps:** `interactive-widget=resizes-content`; `100dvh` app height; 16px fields on touch screens
< 1024px; login logo and form fit phones.

---

## Review fix-up (code review round 2)

Resolved CR-009, CR-011, CR-012, CR-016, CR-018, CR-019, CR-020 and CR-021 (Tasks 3, 5, 6 and 8 above).
The remaining findings are recorded in `code-review-check.json` with their rationale.

## Sonar and coverage fix-up (MR pipeline)

- **Accessibility findings** (click handlers on non-interactive elements) in `Card.tsx`,
  `Navigation.tsx` and `TableCardList.tsx`:
  - Card's clickable element is back to its `main` version; the mobile auto height moved to the
    `h-card` token (`var(--card-height, 158px)`, set to `auto` below `lg` in `main.scss`).
  - The navigation menu's click delegation was redundant: every item navigates, and the top bar closes
    the overlays on any navigation, including a same-URL one.
  - Selectable cards use a real `<button>` under the content instead of a click handler on `<li>`.
    Tables with a selection column select through its checkbox.
- **Coverage on new code:** unit tests for the mobile layout (`mockMobileLayout()` helper in
  `src/test-utils/mobileLayout.ts`) cover the hook, the shell state, the top bar, the card mode and the
  mobile branches of Navigation, Sidebar, WorkflowExecutions, ChatConfiguration and AutoPopupManager.
  They take the estimated new-code coverage from ~46% to ~88%.

## Remaining review findings (compliance report)

The compliance bot reads the review record, so the six findings left open were fixed rather than
kept as known limitations:

- **CR-001, CR-003:** `FloatingKataWindow.tsx` re-measures the viewport on resize and rotation, caps
  width and height at the screen minus 16px, and clamps the saved position into view. Desktop screens of
  at least 516×666 keep the same numbers.
- **CR-002:** new `FloatingKataWindow.test.tsx`.
- **CR-005:** mobile overlays leave Escape to a focused dialog, menu or list box (`isNestedLayerFocused`
  in `src/utils/mobileOverlay.ts`).
- **CR-007:** the content behind an open overlay is inert — `inert` on App's content area under the
  navigation menu, `makeContentBehindInert` in `useMobileSidebar` for page sidebars.
- **CR-017:** `usePromptFilesHandoff` hands the prompt's uploaded attachments across a layout switch.
  `ChatPrompt` gains optional `initialFiles` / `onFilesChange` props.

## Sonar fix-up (second MR pipeline)

- **S6819** ("prefer the tag over the ARIA role") on the two `.tsx` tests added for CR-005: they focus
  a native `<dialog>` instead of a `div` with `role="dialog"`, and `isNestedLayerFocused` matches native
  dialogs as well. No app code renders a native `<dialog>`, so runtime behaviour is unchanged.

## Verification

- Gates: see `gate-run.json`.
- Browser (`http://localhost:5173`): 375×812, 360×740, 768×1024 and 1440×900, light and dark themes.
  Horizontal-overflow audit on ~21 routes; the flows in the QA guide below; desktop regression checks
  (DOM structure, classes, sizes) at 1440×900.

## QA guide

1. Phone width (375px): every page shows the top bar; the section switcher opens the navigation, the
   left button opens the page sidebar; both close on navigation and Escape.
2. Chats: new chat, send, stop, chat menu (pin, rename, move, delete), search, edit a message, share,
   usage details, configuration overlay; with the configuration open, pick another chat from the chat
   list — that chat is shown.
3. Assistants: list, card menu, details, create and edit forms.
4. Data sources: cards; "Sort by Created/Updated" changes the order.
5. Settings → Users (admin): "Select all" selects every card; expanding a card and tapping inside the
   expanded area does not select it.
6. Workflow execution: the history opens from the top bar; picking an execution closes it.
7. Katas, Analytics, Help (no tours section), login and sign-up pages fit the screen.
8. Chat at desktop width: collapse the chat list, narrow the window below 1024px and widen it again —
   the list stays collapsed. Open the configuration on mobile, widen — it opens as the side panel.
9. Desktop (>= 1024px): everything looks and behaves as on `main`.
