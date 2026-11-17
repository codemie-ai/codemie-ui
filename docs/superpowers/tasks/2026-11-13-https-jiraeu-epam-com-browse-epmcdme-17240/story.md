---
schema_version: 1
id: manager-sharing-ui
parent: hosted-apps-manager-sharing
repository: codemie-ui
depends_on: [manager-sharing-backend]
---
# Let every manager share a hosted app: CodeMie UI — Story

**Date**: 2026-11-13
**Status**: Approved
**Ticket**: —
**Parent**: ../../story.md

---

## Context

- Share and the hosted share dialog appear only when the app response says `can_share`; after `manager-sharing-backend` that is every manager.
- The "Shared with" panel on the app's page is loaded for the creator only, not by `can_share`.
- A moderator sees a separate "Revoke share link" menu item only when they cannot share; once every moderator can share, it never appears.
- The share dialog's people search hides only the current user. Assistants use the same share component.

---

## Complexity

**Size**: S (14/36) · **Recommended flow**: sdlc-light

A few hosted-only files react to a flag that becomes true for more people: regate one panel, drop one menu item, update the tests that pin owner-only visibility.

---

## Story

**As a** manager of a hosted app, **I want** Share, the share dialog and the "Shared with" panel in the CodeMie UI, **so that** I can share the app and manage who has access without the creator.

---

## Background

The parent story makes every manager able to share; the backend child opens the API. This child shows it in the UI.

---

## Acceptance Criteria

- [ ] AC1: Given a manager who is not the creator, when they open the app's list entry, page or viewer, then they see Share and can open the share dialog, add and remove people, and create, copy and revoke the link, whoever added the person or created the link.
- [ ] AC2: Given a manager who is not the creator, when they open the app's page, then the "Shared with" panel shows everyone the app is shared with.
- [ ] AC3: Given a platform admin or maintainer, when they open the app's menu, then there is one way to revoke the link, from the share dialog; the separate "Revoke share link" menu item is gone.
- [ ] AC4 (negative): Given a person who cannot manage the app, when they view it, then no Share and no "Shared with" panel are shown.
- [ ] AC5 (negative): Given a manager searching people in the share dialog, when the creator matches, then the creator is not offered; a refusal from the API is shown as an error message.
- [ ] AC6 (negative): Given an assistant's share dialog, when anyone uses it, then it looks and behaves exactly as before.

---

## Out of Scope

- NG1: Any backend change (child `manager-sharing-backend`).
- NG2: Showing who added a person or who made a change.
- NG3: Changes to the shared share component that affect assistants.

---

## Decisions

- Inherited from the parent: D1–D8.

---

## Open Questions

- None

---

## Constraints

- Depends on `manager-sharing-backend` (`can_share` for managers, people search without the creator).
- Hosted-only files; the shared share component stays as it is for assistants.
