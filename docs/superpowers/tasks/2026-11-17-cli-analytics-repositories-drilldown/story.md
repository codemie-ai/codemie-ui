# CLI Analytics Repositories Drill-down — Story

**Date**: 2026-11-17
**Status**: Approved
**Architecture review**: intent, 2026-11-17, 4029355e69f3
**Ticket**: EPMCDME-17349 (https://jiraeu.epam.com/browse/EPMCDME-17349)

---

## Context

- The Repositories tab in AI Attribution / CLI Analytics shows a paginated list of projects. Each project is an accordion that expands to repositories and then branches.
- Clicking a project, repository or branch opens one shared modal with a Summary block and a Sessions table.
- Repositories are already available as a separate paginated list that can be filtered by project.
- Each project row currently carries its nested repositories, so the tab loads more than it shows.
- The backend contract (FE API contract, same ticket, backend repository) now defines the paged projects list without nested repositories, the paged repositories list per project, the new paged branches list per repository, and an option on sessions to select sessions with no branch.
- Sessions with no project, no repository or no branch exist and must stay reachable.

---

## Complexity

**Size**: L (22/36) · **Recommended flow**: sdlc-standard

A flat project table plus two new list-in-modal views, per-level data loading, and a shared modal that has other callers; about 6-8 files change and 4-6 are new, and roughly 620 lines of accordion tests need rewriting.

---

## Story

**As a** CodeMie platform admin or team lead reviewing AI attribution, **I want** to drill down from projects to repositories to branches to sessions, one modal at a time, **so that** each screen opens fast and shows only the data for the level I am looking at.

---

## Background

The Repositories tab loads and renders a whole project, repository and branch tree inside accordions, even though a reviewer looks at one project at a time. This makes the tab slow for large installations and mixes three levels in one table. A step-by-step drill-down loads only the data for the screen the user is on.

---

## Acceptance Criteria

- [ ] AC1: Given the Repositories tab, when it loads, then it lists projects only (paginated as today), with no expandable rows, and no repository or branch data is requested.
- [ ] AC2: Given the projects list, when the user clicks a project, then a project modal opens with the same Summary block as today and a paginated repositories list (default page size 10) in place of the Sessions table.
- [ ] AC3: Given the project modal, when it opens, then only that project's summary and the first page of its repositories are loaded, and changing the page loads only that page.
- [ ] AC4: Given the repositories list in the project modal, when the user clicks a named repository, then a repository modal opens with the same Summary block as today and a paginated branches list (default page size 10) in place of the Sessions table. When the user clicks the Unattributed repository row, which has no branches, then the Sessions modal opens directly.
- [ ] AC5: Given the repository modal, when it opens, then only that repository's summary and the first page of its branches are loaded, and changing the page loads only that page.
- [ ] AC6: Given the branches list in the repository modal, when the user clicks a branch, then the existing branch modal opens with its Summary and Sessions table, unchanged.
- [ ] AC7: Given sessions with no project, repository or branch, when the user browses the lists, then each level shows one "Unattributed" row as the last row of the last page, outside the page of 10, that is clickable and opens the matching modal. The Unattributed branch row opens the Sessions modal with only the sessions that have no branch, within the same repository and project scope as the row that was clicked.
- [ ] AC8: Given the Projects tab search box, when the user types, then it filters projects by name only, and its placeholder reads as a project search.
- [ ] AC9: Given a modal is open on top of another, when the user closes it, then the modal below stays open with its list on the same page.
- [ ] AC10: Given a repositories or branches request fails, when the modal is open, then the Summary stays visible and the list shows an error state without closing the modal.
- [ ] AC11: Given a project or repository whose list returns no rows, when its modal opens, then the list shows an empty state and no pagination. A list that holds only the Unattributed row is not empty: it is shown as a normal list.

---

## Out of Scope

- NG1: Search or filters inside the repositories list or the branches list.
- NG2: Changes to the branch modal (Summary and Sessions) or to the other analytics tabs.
- NG3: Implementing the backend endpoints; they are requested as a dependency (see Decisions).
- NG4: Client-side paging of branches as a fallback.
- NG5: Finding a repository by name from the Projects tab; with no search in the lists, a repository is reached through its project, and sessions are listable only at branch level.

---

## Decisions

- D1: Does the story depend on backend endpoints that may not exist? → Yes. The story lists the endpoints it needs, and the backend must return only the data each modal shows (performance-friendly). The backend work and this story are built in parallel and released as one change (see D8). — user
- D2: What does the Projects tab search do? → Searches project names only. — user
- D3: Do the repositories and branches lists have search? → No, pagination only. — user
- D4: How are sessions with no project, repository or branch shown? → As a clickable "Unattributed" row at each level. — user
- D5: Page size for the repositories and branches lists → 10 by default. — user
- D6: What happens to the repository data nested in each project row and to the per-project branch loader built for the accordion? → They are removed. The project modal's repository list uses the existing paged repositories listing filtered by project, and the branch modal list uses the paged branches endpoint. — user (confirmed after PO proposal from the architecture review, finding 1)
- D7: Where does each modal's Summary come from? → From the row that was clicked, so no separate Summary request is made for data already on screen. — user (confirmed after PO proposal from the architecture review, finding 4). Needs the project and repository rows to carry the Summary metrics; to be confirmed against the backend response.
- D8: Who owns the backend work and in what order does it ship? → The backend work is done in the same ticket (EPMCDME-17349) in the backend repository, and this story is released together with it as one change. — user
- D9: Where does the "Unattributed" row sit and does it count toward the page size? → It is the last row of the last page, outside the 10 items, and appears once per list. A repository without a project, a project without a repository, and a repository without a branch each follow this rule at their level. — user

**Backend dependency (D1)** — the following must exist, each returning only what its modal needs:
- Projects: paginated list with totals only, no nested repositories (new or changed).
- Repositories of one project: paginated, with the row metrics the list shows (the existing paged repositories listing, filtered by project, per D6).
- Branches of one repository: paginated, with the row metrics the list shows (new).
- Each list returns the Unattributed row where sessions have no project, repository or branch.
- D1 contract confirmed against the backend FE API contract: the branches endpoint pages, and the projects list omits repositories.
- D10: Which page index does the FE send? → Zero-based, passed straight to the backend (0, 1, 2, 3), with no conversion. — user
- D11: What does a click on the Unattributed repository row open? → The Sessions modal directly, because that row has no branch list. A named repository always opens its branches. — user
- D12: Which request options keep the lists light? → The projects request asks the backend to leave repositories out, and the project-modal repositories request asks the backend to put the Unattributed row last. — user (backend optimization requested during implementation)

---

## Open Questions

- None
