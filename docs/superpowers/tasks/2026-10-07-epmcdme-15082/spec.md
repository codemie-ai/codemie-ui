# EPMCDME-15082 — User-Level Model Override (frontend slice)

**Type:** Story, Phase 2 · **Linked:** EPMCDME-14349 (Project-Level Model Availability) · **MR:** !4423
**Branch:** `EPMCDME-15082_user-level-model-override` · **Repo:** codemie-ui (React/TS frontend only)

## Context

Model access is layered platform → project → user; this story covers the user tier.

- The access check (can the caller use the asset's selected model) honors the user's override regardless of asset scope. For a project-scoped asset the project's user override applies; for a global (marketplace) asset the user's override(s) apply across every project the user belongs to.
- The fallback (which model to use if access fails) is determined by the asset's scope: a project-scoped asset falls back to its project's default model, a global asset to the global default model. The ticket is inconsistent here: Context says fallback is independent of user overrides, while AC6 says it uses "user-level override if it exists, project default, global default". Backend concern; unresolved in the ticket.
- A user override wins over the project's model set at the access-check step, whether it expands or narrows.
- Platform-disabled models remain a hard stop at every scope; no override re-enables them.
- Out of scope: platform-level and project-level model configuration UI/logic; model resolution for callers with no user identity (webhooks); market-level (global) resolution (listed in the ticket's Out of Scope, although Context describes global-asset behavior).

**Story:** As a project or platform admin, I want to set model access overrides — expanding or narrowing a user's available models — for individual users or a bulk-selected group, and have those overrides honored when a user invokes an asset.

## Scope of this repo

ACs 1–2 are the frontend scope. ACs 3–6 of the ticket (expanding override passes the invocation check, override precedence over the project set, narrowing override fails the check, fallback selection) are runtime resolution and enforcement, a backend concern. The ticket has no "user notified before fallback" criterion.

## Acceptance criteria

1. **Single user.** Given a project admin viewing a single user within their project, when they set a model access override for that user, then the override is saved and associated with that user within that project.
2. **Bulk.** Given a project admin has selected multiple users, when they apply a model access override to the selection, then the same override is saved for every selected user.

## Behavior decisions

Settled during implementation; the code must satisfy them. They are not in the ticket: the ticket only requires that an override, expanding or narrowing, can be saved for one user or a bulk selection.

| # | Behavior |
|---|---|
| D1 | The override modal offers every platform-enabled, non-router model, independent of the project's own allow/deny-list. |
| D2 | `allowed_models` is always sent (non-empty) on single set and on batch grant, since the backend rejects an empty list with 422. A default-only change still sends the list. |
| D3 | Bulk edit shows the union of the selected users' effective models: a user without an override contributes the project's available models; one with an override contributes their own. |
| D4 | Bulk edit grants one shared model list and one chosen default to every selected user. If the users' defaults differ, a default must be chosen before Apply is enabled. |
| D5 | Bulk checkbox state per model: enabled for every selected user → checked; for some → mixed (the same partial checkbox as the table header); for none → unchecked. |
| D6 | An untouched mixed model stays enabled on apply (union). Clicking it turns it into a regular checked or unchecked box. Reset to project settings clears all mixed states. |
| D7 | In bulk edit, Apply is available without any change, because the merged list differs from the individual users' lists. Single-user edit still requires a change. |
| D8 | Apply stays disabled while the default model is invalid (none selected, or not among the enabled models) or a submit is in flight. |
| D9 | The Default radio is disabled only on unchecked rows; mixed rows can be the default. |
| D10 | The feature is gated by `isUserModelOverrideEnabled`; the "Override models" row action and bulk item appear only when it is on. |

## Entry points and persistence

- Row action "Override models" → modal with one user → `projectModelOverridesStore.setUserModelOverride` (`user_id`, `allowed_models`, `default_model?`).
- Bulk-actions menu "Override models" → modal with the selection → `projectModelOverridesStore.batchUserModelOverrides` with `operation: 'grant'`, `user_ids`, `allowed_models`, `default_model?`.
- Reset to project settings removes the override (`deleteUserModelOverride` / batch `revoke`).

## Verification

- Unit: `ProjectMemberModelOverrideModal.test.tsx`, `projectModelOverrides.test.ts`, `ProjectMembersBulkActionsModelOverride.test.tsx`, `ProjectMembersModelOverridePersistence.test.tsx`, `ProjectMembersModelFilter.test.tsx`.
- Integration tests run at the QA gates step.
