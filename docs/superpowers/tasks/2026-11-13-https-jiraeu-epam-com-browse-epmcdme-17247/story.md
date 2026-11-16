---
schema_version: 1
id: hosted-apps-click-opens-app
mode: single
repository: codemie-ui
---
# Clicking a hosted app opens it — Story

**Date**: 2026-11-13
**Status**: Approved
**Architecture review**: intent, 2026-11-13, b847fe0e73ac
**Ticket**: EPMCDME-17247

---

## Context

- Every hosted application tab (My apps, Project, Marketplace, Shared with me) shows apps as cards in a grid; there is no list or row view. Clicking the card body today opens the app's **details page**, not the edit page. The edit page is one more click away (managers see an Edit button first on details).
- Opening the app itself happens only through a small icon-only button with an eye icon and the tooltip "View". The same action is called "View" in the More options menu and on the details page, and is drawn with three different icons (eye on the card and details, "open" in the menu, a third one for a version's Preview). The eye icon also means "show password" elsewhere in CodeMie.
- The Platform applications tab, in the same Applications area, already launches the app on a card click and labels the action "Open" with the "open" icon. Hosted cards were deliberately made to behave like assistant cards (click = details); this story reverses that for hosted apps.
- An app can be opened only when it has an active version. Without one, a manager sees a next-step button on the card ("Upload version", "Activate version" or "Manage") that leads to details; everyone else sees a disabled eye button with "No active version yet". A suspended app with an active version can still be opened today.
- The More options menu on the card has no "Details" entry: once a card click launches, details would otherwise be reachable only from inside the viewer. The viewer's own menu already links to details ("Manage application" / "Application details").
- No backend change: the list already tells every user whether an app has an active version.

---

## Complexity

**Size**: S (12/36) · **Recommended flow**: sdlc-light

One UI area in `codemie-ui` (hosted card, its action list and the details button, about 5–7 files plus existing tests); the launch path and the Platform card's click-to-open pattern already exist, no backend or security surface changes.

---

## Story

**As a** CodeMie user browsing hosted applications, **I want** a click on an app's card to open the app **so that** I get to the app in one obvious step instead of landing on its details page and hunting for an ambiguous eye icon.

---

## Background

People open a hosted app to use it, far more often than to read its details or edit it. Today a click on the card lands on the details page, and the only way to launch from the list is a small eye icon whose meaning is unclear ("view what?") and which looks different in each place it appears. The Platform apps next to them already open on click, so the two kinds of app cards in one area behave differently.

---

## Acceptance Criteria

- [ ] AC1: Given an app card on any hosted tab for an app with an active version, when the user clicks the card body, then the app opens in the CodeMie viewer — for owners, managers and view-only users alike; the card's accessible name states the action (for example "Open <app name>").
- [ ] AC2: Given the same card has keyboard focus, when the user presses Enter or Space, then the app opens in the viewer, as with a click.
- [ ] AC3: Given an app card for an app with an active version, when the user clicks a button or the More options menu on the card, then only that control's action runs and the app is not launched.
- [ ] AC4: Given an app card for an app **without** an active version, when any user clicks the card body, then the details page opens (managers can upload or activate a version there; others see the app's status) and the viewer is not opened.
- [ ] AC5: Given an app card for an app without an active version and a manager, then the card still shows the manager's next-step button ("Upload version", "Activate version" or "Manage"), and it still leads to details.
- [ ] AC6: Given any app card, when the user opens its More options menu, then it has a "Details" item for every role that opens the app's details page; the details page's own menu does not show it, and the viewer menu keeps its single existing details entry ("Manage application" / "Application details") without a second one.
- [ ] AC7: Given any app card, then it shows no eye-icon button; the card itself is the way to launch it, and the card's More options menu shows an "Open" item with the "open" icon, disabled with "No active version yet" when there is no active version.
- [ ] AC8: Given the card's More options menu and the details page's launch button, then the launch action is labelled "Open" and uses the same "open" icon as the Platform app card; the details page's launch button is labelled "Open" with that icon and stays disabled, with the "No active version yet" explanation, when there is no active version.
- [ ] AC9: Given a view-only user and an app without an active version, then the card shows "No active version yet", its accessible name does not say "Open", and no "Open" control on the card or in its menu is enabled.

---

## Out of Scope

- NG1: Assistant, workflow, datasource and Platform app cards — their click behaviour and icons stay as they are.
- NG2: The "Preview" of a specific, non-active version in the version list — it previews a draft, not the live app, and keeps its own label and icon.
- NG3: Opening a hosted app outside CodeMie (new tab, standalone): apps keep opening only in the CodeMie viewer.
- NG4: Changing who may open, edit or see an app's details, or what the viewer and details page show.
- NG5: Download and other More options items added by EPMCDME-17228 and related stories — this story only adds "Details" and renames View → Open.
- NG6: Suspension rules: a suspended app with an active version keeps opening as it does today.

---

## Decisions

- D1: The premise "click goes to edit" → corrected: a click goes to the details page today; this story changes it to launch the app — user (confirmed after research).
- D2: How users reach details once a click launches → a "Details" item in the card's More options menu for every role; managers' next-step buttons on non-openable cards keep leading to details; the viewer's existing link stays — user.
- D3: Click on an app with no active version → opens the details page for every role, not the viewer and not a dead card — user.
- D4: The eye icon → removed from the card (the card click launches); the action is renamed View → Open and uses the "open" icon everywhere (menus, details button), matching the Platform app card in icon and label (the Platform card also keeps a visible Open button; hosted cards do not, to keep room for the status line) — user.
- D5: Keyboard activation (Enter/Space) follows the click — proposed by PO: the card is already a keyboard-focusable button whose key press runs the same click (technical-analysis §2, Purpose A).
- D6: Suspended apps with an active version open on click, as they do today from the eye button — proposed by PO: suspension does not block launch now (technical-analysis §2, Purpose B); changing that is NG6.
- D8: With the eye button gone, the card menu shows "Open" again (disabled without an active version), and the card's accessible name says "Open <name>" so the launch is announced — proposed by PO: architecture review (AR-1).
- D9: "Details" is added to the card menu only; the viewer keeps its existing details entry and labels on purpose, and the details page does not link to itself — proposed by PO: architecture review (AR-2).
- D7: Version "Preview" keeps its own label and icon — proposed by PO: it previews a chosen non-active version, a different action from opening the live app (technical-analysis §2, Decisions Already in the Code).

---

## Open Questions

- None

---

## Constraints

- Single repository: `codemie-ui`. `codemie` (backend) was researched and is not affected: the list already carries whether an app has an active version (technical-analysis.md, Repositories).
- Landing order and owner approvals: no workspace-level `AGENTS.md` / `CLAUDE.md` found at `/Users/yanaasadchaya/Projects/epam/airun`; none recorded.
- Coordinate with EPMCDME-17228 (adds Download to the same More options menu): both stories edit the same action list; whichever lands second rebases.

---

## Sources

- `/Users/yanaasadchaya/Projects/epam/airun/codemie-ui` · repository (researched at `origin/main`)
- `/Users/yanaasadchaya/Projects/epam/airun/codemie/.claude/worktrees/infallible-margulis-51ff71` · repository (read-only, not affected)
