# Remove spend qualification suffix — Story

**Date**: 2026-11-06
**Status**: Approved
**Architecture review**: intent, 2026-11-06, c5a1c70f980c
**Ticket**: EPMCDME-16942

---

## Context

- The spend qualification suffix formatter is already a no-op: it always returns an empty string, so no suffix is ever shown to users.
- It is still called from about 14 files across the analytics widgets (tables, bar charts, metric cards, ratio widgets, leaderboard summary) and the settings administration budget components (project budgets, project overview, cost center rollup, user budgets, budget spend metrics and cells).
- Several helpers exist only to feed the suffix: the chart suffix wrapper, the metric qualification wrapper, the qualified metric value wrapper, the table cell qualification reader, and the qualification props and combiners in the budget components. Metric card and chart markup that can only render through the suffix is unreachable.
- The shared spend qualification reader and type look independent (spending card, user project spending entity), but their only consumers feed the suffix, so they become unused once it is removed.
- Tests that exercise the suffix and its wrappers exist in the analytics formatters tests and a dedicated metric card spend qualification test. The spending amount component has no tests.

---

## Complexity

**Size**: M (18/36) · **Recommended flow**: sdlc-standard

About 18 files edited or deleted across analytics widgets and budget components; all mechanical removals with no new abstractions.

---

## Story

**As a** CodeMie UI maintainer, **I want** the spend qualification suffix formatter and everything that exists only to support it removed, **so that** the analytics and budget code is not cluttered with dead code that implies behaviour users never see.

---

## Background

EPMCDME-16846 turned the spend qualification suffix into a no-op, leaving the function and its callers in place. Callers still pass it through template strings and JSX, and wrappers, props and tests still exist around it. This misleads readers into thinking qualification text is displayed. Removing it completely finishes the follow-up and shrinks the surface of the analytics and budget components.

---

## Acceptance Criteria

- [ ] Given the codebase after the change, when searching for the spend qualification suffix formatter, then no definition, import or call of it remains.
- [ ] Given wrappers, props, helpers, and markup that existed only to produce or pass the suffix, when the change is complete, then they are removed and no unused code related to them remains.
- [ ] Given the shared spend qualification reader, the spend qualification type and the code that only feeds them (the spending card spread, the category qualification helper and the spending amount qualification prop), when the change is complete, then they are removed and the spending card and user project spending views still render the same values.
- [ ] Given tests that exercise only the removed formatter, wrappers or dead markup, when the change is complete, then those tests are removed (including the stub cases in the analytics formatters tests, the metric card spend qualification test, and the suffix-related cases in the budget spend metrics and user project spending tests), while tests for the remaining formatters and components are kept and pass.
- [ ] Given the analytics widgets and budget components that previously called the formatter, when they are rendered after the change, then the displayed text and layout are identical to what users saw before, with no trailing suffix or empty element (checked by comparing rendered output before and after for the metric card and bar charts).
- [ ] Given the project quality gates (lint, type-check, tests), when run after the change, then they pass with no unused-import or unused-variable findings.

---

## Out of Scope

- Removing the spend qualification fields from the metric data model, or changing mocks and mappers outside the suffix chain.
- Any change to how spend values, amounts or budgets are calculated or displayed.
- Adding new tests for components that previously had none, such as the spending amount component.

---

## Decisions

- D1: How far does "dead code related to it" go? → Suffix chain only: remove the function, its usages, wrappers and props that exist only for it, and their tests — user
- D2: Remove the shared spend qualification reader, type and their feeders, which become unused? → Yes, remove them in this story (supersedes the keep-reader part of D1) — user

---

## Open Questions

- None
