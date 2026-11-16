# Plan — EPMCDME-17247: Clicking a hosted app opens it

Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] AC1: A card click on an app with an active version opens it in the viewer, for every role; the card's accessible name states the action ("Open <app name>").
- [ ] AC2: Enter/Space on a focused card behaves like a click.
- [ ] AC3: Clicking a card's button or More options menu runs only that control's action; the card itself is not launched.
- [ ] AC4: A card click on an app with no active version opens the details page, for every role, never the viewer.
- [ ] AC5: A manager's next-step button ("Upload version"/"Activate version"/"Manage") still shows on a non-openable card and still leads to details.
- [ ] AC6: Every card's More options menu has a "Details" item for every role; the details page's own menu omits it; the viewer menu keeps its single existing details entry, not a second one.
- [ ] AC7: No card shows an eye-icon button; the card menu has an "Open" item with the open icon, disabled with "No active version yet" when there is no active version.
- [ ] AC8: The card menu's Open item and the details page's launch button are both labelled "Open" with the open icon; the details button stays disabled with the same explanation when there is no active version.
- [ ] AC9: A view-only user on a non-openable app sees "No active version yet", an accessible name that does not say "Open", and no enabled Open control anywhere on the card or its menu.

## Tasks

### Task 1 — Card gains an accessible-label override

File: `src/components/Card/Card.tsx`

Add an optional `ariaLabel?: string` to `CardProps` (`:28-42`) and apply it as `aria-label={ariaLabel}` on the clickable `div role="button"` (`:75-78`). Optional and unused by existing callers (assistant, workflow, datasource, Platform-app cards), so their accessible name and click behavior are unchanged (NG1).

Test-first: yes — the assertion lives in the Task 2 card test file, since no Card-level test file exists: rendering `HostedApplicationCard` for an openable app yields a `button`-role element named "Open <app name>"; for a non-openable one the name does not contain "Open". It fails until this prop exists.

### Task 2 — Card click opens the app or falls back to details; eye button removed

File: `src/pages/applications/hosted/HostedApplicationCard.tsx`

