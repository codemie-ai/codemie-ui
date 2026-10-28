# Configure & Test Panel Bypasses Marketplace Gate Checks — Bug

**Date**: 2026-09-24
**Status**: Approved
**Ticket**: EPMCDME-15254
**Type**: Bug
**Parent**: EPMCDME-14234

---

## Context

- `EditAssistantPage.tsx` implements `handleSaveWithValidation`, which runs marketplace gate checks (hard `gate_findings`, `failed_rules`, soft `quality_validation`) and shows `PublishGateFindingsModal` when the assistant has a `marketplace_status` of `DRAFT`, `PENDING_REVIEW`, or `APPROVED`.
- `AssistantForm.tsx` (used by the "Configure & Test" panel opened from the chat view) implements a separate `handleFormSubmit` that calls `handleMissingIntegrationsSubmit` — no gate-check logic is included.
- The "Configure & Test" panel is accessed by clicking the assistant configuration panel icon from the chat view sidebar.
- EPMCDME-14999 introduced the gate-check flow on the edit page but did not extend it to the Configure & Test save path.

---

## Story

**As a** marketplace administrator or assistant author,
**I want** saving an assistant via the "Configure & Test" panel to run the same marketplace gate checks as saving via the assistant edit page,
**so that** a marketplace-listed assistant (DRAFT, PENDING_REVIEW, or APPROVED) cannot bypass gate enforcement through the chat-view edit path.

---

## Background

EPMCDME-14999 added gate-check enforcement to the assistant edit page save flow. However, the same assistant can also be saved through the "Configure & Test" panel accessible from the chat sidebar (Images 3 & 4). This panel uses a different save handler (`handleFormSubmit` in `AssistantForm`) that does not trigger gate checks. A user can therefore make changes to a marketplace-listed assistant and save them without ever seeing the gate findings modal, violating the invariant established by EPMCDME-14999.

---

## Acceptance Criteria

- [ ] Given an assistant with `marketplace_status` of `DRAFT`, `PENDING_REVIEW`, or `APPROVED`, when the user clicks **Save** in the Configure & Test panel, then the same gate-check logic runs as on the assistant edit page (hard gate findings block the save; soft quality findings show the modal with the appropriate action buttons).
- [ ] Given an assistant that passes all gate checks, when the user saves via the Configure & Test panel, then the assistant is saved normally with no modal shown.
- [ ] Given an assistant with a failing hard gate rule, when the user saves via the Configure & Test panel, then the `PublishGateFindingsModal` is displayed with the correct `marketplaceStatus`, `error`, `descriptionText`, and `sendForReviewLabel` values matching the behaviour on the edit page.
- [ ] Given an assistant with `marketplace_status` other than `DRAFT`, `PENDING_REVIEW`, or `APPROVED` (e.g. no marketplace status), when the user saves via the Configure & Test panel, then no gate-check modal is shown and the save proceeds as before.

---

## Out of Scope

- Changes to the gate-check rules or modal content themselves (owned by EPMCDME-14999).
- The publish/unpublish actions in the Configure & Test panel (separate flow, not a save).
- Any gate enforcement on the assistant creation flow.

---

## Open Questions

- Should the Configure & Test panel expose the same "Save & Unpublish" fallback action that the edit page offers when a hard gate check fails for an APPROVED assistant?
- Is there a shared hook or utility that can be extracted from `EditAssistantPage` to avoid duplicating the gate-check orchestration, or should the panel delegate to the edit page's handler?
