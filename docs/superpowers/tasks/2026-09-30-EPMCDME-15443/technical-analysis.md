# Technical Research

**Task**: chats sidebar keyboard accessibility
**Generated**: 2026-09-30
**Research path**: filesystem

---

## 1. Original Context

Summary
The options popup opened from the More options button near a chat link in the Chats Sidebar cannot be navigated using the Tab key. As a result, keyboard users cannot reach the Pin option and cannot pin the chat.

Description
When the user activates the More options button for a chat in the Chats Sidebar, the opened options popup should support keyboard navigation. Currently, after the popup is activated, the user cannot navigate through its options using the Tab key, which prevents selecting the Pin option.

This defect blocks validation and resolution of EPMCDME-8432, because that issue requires navigating to the Pin option and activating it.

Preconditions
The user is authorized in CodeMie.
The user has at least one chat available in the Chats Sidebar.
Keyboard navigation is used.
NVDA is turned on.
Steps to Reproduce
Open https://codemie.lab.epam.com/#/.
Using the Tab key, navigate to the More options button near any chat link in the Chats Sidebar.
Activate the More options button.
Try to navigate through the opened options popup using the Tab key.
Try to reach and activate the Pin option.
Expected Result
The options popup receives keyboard focus after activation.
The user can navigate through all options in the popup using the Tab key.
The Pin option is reachable and can be activated using the keyboard.
Keyboard focus is visible and follows the expected focus order.
Actual Result
After the options popup is activated, it is not possible to navigate through the popup options using the Tab key.
The Pin option cannot be reached.
The user cannot pin the chat using keyboard navigation.
Affected Areas
Chats Sidebar
Chat link More options popup
Keyboard navigation
Accessibility
Focus management
Pin chat action
Acceptance Criteria
After activating the More options button near a chat link, keyboard focus is moved into the opened options popup or to the first actionable option according to the expected focus behavior.
All options inside the popup are reachable using the Tab key.
The Pin option is reachable and can be activated using the keyboard.
Keyboard focus remains visible while navigating through the options popup.
No regression is introduced for closing the popup or returning focus to the invoking More options button.
EPMCDME-8432 can be validated after this defect is fixed.

Ticket EPMCDME-15443. Jira adapter codemie-jira-assistant currently returns HTTP500 after successful auth; user supplied contents authoritative. Named lab URL is reproduction target, no browser work authorized (Stage7 explicit consent needed); record inability to inspect live NVDA/browser without browsing it.

---

## 2. Codebase Findings

### Existing Implementations

- `src/components/NavigationMore/NavigationMore.tsx`: shared options popup. It uses Floating UI positioning, `useClick`, `useDismiss`, optionally `FloatingPortal`, and `useFocusReturn`. There is no initial-focus effect, focus-manager component, or list-navigation hook. Its ordinary actions are native buttons with `role="menuitem"`; href actions are React Router links. Hidden actions are filtered, dividers are noninteractive, and disabled button actions use native `disabled`.
- `src/pages/chat/components/ChatSidebar/ChatList/ChatListItemContextMenu.tsx`: creates the chat actions in DOM order: Pin/Unpin, folder actions when applicable, Rename, optional Edit assistant, Delete. It always enables `renderInRoot`, `hideOnClickInside`, and right-end placement on `NavigationMore`.
- `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx`: owns the chat-name button, wires its id through `contextId`, suppresses the tooltip while the options popup is open, and calls the store for pinning. After successful pin/unpin, it announces the result and asynchronously focuses the chat-name button. Rename removes the menu trigger while rendering an input and asynchronously focuses that input.
- `src/hooks/useFocusReturn.ts`: restores focus to the supplied trigger whenever its open state changes from true to false, without distinguishing dismissal causes or checking where focus currently resides.
- `src/store/chats.ts:609`: `pinChat` issues `api.put(v1/conversations/${id}, { pinned: !chat.pinned })`, updates the Valtio chat, and updates pin ordering. It does not alter the conversation timestamp.

### Architecture and Layers Affected

Existing path: chat sidebar presentation → shared `NavigationMore` interaction/portal → chat callbacks → Valtio `chatsStore` → centralized API. The observed keyboard defect is in the shared popup's interaction layer. Pin persistence already exists; no new backend endpoint or data model is indicated by the requirements.

### Integration Points

- `NavigationMore` also serves assistants, workflows, folders, tables, and action-only menus throughout the UI; some consumers supply custom `children` rather than generated items.
- Installed `@floating-ui/react` version is 0.27.16. Its local `dist/floating-ui.react.mjs:1580` creates portal tab-order guards only when a focus manager registers an open, nonmodal state. No `FloatingFocusManager` usages were found in `src/`.
- Local library source at approximately line 1990 implements default initial focus by selecting the first tabbable floating descendant. This is implementation evidence from the installed package, not a live-browser verification or a recommended design contract.

### Patterns and Conventions

