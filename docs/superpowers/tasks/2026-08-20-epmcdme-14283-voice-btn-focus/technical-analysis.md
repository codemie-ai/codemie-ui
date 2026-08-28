# Technical Research

**Task**: voice accessibility focus keyboard ChatPromptVoiceRecorder
**Generated**: 2026-08-20T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

The 'Use voice' / 'Stop listening' button (ChatPromptVoiceRecorder) does not have a visible focus indicator when navigating with keyboard (Arrow key). WCAG 2.4.7 bug. The fix is purely CSS/styling — add a visible focus indicator consistent with how other interactive elements in the app show focus. EPMCDME-8444 (aria-label toggling between 'Use voice' and 'Stop listening') is already merged and must NOT be touched. Existing tests: src/pages/chat/components/ChatPrompt/__tests__/ChatPromptVoiceRecorder.test.tsx

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatPrompt/ChatPromptVoiceRecorder.tsx` — the sole component to change. A `<button>` at line 118–135 renders the voice record/stop toggle. Line 122 carries the bug: `className="relative focus:outline-none w-[30px] h-[30px] flex items-center justify-center"`. `focus:outline-none` removes the browser's default outline with no replacement ring, making it invisible to keyboard users.
- `src/pages/chat/components/ChatPrompt/ChatPrompt.scss` — defines `.pulse-ring` and `.prompt-border-gradient` animations. No focus styles defined here; the button relies entirely on Tailwind utility classes.

### Architecture and Layers Affected

- **Presentation / UI layer only** — `ChatPromptVoiceRecorder.tsx` is a self-contained leaf component inside `src/pages/chat/components/ChatPrompt/`. No store, no hook, no routing change is required. The fix touches exactly one `className` string on one JSX element.

### Integration Points

- The button imports `RecordSvg` and `StopSvg` SVG assets and `chatsStore.recognizeSpeech`. None of these are affected.
- The component is consumed by `ChatPrompt.tsx` (parent); no change is needed there.

### Patterns and Conventions

The project-wide focus indicator pattern is Tailwind utility classes applied directly to the interactive element. Two canonical forms observed:

1. **Accessibility guide** (`.ai-run/guides/patterns/accessibility-patterns.md`, line 103–106):
   ```
   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
   ```
2. **NavigationMore trigger button** (`src/components/NavigationMore/NavigationMore.tsx`, line 168):
   ```
   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
   ```
3. **NavigationMore menu item** (`src/components/NavigationMore/NavigationMore.tsx`, line 131):
   ```
   focus:outline-none focus:ring-2 focus:ring-primary-500
   ```

`focus:ring-2 focus:ring-primary-500` is the consistent token pair across the codebase. The button is circular (30 × 30 px); the button element itself carries no `rounded-*` class, which means a ring would render as a square. Adding `rounded-full` alongside the ring classes ensures the focus indicator follows the visual shape.

The exact fix for line 122:
```
"relative focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full w-[30px] h-[30px] flex items-center justify-center"
```

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — covers WCAG 2.1 AA target, pre-delivery checklist (line: "Buttons/links have visible focus ring (`focus:ring-2 focus:ring-primary-500`)"), canonical focus indicator snippet, and keyboard navigation rules. This is the authoritative reference for the fix.
- `.ai-run/guides/components/component-patterns.md` — not read; not relevant to a single-class CSS change.

### Architectural Decisions

- `focus:ring-2 focus:ring-primary-500` is the documented standard. The guide states "always include focus ring — never `outline-none` without replacement."
- EPMCDME-8444 is already merged (aria-label toggling at line 120); the constraint to not re-touch it is fully respected — the fix is on line 122 (className) only.

### Derived Conventions

- Icon-only buttons in this codebase receive `aria-label` and suppress the SVG with `aria-hidden="true"`. Both are already present on this button.
- No global CSS reset of outline found — the browser default is only suppressed per-element with `focus:outline-none`, so adding a ring class is sufficient with no global side-effects.

---

## 4. Testing Landscape

### Existing Coverage

`src/pages/chat/components/ChatPrompt/__tests__/ChatPromptVoiceRecorder.test.tsx` — two tests:
1. `has accessible name "Use voice" when idle` — queries `getByRole('button', { name: 'Use voice' })`
2. `has accessible name "Stop listening" while recording` — fires click, awaits label change

These cover the EPMCDME-8444 aria-label toggling only. No focus-related assertion exists.

### Testing Framework and Patterns

- Vitest + React Testing Library (`@testing-library/react`)
- Mocks: `vi.mock` for `chatsStore`, `Object.defineProperty` for `navigator.mediaDevices`
- Pattern: `render` → `screen.getByRole` / `findByRole` → `expect(...).toBeInTheDocument()`
- No snapshot tests; behaviour-driven assertions only.

### Coverage Gaps

- No test verifies that the button has a visible focus class. A new test could assert `button.className` contains `focus:ring-2` and `focus:ring-primary-500`, or simulate focus and check computed style — though the latter is limited in jsdom. The ticket does not request new tests, but this is a gap that a follow-up could address.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this change. No feature flag gates the voice button's rendering.

### Configuration Files

No config change needed. The Tailwind color token `primary-500` is already defined in the project's theme (it is used in two NavigationMore buttons today); no new token introduction is required.

### Feature Flags and Deployment Concerns

None. The voice recorder button is rendered unconditionally when the parent `ChatPrompt` includes it. This is a pure CSS class addition with no runtime toggle.

---

## 6. Risk Indicators

- **`focus:outline-none` without ring — confirmed WCAG 2.4.7 violation** at `ChatPromptVoiceRecorder.tsx` line 122. This is the single root cause.
- **Button has no `rounded-*` class** — without adding `rounded-full`, the focus ring will render as a rectangle around the 30×30 area, which is inconsistent with the circular visual shape of the button. This is a minor cosmetic risk if `rounded-full` is omitted from the fix.
- **`ChatPromptSkillsButton` also missing focus ring** — observed during research but out of scope for this ticket. It is a separate WCAG gap.
- **`ChatPromptStarters` button also uses bare `focus:outline-none`** — same issue pattern, also out of scope.
- **No test for focus indicator** — the existing test suite will pass after the fix but will not guard against regression. Low-priority follow-up.
- **One-line change, no logic involved** — risk of accidental side-effect is minimal.

---

## 7. Summary for Complexity Assessment

The task touches exactly one file (`ChatPromptVoiceRecorder.tsx`) and exactly one JSX attribute (`className` on the `<button>` at line 122). The change is additive: three Tailwind utility classes (`focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`) plus `rounded-full` are appended to an existing className string. No TypeScript type changes, no store modifications, no routing changes, and no new dependencies are involved.

The affected area follows an established pattern that is documented in the accessibility guide and demonstrated by at least two existing components (`NavigationMore` trigger and menu items). This is a direct application of an existing convention — there is no technical novelty. The `primary-500` color token is already in the Tailwind theme.

Test coverage for the affected component is narrow (two aria-label assertions) and does not cover focus indicators. The fix does not break any existing assertion. No new test is required by the ticket, but a follow-up test asserting the presence of the ring class would close the regression gap.
