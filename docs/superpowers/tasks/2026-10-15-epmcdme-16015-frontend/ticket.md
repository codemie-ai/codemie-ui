# EPMCDME-16015 — Platform Budget Hard Limit Must Be Greater Than Zero

Source: https://jiraeu.epam.com/browse/EPMCDME-16015 (Story, In Progress). Fetched read-only 2026-10-15.

**Scope of this run: frontend (this UI repo) only.** AC 5, 7 and 8 are backend work in a separate repository; they are out of scope here.

## Context

- Project budgets are managed from the Administration → Projects page (`/settings/administration/projects/<project>`) through the *Create Budget* and *Update Budget* popups.
- Both popups share one form: Name, Reset Period, Description, Total Budget, a Distribution bar (Platform / CLI / Premium Models) with "Reset to Default", and a Hard Limit and Soft Limit input per category.
- Hard limits are derived from the Total Budget and each category's share, so the Platform Hard Limit can currently reach 0 by dragging the allocation slider, typing 0 into the input, or via a very small share.
- The allocation slider already supports a minimum for the Platform share, but it is currently set to no minimum.
- Existing projects may already hold a Platform budget of 0; the form must keep loading them without errors.
- A separate, older single-category budget popup already requires a positive hard limit; it is not part of this change.
- Backend enforcement lives in a separate repository; the matching change is part of this ticket.

## Complexity

Size: M (15/36) · Recommended flow: sdlc-standard

## Story

As a platform administrator managing project budgets, I want the Platform Hard Limit to always be greater than 0 when I create or update a budget so that a project can never be left without usable Platform budget.

## Background

Today an administrator can set the Platform Hard Limit to 0 (by typing 0 or by dragging the allocation slider all the way down), which effectively blocks the project from using the platform. This is almost always a mistake. The restriction applies only to the Platform Hard Limit; CLI and Premium Models limits and all Soft Limits may remain 0. Projects that already have a Platform budget of 0 must continue to display normally and only be forced to a valid value if someone edits their budget.

## Acceptance Criteria

1. Given the Create Budget or Update Budget popup, when the administrator types 0 or clears the Platform Hard Limit input, then the value is not accepted below the minimum: it behaves like the existing "cannot go below 0" rule, but the minimum for Platform is any value greater than 0.
2. Given the Create Budget or Update Budget popup, when the administrator drags the allocation slider so the Platform share would result in a Platform Hard Limit of 0, then the slider stops at the lowest value that keeps the Platform Hard Limit greater than 0.
3. Given the "Reset to Default" action or a change to Total Budget, when the distribution is recalculated, then the Platform Hard Limit stays greater than 0.
4. Given an existing project whose saved Platform budget is 0, when the administrator opens the project page or the Update Budget popup, then everything renders without errors.
5. Given an existing project whose saved Platform budget is 0, when the administrator saves an update to the budget, then the backend validation still applies and a Platform Hard Limit of 0 is rejected. *(backend — out of scope for this repo; the UI must surface the backend error as it does today)*
6. Given the budget form, when the CLI Hard Limit, Premium Models Hard Limit, or any Soft Limit (including Platform Soft Limit) is 0, then the value is accepted and the budget can be saved.
7. Given a create or update budget request with a Platform Hard Limit of 0 sent directly to the backend, when the request is processed, then the backend rejects it with a validation error and nothing is saved. *(backend — out of scope)*
8. Given a create or update budget request with a Platform Hard Limit greater than 0, when the request is processed, then the backend accepts it as before. *(backend — out of scope)*

## Out of Scope

- Any restriction on CLI Hard Limit, Premium Models Hard Limit, or Soft Limits.
- A new validation message in the form; the restriction works like the existing minimum on the inputs and slider.
- Automatic migration or correction of existing projects that already have a Platform budget of 0.
- Changes to the older single-category budget popup.
- Backend validation (separate repository).

## Open Questions

None blocking. Minimum is any value above $0.
