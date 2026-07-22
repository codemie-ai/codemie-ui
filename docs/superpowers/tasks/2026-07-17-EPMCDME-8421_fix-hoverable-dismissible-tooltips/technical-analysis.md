# Technical Research

**Task**: tooltip hover dismiss accessibility button
**Generated**: 2026-07-17T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-8421: Fix tooltips so they remain visible when the user moves the cursor onto the tooltip itself (hoverable) and can be dismissed by pressing the Esc key. The bug affects many places: Hide/Open Sidebar button, Workflows/Applications sidebar toggle, Chats button group (Execution info, Share Chat, Export Chat, Clear Chat), AI/Run Chatbot image buttons, chatbot containers in Configuration sidebar, message action buttons (Copy, Edit, Resend, Delete), and Attach file button.

---

## 2. Codebase Findings

### Existing Implementations

Two completely independent tooltip systems coexist:

**System 1 — `react-tooltip` global singleton (affects the majority of bug-reported sites)**

- `src/utils/tooltip.ts` — `setupGlobalTooltip()` creates a single `<Tooltip id="react-tooltip">` React root in a `div#react-tooltip-container` appended to `document.body` at app bootstrap. Current config:
  ```ts
  React.createElement(Tooltip, {
    id: 'react-tooltip',
    arrowColor: 'transparent',
    openEvents: { mouseover: true },
    className: 'z-[10000] max-w-[500px] ...',
  })
  ```
  - `clickable` prop is **absent** → tooltip closes the moment cursor leaves the anchor element; hovering onto the tooltip itself is impossible.
  - `globalCloseEvents` is **absent** → Esc key does nothing.

- Buttons opt in via HTML data attributes on whatever element they render:
  - `data-tooltip-id="react-tooltip"` — binds to the singleton
  - `data-tooltip-content="..."` — tooltip text
  - `data-tooltip-place="..."` — optional placement override
  - `data-tooltip-delay-show={N}` — optional per-anchor show delay

**System 2 — PrimeReact `primereact/tooltip` (form components and some AssistantCard UIs)**

- `src/components/Tooltip/Tooltip.tsx` — a thin `forwardRef` wrapper around `PrimeTooltip` with defaults: `showDelay: 500`, `updateDelay: 500`, `appendTo: 'self'`, custom `pt` for styling.
- Activated via `data-pr-tooltip` + `data-pr-position` on target elements, or a CSS `target` prop.
- PrimeReact tooltip has no built-in hoverable (interactive) mode. It hides on `mouseleave` of the anchor.
- Used by: `src/components/form/RadioButton/RadioButton.tsx`, form field info icons, and likely AssistantCard chatbot containers.

**System 3 — `@floating-ui/react` (isolated, already correct pattern)**

- `src/pages/chat/components/ChatPrompt/ChatPromptFileUpload.tsx` uses `useHover` + `useDismiss` from `@floating-ui/react` for the overflow file badge — this is the correct hoverable + Esc pattern already present in the codebase. The Attach file button itself still uses the react-tooltip data attribute.

### Architecture and Layers Affected

- **UI / Shared Utility layer**: `src/utils/tooltip.ts` — the single choke-point for all react-tooltip behavior.
- **Shared Component layer**: `src/components/Tooltip/Tooltip.tsx` — PrimeReact wrapper; `src/components/Sidebar/SidebarToggle.tsx` — sidebar toggle.
- **Feature / Page layer**: Chat header buttons, chat message action buttons, file upload component.

### Integration Points

Affected files and their current tooltip mechanism:

