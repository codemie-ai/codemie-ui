# Plan — EPMCDME-8584 · announcer must survive modal panels

## Context

See `technical-analysis.md`. The live region added on 2026-08-25 is silent whenever a modal is
open, for two stacked reasons: it lives inside `#app` (which `NavigationProfile` marks
`aria-hidden` while its panel is open), and assistive tech ignores live regions outside an open
`aria-modal` dialog (w3c/aria#1854).

## Approach

Keep one announcer and one queue; change only where its DOM node lives. `ToasterAnnouncer` renders
through `createPortal` into a container it places itself:

- topmost `[aria-modal="true"], dialog[open]` when one is open;
- `<body>` otherwise.

Placement is re-evaluated by a `MutationObserver` on `document.body`
(`childList`, `subtree`, `attributeFilter: ['aria-modal', 'open']`), so the region is already
inside the dialog before any toast is raised from it. Re-parent only when the host actually
changes — moving the node resets the region for assistive tech.

Rejected alternatives:

- *Drop `aria-modal` / `aria-hidden` from the profile panel* — regresses the deliberate modal
  semantics covered by `NavigationProfile.test.tsx` (CR-001/CR-002).
- *A second, per-dialog live region* — two regions announcing the same text, and every future
  modal would have to remember to add one.

## Tasks

### T1 — region must not live inside `#app`

- **Test (RED)**: render the announcer into a `#app` container, set `aria-hidden="true"` on it,
  assert the region is not inside that subtree and has no `aria-hidden` ancestor.
- **Impl**: `createPortal` into a component-owned container appended to `<body>`.
- Commit `f08617906`.

### T2 — region must follow the open modal

- **Test (RED)**: with a `[aria-modal="true"]` element in the document, the region must be inside
  it; when that element goes away, the region must be back under `<body>`.
- **Impl**: `MutationObserver` placement described above.
- Commit `f30ce0fc8`.

## Verification

- Unit + integration suites.
- CDP accessibility tree on the running app, panel open and closed.
- Manual confirmation by the reporter with VoiceOver (the only check that covers barrier 2 —
  the AX tree alone reported `ignored: false` while VoiceOver was still silent).

## Out of scope

`copyToClipboard` is duplicated in `utils/helpers.ts` and `utils/utils.ts`. Both funnel into
`toaster`, so neither affects this fix; de-duplication belongs in its own change.