- Delete the `OpenButtons` component (`:86-119`) and its `EyeSvg` import (`:18`); drop the `onOpen` prop from `Props` (`:36-40`) and the destructure (`:121`), since nothing calls it once the eye button is gone (the menu's Open action in Task 5 navigates directly).
- `onClick` (`:180-184`): replace the hard-coded `navigate(hostedRoutes.details(app.id))` with `navigate(openable ? hostedRoutes.view(app.id) : hostedRoutes.details(app.id))`.
- `actions` (`:185-197`): keep the manager next-step button when `!openable && isManager(app)`; otherwise render nothing (no visible Open button on the card, D4/AC7).
- Pass `ariaLabel={openable ? 'Open ' + app.name : app.name}` to `Card`.

Test-first: yes — rewrite the `HostedApplicationCard.test.tsx` cases that assert a card click goes to details and that a `/^View/` button exists. Failing tests: a click on an openable card navigates to `hostedRoutes.view(id)` and no View/Open button renders on the card; a click on a non-openable card (any role) navigates to `hostedRoutes.details(id)`; Enter and Space on the focused card do the same as a click; the "offers no way to open the app outside CodeMie" test clicks the card body instead of the removed button and still asserts `window.open` is not called. Also rewrite the three remaining `/^View/`-button cases that the eye button's removal breaks: `'explains the disabled Open to someone who cannot manage the app'` (`:173-179`), `'shows the notice, disables Open and never launches a preview'` (`:181-192`), and `'enables Open when a version is active, for managers too'` (`:194-204`) — since the card itself no longer renders an Open/View button, move each assertion onto the menu's Open item instead: open the card's More options menu and assert the Open entry's disabled state and `data-tooltip-content`/accessible description of "No active version yet" when not openable, and that it is enabled (no tooltip, no notice text) when openable, including for managers.

### Task 3 — `HostedCatalogResults` and `HostedApplicationsPage` drop the now-dead `onOpen` wiring

Files: `src/pages/applications/hosted/HostedCatalogResults.tsx`, `src/pages/applications/hosted/HostedApplicationsPage.tsx`

- `HostedCatalogResults.tsx`: remove `onOpen` from `Props` (`:34`), the destructure (`:48`), and the pass-through to `HostedApplicationCard` (`:93`).
- `HostedApplicationsPage.tsx`: remove the `onOpen={catalog.open}` line (`:111`) and the `['open']` skip (`:113-114`), since the menu shows Open again (Task 5): `menuItems={(app) => cardActions.menuItems(app)}`.
- Leave `useHostedApplicationCatalog`'s `open` function (`:100`) in place; `hosted-filter-defaults.integration.test.tsx` still exercises it directly.
- `catalog-covers.integration.test.tsx:89`: remove the now-removed `onOpen={vi.fn()}` prop from the `<HostedCatalogResults>` render call, matching the dropped `Props` field — otherwise this call site keeps passing a prop `HostedCatalogResults` no longer accepts and breaks type-check.

Test-first: no — prop and call-site removal only, with no behavior of its own; the Task 2 and Task 5 tests cover the wiring it leaves behind.

### Task 4 — `hostedAccess`: rename Open's label, add a `details` action

File: `src/pages/applications/hosted/hostedAccess.ts`

- Add `'details'` to the `HostedActionKey` union (`:35-45`), placed after `'open'`.
- Add an optional `tooltip?: string` field to the `HostedAction` interface (`:47-51`), mirroring `NavigationItem.tooltip` (`NavigationMore.tsx:40`) that the menu already renders as `data-tooltip-content`.
- In `hostedActions` (`:53-54`), change the first entry's label from `'View'` to `'Open'`, and push `{ key: 'details', label: 'Details' }` right after it, unconditionally (every role, D2/AC6). Add `const NO_ACTIVE_VERSION = 'No active version yet'` here — named to match the card's existing constant of the same name — and set `tooltip: NO_ACTIVE_VERSION` on the `open` entry when `!canOpen(app)`, so this module becomes the source of truth for the string away from the card too.

Test-first: yes — a failing case in `HostedApplicationCard.test.tsx`'s "card menu" `it.each`: for every fixture in `cases`, `hostedActions(app)` includes a `details` entry (label "Details", never disabled) immediately after `open` (label "Open"); and for a non-openable app, the `open` entry carries `tooltip: 'No active version yet'`, while an openable app's `open` entry has no `tooltip`.

### Task 5 — Card menu: Open navigates to the viewer, Details navigates to details

File: `src/pages/applications/hosted/useHostedCardActions.tsx`

- Import an icon for `details`: `InfoSvg` from `@/assets/icons/info.svg?react`, distinct from `edit.svg` already used for `edit` so the two don't read the same in one menu. Add `details: <InfoSvg />` to `ICONS` (`:52-65`).
- In `select` (`:113-129`), add `case 'details': return navigate(hostedRoutes.details(app.id))`. `'open'` already navigates to the view route (`:115-116`) and is unchanged.
- In `menuItems` (`:131-139`), destructure `tooltip` alongside `key, label, disabled` and pass it through on the mapped `NavigationMenuItem` as `tooltip`, so a disabled Open item carries the "No active version yet" description set in Task 4 through to `NavigationMore`'s `data-tooltip-content`.

Test-first: yes — a failing case in the "card menu actions" describe block: clicking the menu's "Details" button navigates to `/apps/<id>`; clicking "Open" (present now that Task 3 stopped skipping it) navigates to `/apps/<id>/view`; and the menu's "Open" item has `data-tooltip-content="No active version yet"` for a non-openable app and no such attribute for an openable one.

### Task 6 — Details page button: View → Open; its own menu omits Details

File: `src/pages/applications/hosted/HostedDetailsActions.tsx`

- Replace the `EyeSvg` import and usage (`:16`, `:55`) with `OpenSvg` from `@/assets/icons/open.svg?react`, and change the button text from `View` to `Open` (`:56`). The disabled logic (`:54`) is unchanged.
- Add `'details'` to the menu's skip list so the details page does not link to itself (`:50`): `menuItems(app, [...BUTTON_KEYS, 'details'])`.

Test-first: yes — update `HostedApplicationDetails.integration.test.tsx`: the launch button's accessible name is "Open" where the file queries `name: 'View'` (`:292`, `:306`, `:411`). Add a failing case asserting the page's overflow menu has no "Details" item.

### Task 7 — Viewer menu keeps one details entry, not two

File: `src/pages/applications/hosted/HostedViewerActions.tsx`

Add `'details'` to the skip list passed to `menuItems` (`:48`): `menuItems(app, ['open', 'share', 'details'])`, so the hard-coded "Manage application"/"Application details" entry appended at `:49-53` stays the only one.

Test-first: yes — in the viewer's existing menu coverage (`HostedApplicationViewer.test.tsx` or `embedded-viewer.integration.test.tsx`, whichever renders this menu today), a failing assertion that the overflow menu contains exactly one "Manage application"/"Application details" entry and no "Details" item.

## Negative-constraints pass

- NG1 (assistant/workflow/datasource/Platform cards keep their click behavior and icons): honored. Task 1's `ariaLabel` prop is optional and unused by those cards. No task touches `AssistantCard.tsx`, `WorkflowCard.tsx`, the datasource cards, or `src/pages/applications/components/ApplicationCard.tsx`.
- NG2 (version-list Preview keeps its own label and icon): honored. No task touches `HostedVersionList.tsx`.
- NG3 (no opening outside CodeMie): honored. Task 2 keeps all navigation internal (`navigate()` with `hostedRoutes`), and its rewritten test still asserts `window.open` is not called from the card.
- NG4 (no change to who may open, edit or see details): honored. No task touches `canOpen`, `isManager`, `canEdit` or `user_abilities`. Task 4 only renames one label, adds an unconditional menu entry, and adds a tooltip string.
- NG5 (no Download or other EPMCDME-17228 items; only add Details and rename View to Open): honored. Task 4 adds exactly one key (`details`) and renames one label.
- NG6 (a suspended app with an active version keeps opening as today): honored. Task 2's click logic branches only on `canOpen(app)` (`has_active_version`), unchanged; suspension is not consulted.
