# Premium Model Indication — Story

**Date**: 2026-08-14
**Status**: Approved
**Ticket**: [EPMCDME-14126](https://jiraeu.epam.com/browse/EPMCDME-14126) (epic: EPMCDME-13283)

---

## Context

- The platform already supports "premium" models for billing: deployments configure premium model name aliases, and usage of those models is charged against a separate "Premium models" budget category at higher rates.
- The model list API (`GET /v1/llm_models`) previously exposed no premium indicator, so the UI had no way to know which models are premium.
- Premium models appear in the chat model picker, the assistant configuration form, and the chat Configuration panel with no cost indication — users can unknowingly incur premium charges.
- The budgets administration page shows a "Premium models" budget card per project, but admins cannot see which models that budget covers.
- The Help Center is a link hub with no deployment-specific model information.

---

## Story

**As a** CodeMie user chatting with assistants, **I want** to clearly see when I'm using a premium model and that higher rates apply, **so that** I don't unknowingly generate unexpected costs for my project.

**As a** project/admin budget owner, **I want** to see which models are covered by the premium budget, **so that** I can understand and control premium spending.

---

## Background

Premium models (e.g. Claude Opus) are billed at significantly higher rates against a dedicated budget. Today nothing in the UI communicates this: model pickers show plain names, and an active chat gives no cost signal. Users discover premium usage only after the fact in spend reports. With premium models becoming more prominent, the cost implication must be visible at selection time and during use.

---

## Acceptance Criteria

- [ ] Given the premium models feature is configured on the deployment, when a user opens the model picker in chat or assistant configuration, then premium models are marked with a visible "Premium" badge, and hovering the badge explains that higher usage rates apply.
- [ ] Given a user selects a premium model in a chat, when the model becomes active, then the chat input area is visually highlighted, a dismissible notice appears stating that a premium model is active and higher rates apply, and the notice offers a link to more details.
- [ ] Given a user dismissed the premium notice, when they switch to a different model or chat, then the notice reappears if a premium model becomes active again; and when a non-premium model is selected, then all premium indications disappear.
- [ ] Given a user hovers the active premium model selector or the highlighted input, when the tooltip appears, then it states that the model is premium and higher rates apply.
- [ ] Given any user, when they open the "Available models" page from the Help Center, then they see all deployment models with provider, capabilities, cost per 1M tokens, and premium marks, and can filter by text, provider, and "Premium only".
- [ ] Given a project admin views a project with an assigned premium budget, when they look at the Premium models budget card, then they see a link navigating to the list of covered premium models.
- [ ] Given the premium feature is not configured on a deployment, when any model surface is shown, then no premium badges, highlights, or notices appear.

---

## Out of Scope

- Per-message indication of which model generated a specific reply.
- Displaying exact prices inside chat or model pickers (rates live only on the models catalog page).
- Premium model lists on the public documentation site (it is static and shared across deployments).
- Model lists in user-level budget views (possible follow-up).
- Chats using "Assistant Default" model resolution: premium highlighting in chat applies to explicitly selected models only (the assistant's configured default is resolved server-side).

---

## Open Questions

- Should organization/project admins be able to restrict premium model selection to certain roles or projects in the future?

---

## Mockups

Approved design mockups are attached to the Jira ticket [EPMCDME-14126](https://jiraeu.epam.com/browse/EPMCDME-14126) (chat input states, tip placement, assistant form, models catalog, budget card).

Live verification screenshots: `docs/superpowers/specs/2026-08-13-premium-model-indication-screenshots/`
