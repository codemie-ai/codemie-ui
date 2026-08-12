# Technical Analysis — EPMCDME-8428

Ticket: [4.1.2] The input field in the "Create new folder" modal dialog window does not have an accessible name.

Reproduction: Chat Sidebar → Folders → "Create Folder" button → focus the input labelled visually by the placeholder "Folder name". NVDA announces `edit Folder name blank, has auto complete`.

## Codebase Findings

### Component surface
- `src/pages/chat/components/ChatSidebar/FolderList/FolderFormPopup.tsx`
  Renders a single controlled input:
  ```tsx
  <Input placeholder="Folder name" error={fieldState.error?.message} {...field} />
  ```
  Only `placeholder` is passed. No `label`, no `aria-label`, no `id`.

- `src/components/form/Input/Input.tsx`
  Already supports a `label` prop and always renders a wrapping `<label>` element. Because the component spreads `...rest` onto the `<input>`, `aria-label` from the caller reaches the DOM `<input>` unchanged. The labelling mechanism therefore already exists — it is simply unused at this call site.

### Live measurement (Chrome accessibility tree, modal open)
- `<input>`: `id=null`, `aria-label=null`, `aria-labelledby=null`, `title=null`, `placeholder="Folder name"`
- Wrapped in a `<label>` whose `textContent` is `""` (empty; the `Input` component only injects visible label text when the `label` prop is passed).
- a11y tree exposes: `textbox "Folder name"`.

### Nuance for reviewers
The accessible name is not literally empty — it currently resolves through the **placeholder fallback** (the last step of the W3C accname algorithm). That is exactly what triggers NVDA's `"Folder name blank"` announcement. This is still a WCAG 4.1.2 defect because:
- Placeholder is a last-resort fallback, not a first-class labelling mechanism; not all browser + AT pairs expose it as the accessible name.
- The visible hint disappears as soon as the user types, so users returning focus lose the cue.
- The tag as a "programmatic name" is fragile and non-conforming.

The MR description must state this explicitly so a reviewer does not object with "the name is already there".

## Repo conventions consulted
`.ai-run/guides/patterns/accessibility-patterns.md` accepts either `<label htmlFor>` or `aria-label` for form inputs. No stricter local rule mandates a visible label for this control.

## Approach
Two options considered; pick **(a)**:
- **(a) `aria-label="Folder name"`** — no visual change. Accessible name is now `"Folder name"` via the label step of accname, not the placeholder fallback. This ticket is a4.1.2 defect only; a visible-label redesign is out of scope. **Selected.**
- (b) `label="Folder name"` on `Input` — would render a visible label above the field, changing the modal's layout. Rejected as a design change beyond ticket scope.

## Testing
No tests currently exist for `FolderFormPopup`. Add a colocated unit test at
`src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderFormPopup.test.tsx`.

Assertion MUST be `expect(input).toHaveAccessibleName('Folder name')` — exact match, not substring/regex.
Rationale: on EPMCDME-8433, a substring matcher such as `getByRole('textbox', { name: /folder/i })` matched the placeholder-fallback name and let a real defect through review AND merge. `toHaveAccessibleName` is currently used nowhere in this repo — this is deliberate: it is the stronger assertion. `@testing-library/jest-dom` (already imported in `setupTests.tsx`) ships it.

Test cases:
1. In the create modal, the input has accessible name exactly `"Folder name"`.
2. In the edit modal, the input has accessible name exactly `"Folder name"` (same input, same labelling regardless of mode).

The test must fail before the fix and pass after it.

## Risk Indicators
- Surface: 1 component file + 1 new test file. Isolated to a chat-sidebar modal.
- Store surface (`useSnapshot(chatsStore)`) is auto-mocked in the unit setup; render only, no submission needed for the assertion.
- No API contract, migration, security, or breaking change.

## Out of scope — noted, not fixed
While reading `src/components/Popup/Popup.tsx` two additional defects were observed. They are NOT touched by this ticket:
- `pt.root['aria-describedby']` is hardcoded to the empty string `''` (line 165). Should be omitted (or set to a real ID) — the empty string still creates an association.
- Escape is handled twice: a manual `document.addEventListener('keydown', ...)` (lines 83–94) calls `onHide` in parallel with PrimeReact Dialog's `closeOnEscape` (line 159). `onHide` can fire twice for a single Escape.

Popup itself also sets `focusOnShow={false}`, which is the cause of the separate open tickets EPMCDME-8430 and EPMCDME-8429. Not touched here.