| Area | File | Mechanism |
|---|---|---|
| Hide/Open Sidebar button | `src/components/Sidebar/SidebarToggle.tsx` | `data-tooltip-id="react-tooltip"`, content `"Toggle Sidebar (Ctrl + B)"`, place `"right"` |
| Workflows/Applications sidebar toggle | `src/pages/workflows/details/WorkflowExecutions/WorkflowExecutions.tsx` | Renders `<SidebarToggle />` — same mechanism |
| Share Chat button | `src/pages/chat/components/ChatHeader/ChatHeaderShareButton/ChatHeaderShareButton.tsx` | `data-tooltip-id="react-tooltip"`, content `"Share Chat"` |
| Export Conversation button | `src/pages/chat/components/ChatHeader/ChatHeaderDownloadConversationButton.tsx` | `data-tooltip-id="react-tooltip"`, content blanked to `""` when overlay is open |
| Clear Chat button | `src/pages/chat/components/ChatHeader/ChatHeaderClearButton.tsx` | `data-tooltip-id="react-tooltip"`, content `"Clear Chat"` |
| Message action buttons (Copy, Edit, Resend, Delete, Confirm, Cancel) | `src/pages/chat/components/ChatHistory/ChatMessageAction.tsx` | `data-tooltip-id="react-tooltip"`, `data-tooltip-delay-show={200}`, content = `label` prop, place `"top"` — single shared component |
| Attach file button | `src/pages/chat/components/ChatPrompt/ChatPromptFileUpload.tsx` | `data-tooltip-id="react-tooltip"`, content = `tooltipContent` prop |
| Execution info button | `src/components/DataOverlayButton/DataOverlayButton.tsx` | `data-tooltip-id="react-tooltip"`, content `"Usage Details"` |
| AI/Run Chatbot image buttons, chatbot containers (Configuration sidebar) | Not confirmed — `AssistantCard` uses PrimeReact `data-pr-tooltip`; these areas were not surfaced by codegraph and may use PrimeReact or another mechanism |

### Patterns and Conventions

- The dominant pattern is data-attribute opt-in to the global react-tooltip singleton: add `data-tooltip-id="react-tooltip"` + `data-tooltip-content` to any element and the global singleton picks it up automatically.
- PrimeReact tooltips are used in form components where the `Tooltip.tsx` wrapper is explicitly mounted with a `target` selector.
- `@floating-ui/react` with `useHover` + `useDismiss` is used in one place (`ChatPromptFileUpload`) and represents the most correct accessibility pattern in the repo.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No `.ai-run/guides/` entries specifically covering tooltip patterns were found. The AGENTS.md table covers API, architecture, testing, etc. — tooltip/accessibility is not a documented guide category.

### Architectural Decisions

None recorded (no ADRs or inline DECISION/NOTE comments surfaced for tooltip behavior).

### Derived Conventions

- Global react-tooltip singleton (`src/utils/tooltip.ts`) is the intentional app-wide tooltip infrastructure for icon buttons.
- PrimeReact tooltip is for form-field help text that needs to be co-located with its target in the DOM (`appendTo: 'self'`).
- `@floating-ui/react` is present and used, but not yet established as the standard for button tooltips.

---

## 4. Testing Landscape

### Existing Coverage

- `TooltipButton` — 20+ callers, **no covering tests found** (codegraph blast-radius warning).
- `SidebarToggle`, `ChatMessageAction`, `ChatHeaderShareButton`, `ChatHeaderClearButton`, `ChatHeaderDownloadConversationButton`, `ChatPromptFileUpload` — no test files surfaced for these components by codegraph.

### Testing Framework and Patterns

Based on AGENTS.md: vitest + React Testing Library. Testing patterns and fixture conventions are documented in `.ai-run/guides/testing/testing-patterns.md`.

### Coverage Gaps

- No existing tests for any of the directly affected button components.
- No tests for `src/utils/tooltip.ts` or `setupGlobalTooltip()`.
- The hoverable behavior and Esc dismiss would need new integration-level tests (RTL + user-event keyboard simulation) — currently none exist for this domain.

---

## 5. Configuration and Environment

### Environment Variables

None found specifically for tooltip behavior or accessibility configuration.

### Configuration Files

