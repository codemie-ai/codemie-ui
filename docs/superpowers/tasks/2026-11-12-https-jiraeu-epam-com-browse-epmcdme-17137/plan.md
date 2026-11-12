# EPMCDME-17137: Center the Hosted Applications cover image (Implementation Plan)

> Written directly, without invoking `superpowers:writing-plans`. The sdlc-factory stage-guard
> hook resolved another session's run (EPMCDME-17135) and blocked the skill. The user approved
> writing the plan by hand. The format follows writing-plans.

**Goal:** Center the uploaded cover image instead of anchoring it to the top. This applies to the
catalog card, the Application details PREVIEW block and the create/edit form preview.

**Architecture:** One shared component, `HostedApplicationCover`, renders the cover on both
affected surfaces (catalog card and details PREVIEW). It crops the image to a 2:1 frame with
`object-cover object-top`. `HostedCoverField` keeps a second copy of the same rule for a newly
chosen file, and that preview is meant to match the card. Changing `object-top` to
`object-center` in both places fixes the bug. No store, API, routing or config changes.

**Tech stack:** React, TypeScript, Tailwind.

**Fit decision:** centered crop (`object-center`), chosen by the product-owner stand-in. If
content is still cut off, do not switch to `object-contain` silently. Escalate instead (see
Constraints).

Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] The selected application image is centered on the application card in the catalog and in
      the PREVIEW block on the Application details page.
- [ ] The main content of the image is not cut off on either the card or the PREVIEW block.

## Constraints

- Do not switch silently to `object-contain` (or any other fit). If a square test image
  ("BLUE 42"-like) still has its main content cut off after centering, escalate. Do not change
  the fit choice.
- Keep the form preview and the card identical (`HostedCoverField.tsx:113` says it replicates the
  card).
- Surgical change: only the position class changes. Leave `object-cover`, the frame
  (`aspect-card-cover`) and the fallback layers untouched.

## Negative-constraint pass

- negative-constraints: none stated in the ticket.
- Constraint from the stand-in decision, "no silent switch to object-contain": T1 and T2 honor it.
  Each changes only `object-top` to `object-center`, and no task touches the fit.

---

## Task 1: Center the cover in HostedApplicationCover

**Files:** Modify `src/pages/applications/hosted/HostedApplicationCover.tsx:138`

**Test-first:** no. This is a visual-only class change. jsdom does no layout, and no existing test
asserts fit or position classes. Verification is the flow's browser stage.

- [ ] Step 1: On the cover `<img>` className at line 138, replace `object-top` with
  `object-center`. Keep `absolute inset-0 size-full object-cover`. This fixes both the catalog
  card (`HostedApplicationCard.tsx:154`) and the details PREVIEW (`HostedApplicationOverview.tsx:89-91`).

## Task 2: Center the chosen-file preview in HostedCoverField

**Files:** Modify `src/pages/applications/hosted/HostedCoverField.tsx:122`

**Test-first:** no. Same reason as T1: visual-only, so jsdom cannot verify it.

- [ ] Step 1: On the "Selected cover" `<img>` className at line 122, replace `object-top` with
  `object-center`, so the form preview keeps matching the card from T1.

---

## Note for the browser-verification stage (not a plan task)

Upload a square image with text near the bottom edge (like "BLUE 42"). Check it on the catalog
card, in the details PREVIEW block and in the create/edit form preview. The image should be
vertically centered with its main content visible on all three. If the main content is still cut
off, escalate (see Constraints).
