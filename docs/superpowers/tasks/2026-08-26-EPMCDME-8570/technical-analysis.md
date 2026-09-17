# Technical Research

**Task**: help accessibility icons
**Generated**: 2026-08-26
**Research path**: filesystem

---

## 1. Original Context

Fix accessibility bug EPMCDME-8570: decorative icons on the Help page (/help route) have alt text that screen readers announce. Three icons affected: "AI/Run Feedback", "AI/Run FAQ", and "AI/Run Chatbot". They should be hidden from assistive technologies (aria-hidden="true" or empty alt="" for img tags, or equivalent for SVG/icon components). WCAG 2.1 technique for pure decoration: https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html#dfn-pure-decoration

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/help/components/HelpItem.tsx` — renders a single card on the Help page. Contains the icon rendering logic with two branches:
  - `{iconUrl && <img src={iconUrl} alt={name} />}` — renders `<img>` with the assistant name as `alt` (the bug)
  - `{!iconUrl && (Icon ? <Icon /> : <img src={DefaultIconPng} alt={name} />)}` — SVG component (no `aria-hidden`) or fallback `<img>` with `alt={name}` (also the bug)
- `src/pages/help/HelpPage.tsx` — assembles `HelpSectionType[]` from `helpAssistants` store; the three affected items (Feedback, FAQ/Onboarding, Chatbot) are built via `addAssistantItem()` which sets `iconUrl: assistant.icon_url` from the store. The item `name` is the assistant name, so `alt={name}` on the `<img>` produces the announced text.
- `src/pages/help/components/HelpSection.tsx` — passes `icon` and `iconUrl` props down to `HelpItem`; no icon logic of its own.

### Architecture and Layers Affected

- **Presentation layer** (`src/pages/help/components/HelpItem.tsx`) — only file that needs changing.
- The `HelpItemType` interface in `HelpPage.tsx` does not need a new field; the fix is purely in the render output.

### Integration Points

- `assistantsStore.helpAssistants` (Valtio) supplies `icon_url` for the three assistants; the store shape is unaffected.
- The `icon` prop accepts `ComponentType<React.SVGProps<SVGSVGElement>>` — SVG components rendered inline also need `aria-hidden="true"`.

### Patterns and Conventions

- Project accessibility guide (`.ai-run/guides/patterns/accessibility-patterns.md`) states:
  - Decorative SVGs: `aria-hidden='true'` on the `<svg>` element.
  - Decorative `<img>`: `alt=''` + `role='presentation'`.
- All three icon paths in `HelpItem` are decorative: the item name appears as visible `<h3>` text immediately adjacent, making the icon purely presentational.
- The SVG component path (`<Icon />`) passes through `React.SVGProps<SVGSVGElement>`, so `aria-hidden="true"` can be applied as a prop at the call site.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — directly covers this case. Relevant rules:
  - "Decorative SVGs: `aria-hidden='true'`"
  - Image alt text table: decorative images use `alt=''` + `role='presentation'`
  - Pre-delivery checklist: "Decorative SVGs: `aria-hidden='true'`"

### Architectural Decisions

No ADRs specific to icon accessibility. The guide is the canonical rule.

### Derived Conventions

None needed — the guide is explicit and matches WCAG 2.1 SC 1.1.1.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/help/components/__tests__/HelpItem.test.tsx` — tests `iconUrl` image: `screen.getByAltText('Test Assistant')` and asserts `src`. This test currently asserts that `alt` equals the name, which is the buggy behaviour.
- `src/pages/help/components/__tests__/HelpSection.test.tsx` — test `'handles items with iconUrl'` also calls `screen.getByAltText('Avatar Item')`.
- `src/pages/help/__tests__/HelpPage.test.tsx` — does not query by alt text for assistant icons.

### Testing Framework and Patterns

Vitest with React Testing Library. No `jest-axe` used in this test suite.

### Coverage Gaps

- No test verifies that `alt` is empty or that `aria-hidden` is set on icon elements (the actual accessibility contract). The existing `getByAltText(name)` assertions will break after the fix and must be updated to `getByAltText('')` or a role/testid query.

---

## 5. Configuration and Environment

### Environment Variables

None relevant. Icon URLs come from the assistants API at runtime, not from env config.

### Configuration Files

No config governs icon rendering behaviour.

### Feature Flags and Deployment Concerns

None.

---

## 6. Risk Indicators

- The existing test `'renders iconUrl image when provided'` in `HelpItem.test.tsx` asserts `screen.getByAltText('Test Assistant')` — it will fail after the fix. The test must be updated to match the corrected empty-alt behaviour.
- Same for `HelpSection.test.tsx` line `screen.getByAltText('Avatar Item')`.
- The `<Icon />` SVG component branch passes arbitrary `React.SVGProps`; `aria-hidden` will be passed as a string `"true"` which React renders as `aria-hidden="true"` correctly, but the TypeScript type is `boolean | "true" | "false"` — use the string `"true"` per JSX convention or the boolean `true` (both work; the guide examples use the string).
- Speculative: If other pages reuse `HelpItem` outside the Help route, the same decorative-icon fix applies there too — but no such reuse was found in this research.

---

## 7. Summary for Complexity Assessment

The bug is entirely contained in one file: `src/pages/help/components/HelpItem.tsx`, lines 51–52. Three icon rendering paths exist — `<img src={iconUrl}>`, `<Icon />`, and the fallback `<img src={DefaultIconPng}>` — and all three use `alt={name}` or no accessibility suppression at all. The fix is to change both `<img>` tags to `alt="" role="presentation"` and add `aria-hidden="true"` to the `<Icon />` call site. No new files, no interface changes, no store changes.

Two existing tests assert the current (buggy) `alt={name}` behaviour via `getByAltText(name)` and will need updating. No axe/accessibility-specific tests exist for this component; the fix itself is simple but the test updates are load-bearing — a test that still finds the named alt text after the fix would indicate the change did not land.

Overall complexity is minimal: one-file change, two test updates, zero config or architecture impact.

---

## 8. External References

None named by the task.
