# Requirements — epmcdme-13611-copy-table-button-behavior

**Source**: ticket:EPMCDME-13611
**Work Item**: docs/superpowers/work-items/epmcdme-13611-copy-table-button-behavior.md
**Original input**: |
  EPMCDME-13611

## Goal

Fix the Copy button on Markdown tables in AI Assistant output so it auto-hides when the pointer leaves the hover area, without requiring an additional click.

## Acceptance Criteria

- Copy button appears when user hovers over a Markdown table in assistant output.
- After clicking the Copy button, table content is copied as expected.
- Copy button is hidden when the pointer leaves the table/button hover area.
- Copy button does not remain visible until an additional click.
- Existing message/table copy functionality is not broken.
- Behavior is verified with a generated Markdown table in AI Assistant output.

## Context

- Affected areas: AI Assistant output rendering, Markdown table UI, Copy table button behavior, hover/dismiss interaction in chat response content.
- The button currently persists in a "visible" state after being clicked — likely because a click-triggered state change (e.g. toggling a CSS class or React state like `copied: true`) overrides the CSS hover-only visibility rule.
- Fix scope: frontend only, no backend changes required.
- Branch: EPMCDME-13611_fix-copy-table-button-behavior (already created).

## Open questions

(none)
