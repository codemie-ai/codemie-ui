# Spec — EPMCDME-14781: Project-level model availability settings

**Source**: Jira ticket [EPMCDME-14781](https://jiraeu.epam.com/browse/EPMCDME-14781), fetched
verbatim via the `codemie-jira-assistant` skill. Epic: EPMCDME-10044. Status at fetch time: In
Progress. No attachments, no comments, no separate Acceptance Criteria field — the criteria live
in the description body.

This document is a retroactive spec: the MR (!1917, `Variant-1-Project-Hub`) already existed with
a partial (mocked, `localStorage`-backed) implementation of the model-related criteria when this
work started. The task was to close the gap between that MR and the ticket's acceptance criteria,
review the result, and fix what the review found — not a from-scratch greenfield spec written
before implementation.

## Ticket description (verbatim)

> **General purpose and value for the user**
>
> Redesign the Project Details experience to support upcoming project-level capabilities without
> requiring repeated page redesigns as new functionality is introduced. The immediate priority is
> an extensible structure for model-related functionality while establishing scalable information
> architecture for future project-level sections such as integrations, MCP, budgets, and other
> project controls.
>
> **Preconditions of use**
>
> - User can access Project Details.
> - Project-level configuration and overview information is available or planned.
> - Project administrators can manage project settings.
>
> **Scenarios of use**
>
> 1. A project administrator opens Project Details.
> 2. The administrator accesses project-level model availability controls.
> 3. The administrator reviews or configures model allow-list or deny-list behavior.
> 4. The administrator accesses automatic model routing settings.
> 5. The administrator reviews a compact Project Overview.
> 6. Additional project-level capabilities can be added without restructuring the entire page.
>
> **Affected areas**
>
> - Project Details information architecture
> - Project-level model availability controls
> - Automatic model routing settings
> - Project Overview
> - Project integrations overview
> - Project budgets and spend overview
> - Future project-level configuration areas, including MCP

## Acceptance criteria (verbatim)

1. Updated Project Details information architecture is provided.
2. UX supports project-level model allow-list or deny-list management.
3. The design supports restricting models for selected projects or clients.
4. The design supports hiding expensive models from selected projects.
5. Model restrictions are represented as applicable wherever a model can be selected, including
   chats, assistants, and workflows.
6. UX supports enabling or disabling automatic model routing for a project.
7. Automatic routing respects project model-availability restrictions.
8. Project Overview is compact and easy to scan.
9. Project Overview can represent relevant project-level indicators, including users, spend and
   budgets, model usage/distribution, integrations, and routing impact where applicable.
10. The structure supports adding future project-level capabilities without a complete redesign.
11. The design unblocks model-related work first while remaining extensible for integrations,
    MCP, and budgets.

## Interpretations and open questions

These were not resolved with the ticket owner (no comments, no attachments, no linked spec doc
existed) and are flagged here rather than guessed silently:

- **Criterion 3, "clients"**: the platform has no `client` entity distinct from `project`. This
  spec treats the criterion as satisfied for the "projects" half only; the "clients" half is an
  open product question, not implemented, and is called out as `partial` in every code-review
  business-review pass.
- **Criterion 4, "expensive models"**: implemented as a `hide_premium_models` switch backed by the
  platform's existing premium-model alias config (`LITELLM_PREMIUM_MODELS_ALIASES`), the same
  signal the rest of the product already uses for "premium." No separate cost-threshold concept
  was introduced.
- **Criterion 7, routing vs. restrictions**: the backend can see a Switchyard router's own
  candidate models (capable/efficient) and can gate on them directly. It cannot see a LiteLLM
  auto-router's internal candidates (that selection happens inside the external LiteLLM process),
  so a LiteLLM auto-router is offered only when the project restricts nothing at all — the only
  state in which "respects restrictions" can be guaranteed for it.
- **Criterion 11, "unblocks model-related work first"**: by the user's explicit direction, the
  MR's pre-existing budget and member-management redesign work was kept rather than descoped, since
  it reflects prior UX-approved design intent, not something introduced by this task. The model
  work itself was completed to the same standard.

## Non-goals

- MCP project-level configuration (criterion 11 names it as future work, not this ticket).
- A durable "client" concept distinct from project (see above).
- Any change to the LiteLLM proxy or Switchyard engine's own routing algorithms — this ticket only
  gates *which* models/routers a project's callers may reach, not how routing decides among them.
