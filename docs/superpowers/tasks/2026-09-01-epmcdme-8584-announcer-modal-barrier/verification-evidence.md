# Verification Evidence — EPMCDME-8584

## 1. Screen reader (primary evidence)

The previous fix for this ticket was closed on a DOM-level signal and reopened by QA, so a DOM
assertion is explicitly **not** sufficient acceptance here. The barrier that reopened it — assistive
tech restricting itself to an open `aria-modal` dialog (w3c/aria#1854) — is invisible to both the
DOM and the browser accessibility tree.

| Item | Value |
|---|---|
| Date | 2026-09-01 |
| Build | local stack, branch `EPMCDME-8584_announcer-outside-app-root`, container rebuilt from `npm run build:prod` |
| Route | `/settings/profile` → sidebar profile panel |
| Action | copy button next to username / user ID |
| Result | announced |

The reporter confirmed the panel copy buttons are announced on the rebuilt build, having previously
confirmed the same build silent before the change. That manual confirmation is what closes AC3;
everything below is supporting evidence.

## 2. Accessibility tree (supporting)

Captured with Chrome DevTools Protocol `Accessibility.getPartialAXTree` against the running app —
what the browser exposes to assistive tech, as opposed to what the DOM contains.

| State | Before | After |
|---|---|---|
| No modal open | `role: status, ignored: false, live: polite` | `role: status, ignored: false, live: polite` |
| Profile panel open | `ignored: true, ignoredReasons: ["ariaHiddenSubtree"]` | `ignored: false`, region inside `#nav-profile-dialog` |
| Copy clicked in panel | DOM text set, still `ignored: true` | DOM text set **and** `ignored: false` |
| Panel closed | — | region back under `<body>` |
| Toast over the onboarding dialog | `ignored: true, ["activeAriaModalDialog"]` | `ignored: false` |

Note the trap this table records: after the first commit alone, the middle row already read
`ignored: false` while the screen reader was still silent. `ignored: false` is necessary, not
sufficient.

## 3. Automated gates

| Gate | Result |
|---|---|
| `npm run test:unit` | 463 files / 4920 tests passed |
| `npm run test:integration` | 39 files / 496 passed, 1 skipped |
| announcer suite, 3 consecutive runs | 11/11 each (guards against the timing flake found in review) |
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `npm run test-harness` | see `run.log.harness` in the MR description |

## 4. Re-verification after the review refactor

Review asked for inversion of control: modals now declare themselves as the region's host through a
React context and stack (`ModalAnnouncerHost`), replacing the selector scan and MutationObserver.
Placement behaviour is unchanged, so the tables above were re-captured against the refactored build
and match row for row — profile panel (`OverlayPanel`) and `Popup` (PrimeReact `Dialog`) both host
the region while open, `ignored: false` in every state, `<body>` when no modal is registered.

The refactor narrows coverage to surfaces that carry the host line, so
`__tests__/modalSurfaces.guard.test.ts` fails the build on any component with modal markup that
omits it. The guard was confirmed to fail on a planted unguarded surface, not merely to pass.

## 5. Walkthrough recording

`EPMCDME-8584-announcer.mp4` plus stills, attached to the MR. Because the live region is `sr-only`,
the recording carries a debug probe **injected by the capture script — not part of the app** — that
mirrors the real `<output aria-live>` node: its text and its current host subtree.