- `src/utils/tooltip.ts` — functions as the runtime configuration point for the global react-tooltip singleton. All tooltip-wide behavior changes go here.
- `package.json` — needs inspection to confirm react-tooltip version (v5+ required for `globalCloseEvents` API).

### Feature Flags and Deployment Concerns

None found for tooltip or accessibility behavior.

---

## 6. Risk Indicators

- **react-tooltip version unverified**: `globalCloseEvents` and `clickable` in the required form are v5+ APIs. The installed version must be confirmed in `package.json` before relying on them. If the project is on v4, the API surface differs significantly.
- **Single-edit, broad blast radius**: Adding `clickable: true` and `globalCloseEvents={{ escape: true }}` to `setupGlobalTooltip()` in `src/utils/tooltip.ts` fixes all react-tooltip sites simultaneously. This is efficient but means any unintended side effect affects every tooltip in the app (20+ TooltipButton callers + all button sites).
- **`ChatHeaderDownloadConversationButton` workaround conflict**: This button intentionally sets `data-tooltip-content=""` when its overlay is open to suppress the tooltip. With `clickable: true`, the tooltip may render with empty content (visible but blank) rather than simply not appearing. The existing suppression logic may need updating.
- **AI/Run Chatbot image buttons and chatbot containers in Configuration sidebar are unresolved**: These were not surfaced by codegraph. If they use PrimeReact `data-pr-tooltip` (as `AssistantCard` does), the react-tooltip singleton fix does NOT cover them. PrimeReact's tooltip has no hoverable mode — fixing those specific areas would require either switching them to react-tooltip data attributes or implementing a floating-ui–based solution.
- **No existing test coverage** for any affected component — the fix lands in untested territory; regression risk cannot be caught by existing test suite.
- **PrimeReact tooltip has no Esc dismiss or hoverable mode**: `src/components/Tooltip/Tooltip.tsx` wrapper would need a keyboard event handler or a migration to a different library if PrimeReact tooltips are in scope.
- **`@floating-ui/react` already imported** in `ChatPromptFileUpload` — if the team decides to standardize on floating-ui for all button tooltips (proper accessible solution), the dependency is already present but adoption would require extracting a reusable hook/component and migrating all affected buttons.

---

## 7. Summary for Complexity Assessment

The task touches two distinct layers: the shared utility layer (`src/utils/tooltip.ts` — the global react-tooltip singleton) and the individual feature components that consume it via data attributes. For the majority of reported sites (SidebarToggle, all ChatHeader buttons, ChatMessageAction, DataOverlayButton, ChatPromptFileUpload attach button), the fix is a **single-file change** to `setupGlobalTooltip()`: add `clickable: true` and `globalCloseEvents={{ escape: true }}` to the singleton's props. This single edit propagates to all react-tooltip consumers with no per-component changes required, making the core fix mechanically simple. However, two sites remain uncertain — "AI/Run Chatbot image buttons" and "chatbot containers in Configuration sidebar" — which appear to use PrimeReact tooltips rather than the global singleton, and PrimeReact has no hoverable or keyboard-dismiss mode. Those areas may require either migrating individual instances to react-tooltip data attributes or extracting a floating-ui hook, adding moderate complexity.

Technical novelty is low: both `clickable` and `globalCloseEvents` are documented react-tooltip v5 props. The risk surface is the version check (must be v5+) and the `ChatHeaderDownloadConversationButton` empty-content workaround that may behave unexpectedly with `clickable: true`. The `@floating-ui/react` dependency is already present if a deeper accessibility refactor is preferred, but it would expand scope significantly — migrating all button tooltips to floating-ui would touch 8+ files versus 1.

Test coverage posture is poor: no existing tests cover any of the affected components or the tooltip utility. The fix is small enough that manual verification may be acceptable for the react-tooltip path, but the unresolved PrimeReact areas and the download-button workaround both represent regression risks that currently have no automated safety net. The complexity-assessor should weight the unresolved areas and testing debt as moderate risk factors.
