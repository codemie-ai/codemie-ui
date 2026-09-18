# Technical Research

**Task**: configuration sidebar focus accessibility keyboard
**Generated**: 2026-08-20T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8436: Fix incorrect focus order when the Configuration sidebar is opened. Bug: After activating the Configuration button, Tab navigation goes to Chat interactive elements instead of the Configuration sidebar content. Expected: When Configuration sidebar expands, keyboard focus should move into the sidebar first, then Tab through its interactive elements. This is a WCAG 2.4.3 Focus Order accessibility issue.

---

## 2. Codebase Findings

### Existing Implementations

**Configuration sidebar component:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx` — Renders `<aside id="chat-configuration-panel">`. When `isConfigVisible` is true, shows either `ChatConfigAssistantForm` or the General settings view. No `useRef`, `focus()`, `autoFocus`, `tabIndex`, or `useFocusOnVisible` call anywhere in this file. This is the root cause location.

**Toggle button:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/chat/components/ChatHeader/ChatHeader.tsx` (lines 190–204) — Renders a `<Button>` with `aria-expanded={isConfigVisible}` and `aria-controls="chat-configuration-panel"`. Calls `attemptToggleConfigVisibility()` from `useChatContext`. The button also has an avatar click path (line 83) that calls the same toggle function.

**State and toggle logic:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/chat/hooks/useChatConfiguration.tsx` — `toggleConfigVisibility` (line 157) calls `setIsConfigVisible(prev => !prev)`. `attemptToggleConfigVisibility` is an alias. `closeConfig` forces `false`. None of these functions contain focus side-effects.

**Panel resize hook:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/chat/components/ChatConfiguration/useChatConfigResize.ts` — When `isConfigVisible` becomes `true`, calls `panel.resize(CHAT_CONFIG_DEFAULT_WIDTH)` (384 px) to expand the react-resizable-panels panel. Purely geometric; no focus logic.

**Child components inside the sidebar (all under `ChatConfiguration/`):**
- `ChatConfigLlmSelector.tsx` — LLM model dropdown; first meaningful interactive element in the general view
- `ChatConfigSkillsSelector.tsx` — multi-select skills
- `ChatConfigImageGeneration.tsx` — image generation toggle
- `ChatConfigHideToolOutputs.tsx` — hide tool outputs toggle
- `ChatConfigAssistants/ChatConfigAssistants.tsx` + `ChatConfigAssistantCard.tsx` — assistant list
- `ChatConfigAssistants/ChatConfigAssistantForm.tsx` — assistant config form (rendered when `isConfigFormVisible` is true)

**Reusable focus hooks already in the project:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/hooks/useFocusOnVisible.ts` — calls `ref.current?.focus()` in a `setTimeout(..., delay)` (default 100 ms) whenever `isVisible` flips to `true`. Accepts any `HTMLElement` ref. Used today by `useMCPServerModal.ts` and `useMarketplaceModal.ts` for modal inputs.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/hooks/useFocusTrap.ts` — traps Tab/Shift+Tab inside a container ref while `isActive` is true. Exports `FOCUSABLE_SELECTOR`. Used by `NavigationProfile.tsx` for its overlay panel.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/hooks/useEscapeKey.ts` — fires a callback on Escape while active; used alongside `useFocusTrap` in the modal hook patterns.

### Architecture and Layers Affected

**Layout (ChatPage.tsx):**
```
ChatPage
└── Group (horizontal — react-resizable-panels)
    ├── Panel#chat-sidebar-panel → ChatSidebar
    ├── ResizableSeparator
    └── Panel#chat-main-content
        └── PageLayout (ChatHeader in renderHeader slot)
            └── Group (horizontal)
                ├── Panel#chat-area         ← Chat history + ChatPrompt
                ├── ChatConfigResizableSeparator
                └── Panel#chat-config (defaultSize=0, collapsible)
                    └── ChatConfiguration  ← the sidebar
```

The Configuration sidebar (`Panel#chat-config`) is a **DOM sibling after** `Panel#chat-area`. The toggle button lives in `ChatHeader`, which is rendered above both panels. In source-order tab navigation: header button → chat-area content (next DOM sibling) → sidebar content (last DOM sibling). When the button fires and focus stays on the button, the next Tab keystroke lands inside `Panel#chat-area` rather than `Panel#chat-config`.

**Layers touched by this fix:**
- **Component / Presentation layer** — `ChatConfiguration.tsx` (add `useRef` + call `useFocusOnVisible`)
- **Hooks layer** — `useFocusOnVisible` is consumed as-is; no changes needed
- **Context / State layer** — `useChatConfiguration.tsx` is NOT changed; `isConfigVisible` is the existing trigger

### Integration Points

