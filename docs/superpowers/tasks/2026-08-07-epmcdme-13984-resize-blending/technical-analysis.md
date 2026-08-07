# Technical Research

**Task**: chat resize separator dark-theme tailwind
**Generated**: 2026-08-07T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix the chat input resize handle visibility in dark theme. The resize handle pill (ChatResizableSeparator) blends into the dark background. The fix is to align its dark-theme styling with ChatConfigResizableSeparator which already has proper [.codemieDark_&] overrides using white at varying opacities. Ticket: EPMCDME-13984.

---

## 2. Codebase Findings

### Existing Implementations

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/chat/components/ChatResizableSeparator.tsx`
  — The broken component. A horizontal `react-resizable-panels` `Separator` rendered between chat history and chat prompt panels. The decorative pill div uses `bg-border-subtle/40`, `group-hover:bg-border-subtle/80`, `group-focus-visible:bg-border-subtle`, and `group-focus-visible:ring-2 group-focus-visible:ring-border-subtle/60`. It has **no `[.codemieDark_&]` overrides**, so all states rely entirely on the `border-subtle` design token.

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/chat/components/ChatConfiguration/ChatConfigResizableSeparator.tsx`
  — The reference (working) component. A vertical separator between the chat area and config panel. Its pill div uses `bg-black/20 [.codemieDark_&]:bg-white/25` for the resting state, `group-hover:bg-black/45 [.codemieDark_&]:group-hover:bg-white/50` for hover, and `group-focus-visible:bg-black/60 [.codemieDark_&]:group-focus-visible:bg-white/65 [.codemieDark_&]:group-focus-visible:ring-white/50` for focus. It uses **raw opacity classes** (`black/*` and `white/*`) with explicit `[.codemieDark_&]` Tailwind arbitrary-variant overrides — it does not rely on the `border-subtle` token at all.

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/components/ResizableSeparator/ResizableSeparator.tsx`
  — A generic sidebar/panel separator (used for the sidebar split in `ChatPage`). Uses `bg-black/20` inline without dark-theme overrides. Different use case (not a chat-prompt separator) and is not the subject of this ticket.

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/chat/ChatPage.tsx`
  — Renders both `ChatResizableSeparator` (line 129, inside the vertical `Group` between `chat-history` and `chat-prompt` panels) and `ChatConfigResizableSeparator` (line 142, between `chat-area` and `chat-config` panels).

### Architecture and Layers Affected

**UI Component Layer only.** This is a single-file presentational fix with no service, state, or API involvement.

- `ChatResizableSeparator` is a zero-prop, zero-state presentational component. It renders a `Separator` from `react-resizable-panels` with a decorative `<div>` pill inside.
- The component sits inside a vertical `PanelGroup` in `ChatPage`, controlled by `useChatPromptResize` which persists layout sizing to localStorage. The separator itself does not participate in any state logic.

### Integration Points

- `react-resizable-panels` — provides the `Separator` primitive. The library manages `aria-valuenow/min/max` and keyboard event handling (`↑/↓` arrow keys) automatically on the separator element. The class customisation is purely cosmetic.
- `tailwindcss-themer` — provides the `[.codemieDark_&]` arbitrary variant mechanism. The `codemieDark` class is applied to the root element by the theme switcher and enables scoped dark-theme overrides via this selector pattern.
- No external services, no API calls, no store reads are involved.

### Patterns and Conventions

**The established pattern for dark-theme-aware separator pills** is demonstrated in `ChatConfigResizableSeparator`:

1. Use `bg-black/<opacity>` as the default (light-theme-friendly) pill colour.
2. Layer `[.codemieDark_&]:bg-white/<opacity>` as the dark-theme override on the same element.
3. Repeat for hover (`group-hover:`) and focus-visible (`group-focus-visible:`) states.
4. For focus ring, override `ring-black/<opacity>` with `[.codemieDark_&]:ring-white/<opacity>`.

The separator pill dimensions differ between the two components (orientation-appropriate):
- `ChatConfigResizableSeparator`: vertical pill, `h-10 w-1`, hover → `h-12`, focus → `w-[3px]`.
- `ChatResizableSeparator`: horizontal pill, `w-10 h-1`, hover → `w-12`, focus → `h-[3px]`.

