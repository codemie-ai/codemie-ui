# Plan — EPMCDME-8428: Folder-name input accessible name

## Requirements

Give the "Folder name" input in the Create/Edit Folder modal a real programmatic accessible name so it does not depend on the placeholder-fallback step of the accname algorithm. Selected approach: `aria-label="Folder name"` (no visual change). Add unit tests for `FolderFormPopup` that assert the exact accessible name via `toHaveAccessibleName`.

## Scope

Touch only:
- `src/pages/chat/components/ChatSidebar/FolderList/FolderFormPopup.tsx`
- `src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderFormPopup.test.tsx` (new)

Do NOT touch `src/components/Popup/Popup.tsx` (separate tickets EPMCDME-8430 / EPMCDME-8429 own that surface).

## Tasks

### T1 — Add failing unit test for the folder-name input's accessible name
Create `src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderFormPopup.test.tsx`.

Two `it` blocks:
1. `renders an input with accessible name "Folder name" in create mode` — render `<FolderFormPopup isVisible onHide={...} />`, get the textbox, assert `expect(input).toHaveAccessibleName('Folder name')`.
2. `renders an input with accessible name "Folder name" in edit mode` — render `<FolderFormPopup isEditing folder="Existing folder" isVisible onHide={...} />`, same assertion.

Use `screen.getByRole('textbox')` to locate the input (there is only one). Do NOT locate by name substring — locate the element unambiguously and assert the name explicitly.

Test-first: yes — this test must FAIL on current `main` (accessible name resolves to `"Folder name"` via placeholder fallback, which does NOT satisfy `toHaveAccessibleName` because jest-dom's matcher checks the accname algorithm result; the placeholder fallback is not treated as an accessible name by `toHaveAccessibleName`). Confirm RED before proceeding.

### T2 — Fix: add aria-label to the input
Edit `src/pages/chat/components/ChatSidebar/FolderList/FolderFormPopup.tsx`:
```tsx
<Input aria-label="Folder name" placeholder="Folder name" error={fieldState.error?.message} {...field} />
```
Confirm GREEN.

Test-first: n/a — implementation for T1's failing test.

### T3 — Gates
Run in order:
1. `npm run lint`
2. `npm test -- FolderFormPopup` (affected)
3. `npm run sonar-local` (needs `SONAR_TOKEN`)
4. `npm run test-harness` — capture passed/failed numbers for MR description

Test-first: n/a — validation.

### T4 — Commit & final report
Single commit: `EPMCDME-8428: Add accessible name to folder-name input`.
Do NOT commit `docs/superpowers/tasks/...` artifacts (per sdlc-light Stage 7 policy — left for mr-creator/user).

Final report must list:
- Test-harness numbers (needed for compliance checks 3.1/3.2).
- The two Popup.tsx defects observed but not fixed (empty `aria-describedby`, duplicate Escape handling).
- Note that `toHaveAccessibleName` is introduced to the repo by this MR.

Test-first: n/a — handoff.
