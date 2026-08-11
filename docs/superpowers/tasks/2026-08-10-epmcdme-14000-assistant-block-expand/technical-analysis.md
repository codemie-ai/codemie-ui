# Technical Research

**Task**: dropdown llm-model skills assistant-block expand width configure-test
**Generated**: 2026-08-10T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix bug EPMCDME-14000: assistant blocks (Extra configuration, Interactive features, etc.) in the Configure & Test panel should expand properly. Additionally, fix the 'LLM model' dropdown so it expands to the full container width, matching how the 'Skills' dropdown behaves. In the chat settings panel (Image #2), the LLM Model dropdown appears narrower/fixed-width while Skills dropdown spans the full width of the container. Both should expand to container width.

---

## 2. Codebase Findings

### Existing Implementations

**Configure & Test panel entry point:**
- `/src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx` — the aside panel, renders `ChatConfigAssistantForm` when `isConfigFormVisible` is true, wraps everything in `<div className="flex flex-col w-full pl-2 pr-2 h-full">`
- `/src/pages/chat/components/ChatConfiguration/ChatConfigAssistants/ChatConfigAssistantForm.tsx` — renders `AssistantForm` with `isChatConfig={true}` and `isEditing={true}`

**AssistantForm (the form rendered in Configure & Test):**
- `/src/pages/assistants/components/AssistantForm/AssistantForm.tsx` — top-level form; when `isChatConfig=true`, applies `className="relative flex flex-col gap-y-6 p-6 pb-10 w-full pl-4 pr-2 pt-0 max-w-full"`. Renders `AssistantSetupSection`, `InteractiveFeaturesAccordion`, and several other `Accordion` blocks.

**AssistantSetupSection (contains both bugs):**
- `/src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx`
  - Bug 1 (accordion expand): When `isCompactView=true` (which maps to `isChatConfig`), the outer `Accordion` (title="Assistant Setup") has `className={cn(isCompactView && 'max-w-sm mt-5')}`. The nested `Accordion` (title="Extra configuration") also has `className={cn(isCompactView && 'max-w-sm')}`. The `max-w-sm` (384px) class on the Accordion's root causes the PrimeReact accordion container to be width-constrained. When the content inside is wider than this container, clicking the accordion header does not prevent expansion — but visually the content is clipped/truncated.
  - Bug 2 (LLM model width): Inside "Extra configuration" content (`isCompactView` branch at line 253–316), the `LLMSelector` is rendered inside `<div className={cn('flex flex-col gap-6', !isCompactView && 'w-72')}>`. In compact view this `div` has no fixed width. However the `LLMSelector` component itself (line 124 of `LLMSelector.tsx`) wraps everything in `<div className="flex flex-col gap-2 grow max-w-sm">` — the `max-w-sm` caps the dropdown at 384px regardless of context.

**LLMSelector component (the narrower dropdown):**
- `/src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx`
  - Line 124: `<div className="flex flex-col gap-2 grow max-w-sm">` — `max-w-sm` = 24rem (384px). This is the direct cause of the width constraint. The `MultiSelect` inside inherits this container width.
  - The `className` prop is passed to `MultiSelect` but the outer wrapper always has `max-w-sm`.

**ChatConfigLlmSelector (used in the chat General section):**
- `/src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx` — renders `LLMSelector` with no `className` override, so it inherits the `max-w-sm` wrapper from `LLMSelector.tsx`.

**ChatConfigSkillsSelector (the wider/correct dropdown):**
- `/src/pages/chat/components/ChatConfiguration/ChatConfigSkillsSelector.tsx`
  - Renders `MultiSelect` directly (no `LLMSelector` wrapper): `<div className="mt-6">` → `<MultiSelect ... />`. No `max-w-sm` applied, so the `MultiSelect` expands to the full container width.

**Accordion component (shared, used for all blocks):**
- `/src/components/Accordion/Accordion.tsx`
  - Uses PrimeReact `Accordion` with `transitionOptions={{ unmountOnExit: false, timeout: 0 }}`.
  - The `pt.root` class is `'border rounded-lg border-border-primary bg-surface-base-chat overflow-hidden'`.
  - Content is wrapped in a custom grid-row animation: `<div className={cn('grid transition-[grid-template-rows] duration-300 ease-in-out', activeTabIndex === 0 ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}> <div className="overflow-hidden">`.
  - The `pt.toggleableContent` is set to `() => ''` (empty string), meaning PrimeReact's default `p-toggleable-content` class is replaced with nothing. The actual show/hide animation is driven by the custom grid-rows trick in the children, not by PrimeReact's built-in CSS transition.
  - **The expand bug**: PrimeReact still controls whether the `AccordionTab` content is mounted/shown based on `activeIndex`. With `timeout: 0` and `unmountOnExit: false`, the content is always present in the DOM. The grid-rows animation is applied to the inner wrapper but that inner wrapper is inside PrimeReact's `toggleableContent` div. If PrimeReact adds any inline `display:none` or `overflow:hidden` on the toggleableContent when it thinks the panel is "collapsed", the custom grid animation is hidden. This can cause the accordion to appear to expand (activeIndex changes) but visually the content doesn't appear.

**FormAccordion (used in Configure & Test assistant blocks):**
- `/src/pages/assistants/components/AssistantForm/components/FormAccordion/FormAccordion.tsx` — wraps PrimeReact `Accordion`/`AccordionTab` directly. Sets `pt.root` to `'border rounded-lg border-border-primary bg-surface-base-chat'`. Does NOT use the custom grid-rows trick — relies purely on PrimeReact's default content visibility.
- `/src/pages/assistants/components/AssistantForm/components/FormAccordion/FormNestedAccordion.tsx` — similar, uses PrimeReact directly, `pt.root` includes `overflow-hidden`.

### Architecture and Layers Affected

- **UI Component layer**: `src/components/Accordion/Accordion.tsx`, `src/components/form/MultiSelect/MultiSelect.tsx`
- **Feature component layer (chat config)**: `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx`, `ChatConfigSkillsSelector.tsx`, `ChatConfiguration.tsx`
- **Feature component layer (assistant form)**: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx`, `AssistantSetupSection.tsx`, `LLMSelector.tsx`, `InteractiveFeaturesAccordion.tsx`, `FormAccordion/FormAccordion.tsx`

### Integration Points

- PrimeReact `Accordion`/`AccordionTab` from `primereact/accordion` — the underlying accordion engine
- PrimeReact `MultiSelect` from `primereact/multiselect` — underlying dropdown
- Tailwind CSS utility classes for width/animation control
- `useChatContext` hook (provides `isConfigFormVisible`) — determines when Configure & Test form is shown

### Patterns and Conventions

- The codebase wraps PrimeReact's `Accordion` in a custom `Accordion` component (`src/components/Accordion/Accordion.tsx`) that uses a `grid-rows` CSS animation trick for smooth open/close transitions, bypassing PrimeReact's default CSSTransition. The `pt.toggleableContent` is set to empty string to remove PrimeReact's wrapper class.
- Dropdowns are wrapped in shared `MultiSelect` component. The `LLMSelector` adds its own outer wrapper with `max-w-sm` which is separate from any `className` passed to it.
- The `isChatConfig` flag flows from `ChatConfigAssistantForm` → `AssistantForm` → `AssistantSetupSection` as `isCompactView`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guides found for this specific UI feature area. The `.ai-run/guides/` directory covers backend patterns. Conventions derived from code exploration.

### Architectural Decisions

No recorded ADRs for these components. The grid-rows animation trick in `Accordion.tsx` is inline and undocumented.

### Derived Conventions

- Width classes on form fields follow a pattern of `w-full` for responsive fields, `max-w-sm` when a max cap is desired.
- The `isCompactView` pattern is the established way to pass the "in Configure & Test panel" context to `AssistantSetupSection`.
- Skills dropdown does NOT use `LLMSelector` wrapper — renders `MultiSelect` directly, which is why it is full-width.

---

## 4. Testing Landscape

### Existing Coverage

- `/src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` — covers the assistant form on the New Assistant page; does not appear to cover the Configure & Test panel specifically.
- `/src/pages/chat/components/__tests__/` — chat-level tests exist but no dedicated tests for `ChatConfigLlmSelector` or `ChatConfigSkillsSelector`.
- `/src/components/form/MultiSelect/__tests__/MultiSelect.test.tsx` — unit tests for MultiSelect component.

### Testing Framework and Patterns

- Jest + React Testing Library (based on `src/setupTests.tsx` and integration test patterns)
- Integration tests use `setupTests.integration.ts`

### Coverage Gaps

- No tests for `ChatConfigLlmSelector` or `ChatConfigSkillsSelector` width behavior
- No tests for `AssistantSetupSection` in compact/isChatConfig mode
- No visual regression tests for the `Accordion` expand animation

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this UI bug.

### Configuration Files

None relevant to this UI bug.

### Feature Flags and Deployment Concerns

- `useFeatureFlag('skills')` — Skills dropdown only rendered when this flag is enabled. Not a concern for the fix itself.
- `useInteractiveElementsEnabled()` — Interactive Features accordion only shown when enabled.

---

## 6. Risk Indicators

- **Root cause #1 (LLM model dropdown width)**: `LLMSelector.tsx` line 124 hardcodes `max-w-sm` on the outer wrapper div. This affects all render sites of `LLMSelector` — both the chat config panel (`ChatConfigLlmSelector`) and the "Extra configuration" accordion inside `AssistantSetupSection`. Fix: remove `max-w-sm` from the wrapper, or make it conditional based on a prop. Since `ChatConfigSkillsSelector` renders `MultiSelect` directly without this wrapper and is full-width, the fix should align `LLMSelector` to the same behavior — no max-width cap, let parent/container control width.

- **Root cause #2 (accordion blocks not expanding in Configure & Test)**: The `Accordion` component uses a custom grid-rows animation inside the `AccordionTab` children. PrimeReact's `AccordionTab` renders a `CSSTransition`-wrapped `toggleableContent` div that may apply `display: none` or `overflow: hidden` when `activeIndex` is null. Setting `pt.toggleableContent` to `() => ''` removes PrimeReact's class, but PrimeReact may still apply inline styles. With `transitionOptions={{ timeout: 0 }}`, the CSSTransition fires instantly, which should be fine. However the `grid-rows-[0fr]` → `grid-rows-[1fr]` transition only works correctly if the content is NOT `display:none` at the start. If PrimeReact is hiding the content with `display:none` before the grid animation can run, the expand will appear to fail. This should be investigated by checking if PrimeReact's `unmountOnExit: false` + `timeout: 0` combination fully prevents `display:none` injection.

- **`max-w-sm` on AssistantSetupSection outer Accordion** (line 66, `isCompactView && 'max-w-sm mt-5'`): The outer "Assistant Setup" accordion is capped at `max-w-sm` when in compact view. This may constrain the entire block width in the panel but is separate from the expand behavior.

- **`max-w-sm` on "Extra configuration" nested Accordion** (line 250, `isCompactView && 'max-w-sm'`): Same width cap on the nested accordion block itself.

- No existing tests for the width/expand behavior in Configure & Test mode — any fix is manually verifiable only.

---

## 7. Summary for Complexity Assessment

This is a low-complexity, two-part CSS/component-structure bug fix. The changes are confined to 2–3 files and do not involve state management, API calls, or data-layer changes.

**Part 1 — LLM Model dropdown width**: The fix is a single-line change in `LLMSelector.tsx` at `/src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` line 124. The `max-w-sm` class on the outer wrapper div must be removed (or made optional via a prop). This makes the LLM Model dropdown full-width, matching Skills. No structural changes needed. Risk: removing `max-w-sm` unconditionally will affect all render sites of `LLMSelector`, including the non-compact assistant form page. A prop like `fullWidth` or removal of the constraint entirely (relying on parent to control width) should be evaluated. If the `max-w-sm` is desired on the standalone assistant form page but not in the chat config panel, a conditional approach is needed.

**Part 2 — Accordion blocks not expanding**: The `Accordion` component at `/src/components/Accordion/Accordion.tsx` uses a grid-rows animation trick. The PrimeReact accordion may inject `display:none` into the `toggleableContent` element when closed, which would prevent the grid-rows animation from ever being visible on expand. The fix likely involves either: (a) overriding PrimeReact's transition to prevent `display:none` by using `unmountOnExit: false` combined with setting inline style on `toggleableContent` to `display: block` always, or (b) replacing the PrimeReact Accordion altogether with a pure CSS/React implementation that does not use CSSTransition. A simpler fix may be to set `pt.toggleableContent` to always render as `display: block` via a className or inline style override rather than setting it to empty string.

The test coverage posture for these components is sparse (no existing width or expand tests), so the fix is validated manually in the browser. Both bugs are isolated to 2–3 component files with no cross-service dependencies.