The fix must preserve the horizontal pill geometry while substituting the broken token-based colour approach for the same `black/*/white/*` opacity pattern as the reference.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` directory exists. No guide specifically covers separator or resize-handle styling. The task is narrow enough that guide consultation for implementation is not required beyond confirming the project uses `tailwindcss-themer` with `[.codemieDark_&]` as the dark-theme variant pattern.

### Architectural Decisions

- **`tailwindcss-themer` over CSS variables for component-level dark overrides**: The `tailwind.config.ts` uses `tailwindcss-themer` with a `codemieDark` named theme (line 636). The dark mode override is explicitly NOT Tailwind's built-in `dark:` variant (`darkMode: ['variant', '.nottused * &']` — a disabled/stub entry on line 501). All dark-theme styling must use `[.codemieDark_&]:` arbitrary variant selectors.
- **Design tokens vs raw opacity colours for separators**: `ChatConfigResizableSeparator` deliberately avoids the semantic `border-*` token family in favour of raw `black/white` opacity classes. This is intentional: the token `border-subtle` resolves to `neutral-700` (#4C4C4C) in dark theme (see `tailwind.config.ts` line 318: `subtle: [c['neutral']['700'], c['neutral']['475']]`), which blends against the chat background `surface-base-chat` = `neutral-900` (#1C1C1C). Using `white/25` in dark theme produces a clearly visible light grey pill.

### Derived Conventions

- Arbitrary-variant syntax for dark overrides: `[.codemieDark_&]:` prefix applied directly on the class needing the override.
- Group interaction states are written as compound classes: `group-hover:bg-black/45 [.codemieDark_&]:group-hover:bg-white/50` — both classes appear on the same element.
- The `codemieDark` name is the canonical dark theme key (`DARK_THEME_KEY = 'codemieDark'` in `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/constants/index.ts` line 67).

---

## 4. Testing Landscape

### Existing Coverage

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/chat/__tests__/ChatPage.test.tsx`
  — Full integration test for `ChatPage`. `ChatResizableSeparator` is **mocked out** at line 154 (`vi.mock('../components/ChatResizableSeparator', () => ({ default: () => <div data-testid="resizable-separator" /> }))`). No visual behaviour of the separator is tested.

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/chat/__tests__/ChatPage.resize.test.tsx`
  — Tests resize panel structure (Group/Panel/Separator presence via `data-` attributes). Does not test separator appearance or dark-theme classes.

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/chat/__tests__/ChatPage.integration.test.tsx`
  — Integration-level test, does not cover separator styling.

No unit test file exists for `ChatResizableSeparator.tsx` directly. No test file exists for `ChatConfigResizableSeparator.tsx`.

### Testing Framework and Patterns

- Vitest + React Testing Library (`@testing-library/react`).
- Heavy use of `vi.mock` for component isolation. Separator components are typically mocked in page-level tests.
- No snapshot tests or visual regression tests observed for separator components.

### Coverage Gaps

- `ChatResizableSeparator` has **no dedicated unit tests**; it is always mocked in page tests.
- `ChatConfigResizableSeparator` has **no dedicated unit tests**.
- Neither component has dark-theme class assertions in any test. This is a gap but it is consistent with the project's pattern of mocking UI primitives at the page-test level.
- The fix itself (class string changes) will not be testable via the existing page-level test suite without adding a dedicated render test that checks class names on the inner pill `div`.

---

## 5. Configuration and Environment

### Environment Variables

None relevant. This is a pure styling change.

### Configuration Files

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/tailwind.config.ts` — defines the `codemieDark` theme via `tailwindcss-themer`, and defines the `border.subtle` token as `[neutral-700 (dark), neutral-475 (light)]`. The fix does not require any changes to this file.

### Feature Flags

None. The dark theme is toggled by a CSS class on the root element; no feature flag gates separator appearance.

---

## 6. Risk Indicators

- **Root cause confirmed — low implementation risk**: `border-subtle` resolves to `#4C4C4C` (neutral-700) in dark theme against a `#1C1C1C` (neutral-900) background, yielding ~2.2:1 contrast — well below the 3:1 minimum for non-text UI components. At `/40` opacity the pill is effectively invisible.
- **No dark-theme overrides in `ChatResizableSeparator`**: All three interactive states (resting, hover, focus-visible) lack `[.codemieDark_&]` counterparts. All three must be addressed in the fix.
- **Focus ring also affected**: The current `group-focus-visible:ring-border-subtle/60` class has the same root cause — a dark-on-dark ring. The fix must include a `[.codemieDark_&]:group-focus-visible:ring-white/50` override (mirroring the reference).
- **`bg-border-subtle` is not the same as `bg-black/20`**: The fix replaces the token-based approach with raw opacity classes. The resting state should become `bg-black/20 [.codemieDark_&]:bg-white/25` (matching the reference's visual weight for a horizontal pill). The existing opacity levels in the broken component (`/40`, `/80`, full, `/60`) are out of step with the reference (`/25`, `/50`, `/65`, `/50`). The implementer should align to the reference's opacity scale rather than trying to map old values to new ones.
- **No existing test guards this**: Adding a test that asserts `[.codemieDark_&]:bg-white/25` appears on the pill `div` would prevent regression, but the project has no precedent for this type of assertion on separator components.
- **`ResizableSeparator` (generic) is also missing dark-theme handling** but is out of scope for EPMCDME-13984.

---

## 7. Summary for Complexity Assessment

The task touches a single presentational UI component (`ChatResizableSeparator.tsx`, 36 lines) with a well-understood, already-solved pattern available as a reference in the adjacent `ChatConfigResizableSeparator.tsx`. The fix involves replacing token-based colour classes (`bg-border-subtle/*`) with raw opacity classes (`bg-black/20`, `bg-white/25`) and adding `[.codemieDark_&]:` overrides for all three interactive states (resting, hover, focus-visible) plus the focus ring. No state management, API, routing, or test infrastructure changes are required. The total change surface is one file, approximately 1 line changed (the className string on the inner pill `div`).

The fix follows an entirely established pattern — no new techniques or patterns are introduced. `ChatConfigResizableSeparator` is a line-for-line structural twin (both wrap a `Separator` with a single pill `div`), differing only in orientation-specific dimension classes. The implementer can model the new className directly from the reference, swapping horizontal/vertical dimension values as appropriate. There is no ambiguity in either the root cause or the intended solution.

Test coverage posture is a minor concern: no unit test currently exercises either separator component's rendered classes, and the page-level tests mock `ChatResizableSeparator` out entirely. The fix will not break any existing tests. Adding a minimal render test asserting the dark-theme class names would be good practice but is not required for the fix to be correct.