- `useChatContext()` exposes `isConfigVisible` — this is the boolean trigger for `useFocusOnVisible`
- `react-resizable-panels` controls the physical width of `Panel#chat-config`; `useChatConfigResize` runs a `useEffect` on `isConfigVisible` to call `panel.resize()`. The 100 ms default delay in `useFocusOnVisible` comfortably clears this geometry update before focus is called.
- `ChatHeader` toggle button has `aria-expanded` and `aria-controls` already wired to the panel's `id="chat-configuration-panel"` — no ARIA changes needed.
- No external service, store subscription, or API call is involved.

### Patterns and Conventions

Per `.ai-run/guides/patterns/accessibility-patterns.md` lines 98–138, the codebase defines three focus-management patterns:

1. **Auto-focus on open** — use `useFocusOnVisible(ref, visible)` targeting the first meaningful element.
2. **Restore focus on close** — capture `document.activeElement` at open time; call `.focus()` on it at close time. For non-Popup panels this must be done manually (guide lines 122–130).
3. **Focus on error** — `tabIndex={-1}` on error container, then `ref.current?.focus()` in an effect.

The sidebar is non-modal (user must still be able to Tab back to chat area), so `useFocusTrap` is **not appropriate** here. Only Pattern 1 and Pattern 2 apply.

The reference implementation for a sidebar (non-modal) is the `NavigationProfile.tsx` OverlayPanel pattern, which pairs `useFocusTrap` + first-focusable query. However, for a non-modal sidebar the simpler `useFocusOnVisible` path used by modal hooks is correct and sufficient.