Components use typed props, hooks, theme-aware Tailwind classes, and Floating UI interaction prop getters. Trigger accessibility already includes contextual naming, `aria-haspopup="menu"`, `aria-expanded`, and open-only `aria-controls`. Items already include focus-ring width utilities and `outline-none`; the configured palette has `border-focus` and `surface-specific-dropdown-focused`, while `primary-500` is not defined in the inspected Tailwind configuration.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md`: Tab/Shift+Tab move among interactive elements; Enter/Space activate buttons; Escape dismisses popups; keyboard focus must be visible. It documents `NavigationMore.contextId` sharing and focus restoration conventions.
- `.ai-run/guides/components/component-patterns.md`: typed React components, handler conventions, and store-only API access.
- `.ai-run/guides/styling/styling-guide.md`: theme tokens, including `border-border-focus` for keyboard focus indicators.
- `.ai-run/guides/quality-gates.md`: individual lint/type-check/license/secrets/test commands and skip policies. Repository AGENTS requires `npm ci` before trusting tests or type-checks and prohibits running/writing tests unless explicitly requested.

### Architectural Decisions

The source deliberately restores chat-name focus after successful pinning and rename-input focus after choosing Rename. `NavigationMore` has shared focus return rather than a per-sidebar implementation. Documentation's React 18 declaration is stale: `package.json` declares React and React DOM 19.2.8; source and manifest take precedence.

### Derived Conventions

The chat menu uses native button activation rather than custom key handlers for each action. Trigger names combine the button's own id with the chat-name id. Custom children can precede or follow generated items, and shared popup changes therefore have a broader behavior surface than the chat's first Pin action alone.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/NavigationMore/__tests__/NavigationMore.test.tsx`: real shared component; list/menu semantics, hidden/disabled items, children, links, dividers, empty-menu triggers, ARIA wiring, portal closure on ancestor scroll, and trigger restoration after Escape.
- `src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx`: ARIA id wiring and chat-name focus/announcements after pin/unpin. It mocks `NavigationMore` into immediately available buttons, so it cannot detect portal or popup focus defects.
- `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.keyboard.test.tsx`: Enter/Space activation for the Create Folder control and accordion behavior; it does not cover chat options.

### Testing Framework and Patterns

Manifest declares Vitest 1.6.1, React Testing Library 16.3.0, and user-event 14.6.1. `vitest.workspace.ts` separates mocked-store unit tests in jsdom from real-store integration tests. Existing NavigationMore tests primarily use `fireEvent`, real Floating UI, and MemoryRouter for links. No tests were run or written in research.

### Coverage Gaps

No located test walks the chat's real portal popup with Tab/Shift+Tab, asserts initial Pin focus, activates Pin with Enter/Space, or checks tab exit behavior. Focus styling assertions check class strings rather than browser rendering. NVDA behavior has no evidence from this research.

---

## 5. Configuration and Environment

### Environment Variables

No environment-variable reads occur in the inspected shared popup or chat-list files. Pinning uses the existing centralized API configuration.

### Configuration Files

`package.json` supplies runtime dependencies and commands. `tailwind.config.ts` defines theme-aware focus tokens. `vitest.workspace.ts` supplies unit/integration environments and their timeout. There is an existing `node_modules` tree, but no gate result was obtained or trusted.

### Feature Flags and Deployment Concerns

The inspected chat action builder does not feature-gate Pin or popup navigation. The defect has no identified dependency, runtime-config, Docker, nginx, schema, or deployment change requirement. Live lab/NVDA inspection awaits Stage 7 consent and a suitable environment.

---

## 6. Risk Indicators

- Shared `NavigationMore` serves portal/inline menus, custom children, disabled links, and other product areas; behavior changes have cross-consumer impact.
- `useFocusReturn` restores every close; existing Rename/modal actions and pin's asynchronous chat-name focus can compete with new focus management.
- Current tests omit actual Tab traversal and mock the shared menu in chat tests.
- `primary-500` focus-color utilities lack a matching configured token; actual themed visibility remains unverified.
- Speculative: portal entry/exit behavior and disabled/custom-content handling need an explicit spec; NVDA/lab validation requires later consent and access.

---

## 7. Summary for Complexity Assessment

The defect centers on shared popup presentation and focus management. ChatListItemContextMenu already renders native actions with Pin first through a FloatingPortal, but NavigationMore has no initial-focus or focus-manager integration. Pin persistence and chat callbacks already exist; no backend or data-model change is indicated.

Existing coverage protects ARIA, item rendering, scroll dismissal, Escape focus return, and post-pin announcements. It does not cover real popup keyboard traversal. Shared consumers, action-specific focus destinations, disabled/custom content, and themed focus visibility are the main risks. Source supports a localized interaction fix, with broader regression considerations because the control is shared.

---

## 8. External References

`https://jiraeu.epam.com/browse/EPMCDME-15443`: unresolved through the configured adapter (HTTP500); the supplied ticket body is authoritative. `https://codemie.lab.epam.com/#/`: reproduction target, not inspected because browser verification awaits consent. EPMCDME-8432 is a stated dependency; its contents were not supplied or fetched.
