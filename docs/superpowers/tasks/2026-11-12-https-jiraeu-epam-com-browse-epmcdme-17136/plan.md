# EPMCDME-17136 Hosted application card: bottom row overlap — Implementation Plan

**Goal:** On Hosted Applications catalog cards, the action button and the status labels never overlap and are always readable, at every viewport width.

**Architecture:** The bottom row of the shared `Card` (`src/components/Card/Card.tsx:167`) is fixed at `h-7` and does not wrap at widths of `lg` (1024px) and up. When `preview` is set, the card body already grows in height (`Card.tsx:88,108`), and only `HostedApplicationCard` passes `preview`. So the fix makes the row wrap with auto height **only when `preview` is set**. The other five Card consumers (Assistant, Skill, Application, AI Katas, AWS) keep their current classes exactly.

**Tech stack:** React, Tailwind (`classNames`), Vitest + Testing Library.

Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] On a hosted application card with no active version and not shared with a project, the "Activate version" button, "Not shared with project" and "No active version yet" do not overlap at any catalog width (1, 2 or 3 grid columns, including just above 1024px, 1300px and 1600px).
- [ ] All text and icons in the card's bottom row are fully readable, and nothing is clipped or drawn over a neighbour. This includes the worst case where "Suspended" also shows.
- [ ] The "Activate version" button stays clickable and opens the application details page.

## Task 1 — Let the bottom row wrap on preview cards

**Files:** modify `src/components/Card/Card.tsx:165-173`.

Test-first: no — this is a CSS layout change, and jsdom does no layout, so a test cannot show the overlap. AC3 (button click navigates to details) is already covered by `src/pages/applications/hosted/__tests__/HostedApplicationCard.test.tsx:136-150`, which must still pass unchanged. The flow's browser verification checks AC1 and AC2.

- Build the bottom-row `className` (`Card.tsx:167`) with `classNames`, branching on `preview`:
  - `preview` not set: the current string, character for character (`h-7`, plus the `max-lg:` wrap rules).
  - `preview` set: shared parts `flex items-center mt-3 max-sm:mt-2`, plus `flex-wrap min-h-7 gap-x-3 gap-y-2 [&>*]:h-auto`. No fixed `h-7`, so the row wraps and grows at every width.
- The status wrapper (`Card.tsx:171`) keeps `ml-auto`. When the button and the statuses do not fit on one line, the wrapper moves to its own line. The hosted status `div` (`HostedApplicationCard.tsx:125`) is already `flex-wrap`, so its items (Shared/Not shared, Suspended, No active version yet) wrap within that line instead of colliding. No change to `HostedApplicationCard.tsx` is needed.
- Update the comment at `Card.tsx:165-166` to say that preview cards, which already have variable height, wrap at every width.

## Negative constraints

- "do not overlap" (AC1 and Expected): handled by Task 1. No task works around the overlap by truncating, hiding or clipping a status, which would break AC2.
- "remains clickable" (AC3): Task 1 changes classes only. The button, its `onClick` and the card's click filter (`HostedApplicationCard.tsx:167-178`) are untouched.
- Research note "prefer a fix scoped to HostedApplicationCard unless the shared row must change": the shared row has to change, because the hosted card cannot override the `h-7` height. The change is scoped by `preview`, which only the hosted card sets, so no other Card consumer is affected.