The `<aside>` element does not need to be made user-tabbable (`tabIndex={0}`) if focus is moved to the first interactive descendant. Alternatively, `tabIndex={-1}` on the `<aside>` allows programmatic focus to the container without adding it to the natural tab order.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/.ai-run/guides/patterns/accessibility-patterns.md` — directly covers this scenario (WCAG 2.4.3 Focus Order), defines `useFocusOnVisible` as the canonical pattern for focus-on-open, and defines the manual focus-restore pattern for custom panels/sidebars.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/.ai-run/guides/patterns/custom-hooks.md` — documents `useFocusOnVisible`, `useFocusTrap`, and `useEscapeKey` in the "Available Global Hooks" table.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/.ai-run/guides/components/component-patterns.md` — covers general component construction; no sidebar-specific focus guidance beyond what the accessibility guide states.

### Architectural Decisions

- `Popup` (`<Dialog>`) deliberately sets `focusOnShow={false}` — the project owns focus management via `useFocusOnVisible` rather than delegating to PrimeReact's built-in auto-focus. This confirms the fix should apply `useFocusOnVisible` in `ChatConfiguration.tsx` rather than reaching into any PrimeReact primitive.
- The `NavigationProfile.tsx` implementation uses `aria-hidden` on the rest of the app while its panel is open (modal-style). This pattern is explicitly **not** needed for the Configuration sidebar since it is a non-modal side panel.

### Derived Conventions

- Focus-on-open always goes through `useFocusOnVisible` (never `autoFocus` attribute or imperative `ref.current.focus()` in component body).
- A 100 ms delay is the project default; it is sufficient to clear the `react-resizable-panels` resize animation.
- Focus restore on close is a manual pattern using `useRef` to save `document.activeElement` at the moment the panel opens.
- The first focusable element receives focus (not the container itself), unless there are no interactive descendants (in which case `tabIndex={-1}` on the container is used).

---

## 4. Testing Landscape

### Existing Coverage

Seven test files exist under `src/pages/chat/components/ChatConfiguration/__tests__/`:

| File | Coverage |
|---|---|
| `ChatConfiguration.test.tsx` | Expand/collapse visibility, general settings rendering, view transitions (General ↔ AssistantForm), loading state |
| `ChatConfigAssistantCard.test.tsx` | Assistant card rendering, copy buttons, edit permission |
| `ChatConfigAssistantForm.test.tsx` | AssistantForm within sidebar |
| `ChatConfigAssistants.test.tsx` | Assistant list section |
| `ChatConfigLlmSelector.test.tsx` | LLM model selector |
| `chatConfigWidth.test.ts` | Pure constant assertions |
| `useChatConfigResize.test.ts` | Resize hook unit tests |

None of these files import `userEvent`, fire keyboard events, or make `toHaveFocus()` assertions. The sidebar has **zero keyboard behavior tests**.

### Testing Framework and Patterns

- **Runner**: Vitest 1.6.1 with two workspace projects — `unit` (jsdom, no real stores) and `integration` (custom env, real stores, mocked fetch)
- **DOM interaction**: `@testing-library/react` + `@testing-library/user-event` 14.6.1
- **Matchers**: `@testing-library/jest-dom` (e.g. `toBeInTheDocument`, `toHaveFocus`, `toHaveAttribute`)
- **Keyboard test pattern** (established in `ChatSidebarLists.keyboard.test.tsx`): `userEvent.setup()` + `element.focus()` + `user.keyboard('{Tab}')` / `user.keyboard('{Enter}')` + `expect(el).toHaveFocus()`
- **No automated axe/jest-axe scanning** — all accessibility assertions are manual ARIA attribute checks or focus assertions

### Coverage Gaps

1. **No test verifies focus moves into the sidebar when `isConfigVisible` transitions from `false` to `true`** — this is the specific gap this bug exposes.
2. **No test verifies focus returns to the toggle button when the sidebar closes.**
3. **No test keyboard-navigates from the toggle button through the sidebar's interactive elements** (LLM selector, toggles, assistant list items).
4. **The `ChatConfigAssistantForm` view-switch has no focus test** — when `isConfigFormVisible` flips to `true`, no test checks that focus moves to the form.
5. **No axe/automated WCAG scan** covers the sidebar.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are read by `ChatConfiguration.tsx`, `useChatConfiguration.tsx`, or `useChatConfigResize.ts`. The feature is purely state-driven via `useChatContext()`.

### Configuration Files

- `vitest.workspace.ts` — defines `unit` and `integration` test projects; the fix's tests will live in the `unit` project (jsdom, mocked stores)
- No feature flags govern this component. `useFeatureFlag` is mocked to `[false, true]` in `ChatConfiguration.test.tsx` — this appears to control skills selector visibility, not the sidebar's open/close behavior.

### Feature Flags and Deployment Concerns

No deployment changes required. This fix is entirely within the React component tree. No `window._env_` or `import.meta.env.VITE_*` variables are involved.

---

## 6. Risk Indicators

- **No existing keyboard or focus tests for ChatConfiguration** — new tests must be written from scratch; there is no prior pattern in this file to extend.
- **`useFocusOnVisible` targets a specific element ref** — if the first focusable descendant is conditionally rendered (e.g. LLM selector hidden when `assistantFeatures.modelSelector` is false), pointing the ref to the `<aside>` container with `tabIndex={-1}` is the safer fallback.
- **Two entry points open the sidebar** — the "Configuration" button in `ChatHeader` and the avatar click at `ChatHeader.tsx` line 83. Both call `attemptToggleConfigVisibility()`. Focus restore on close must target whichever element last opened it. A `useRef` saved at toggle time is needed.
- **Panel animation timing** — `useChatConfigResize` calls `panel.resize()` in a `useEffect` on `isConfigVisible`. This runs synchronously in the same render cycle. The 100 ms delay in `useFocusOnVisible` should be sufficient, but if the panel resize has any async callback, a race condition is possible.
- **`isConfigFormVisible` transition** — when the user opens an assistant's config form inside the sidebar (`isConfigFormVisible` = true), focus also does not move to that form. This is a second focus-order issue within the same component tree, adjacent to the primary bug. The fix pattern should address or at least not regress this case.
- **No automated WCAG scanning** — `jest-axe` or `@axe-core/react` is absent. Any future accessibility regression in this component will only be caught by manual assertion tests.
- **`ChatConfiguration.test.tsx` mocks are tightly coupled** — the test file uses `vi.hoisted` with deeply nested store mocks. New keyboard tests must reuse the same mock setup, increasing mock maintenance burden.

---

## 7. Summary for Complexity Assessment

This is a focused, well-bounded accessibility fix touching one component layer. The primary change site is `ChatConfiguration.tsx` — a 71-line component that renders an `<aside>` panel. The fix requires adding one `useRef<HTMLElement>`, one call to the already-available `useFocusOnVisible` hook, and optionally a `tabIndex={-1}` on the `<aside>` container. A secondary concern is focus restore on close: capturing `document.activeElement` at open time and restoring it when `isConfigVisible` flips back to `false`. The codebase's accessibility guide explicitly prescribes both patterns for non-modal panels; no architectural novelty is introduced. The fix is fully self-contained within `src/pages/chat/components/ChatConfiguration/` and the existing hooks under `src/hooks/`. No store changes, no API changes, and no layout restructuring are needed. Estimated file change surface: 1–2 files (ChatConfiguration.tsx; optionally useChatConfiguration.tsx if the restore logic is moved to the hook).

The affected area has zero keyboard behavior tests. New unit tests are needed to assert (a) focus moves to the sidebar/its first interactive element when `isConfigVisible` transitions to `true`, and (b) focus returns to the trigger button when `isConfigVisible` transitions to `false`. The testing framework, mocking infrastructure, and keyboard test pattern (`userEvent.setup()` + `.focus()` + `user.keyboard()` + `toHaveFocus()`) are all already established in adjacent test files in the same chat components directory. Writing these tests requires familiarity with the deeply nested `vi.hoisted` mock pattern in `ChatConfiguration.test.tsx`.

Key risk factors: (1) the two opening triggers (Configuration button and avatar click) mean focus restore needs to track the last active element dynamically; (2) the `isConfigFormVisible` sub-view inside the sidebar is a second focus-order gap that should be addressed to avoid a follow-up ticket; (3) the absence of axe-based scanning means test coverage depends entirely on hand-written assertions — there is no automated safety net for future regressions.
