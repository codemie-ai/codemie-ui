# Technical Research

**Task**: assistants marketplace cards list accessibility
**Generated**: 2026-10-16
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8478 (Bug, a11y WCAG 1.3.1): "Related assistant cards are not semantically grouped into a list". Steps: open #/assistants, press "Marketplace", inspect DOM of the related assistant cards. Actual: cards not semantically marked as a list. Expected: cards should be programmatically determined as a list (ul/li or role=list/listitem). Also reproduces for: assistant cards on the "Project Assistants" page, and template cards on the "Templates" page.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx` — renders `<section>`, an `<h2>` count, then a `<div className="... grid ...">` that maps `assistantList` (assistants or templates via `isTemplate`) to `<AssistantCard>`. No ul/li/role. Single render path for Marketplace, Project and Templates.
- `src/pages/assistants/components/AssistantList/AssistantList.tsx` — wraps AssistantGrid; routes `assistants`, `assistants/project`, `assistants/marketplace`, `assistants/templates` in `src/router.tsx` (L134-155) all use `AssistantsListPage`.
- `.../AssistantCard/AssistantCard.tsx` — returns a fragment: `<Card>` plus `RemoveFavoriteConfirmPopup` and `UnpinAssistantConfirmPopup` siblings (so a wrapping `<li>` must live in the grid, or the card, with care for the popups).
- `src/components/Card/Card.tsx` — shared presentational card; root is `<div onClick ... className="h-card ... w-full">` preceded by a `<Tooltip>` fragment sibling. Also used by ApplicationCard, SkillCard, AIKatasContent, AwsEntityList (5 other consumers).
- `src/pages/favorites/FavoritesPage.tsx` L51-155 — same pattern: `GRID_CLASS` `<div>` mapping AssistantCard (also skills/workflows). Not named in the ticket.
- Precedent in repo: `AssistantDetails/components/ConversationStarters.tsx` uses `<ul role="list" aria-label=...>` + `<li>`.

### Architecture and Layers Affected
UI presentation only (React components): AssistantGrid (list container), possibly AssistantCard/Card (item wrapper). No store/API changes.

### Integration Points
AssistantGrid <- AssistantList <- AssistantsListPage. AssistantCard also consumed by FavoritesPage. Grid uses Tailwind grid with `justify-items-center`; `<li>` children would need `w-full`/list-style reset (Tailwind preflight removes bullets).

### Patterns and Conventions
`.ai-run/guides/patterns/accessibility-patterns.md` checklist: "Lists use `<ul>`, `<ol>`, or `<dl>`"; anti-pattern table lists repeated `<div>` vs `<ul>/<ol>`. The "related" cards in the ticket were not located under a distinct name (grep for "related assistant" found nothing relevant); presumed to be the Marketplace grid.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/patterns/accessibility-patterns.md`, `.ai-run/guides/components/component-patterns.md`, `reusable-components.md`.

### Architectural Decisions
None specific found.

### Derived Conventions
`<ul role="list">` with `aria-label` used in ConversationStarters.

---

## 4. Testing Landscape

### Existing Coverage
- `AssistantGrid/__tests__/AssistantGrid.test.tsx` — empty state and count heading; mocks AssistantCard to `<div data-testid="assistant-card"/>`, mocks `@/router`.
- `AssistantCard/__tests__/AssistantCard.test.tsx`, `getAssistantCardInfo.test.tsx`, `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx`.

### Testing Framework and Patterns
Vitest + React Testing Library (unit and integration projects); `vi.mock` stubs.

### Coverage Gaps
No test asserts list/listitem roles on the grid. No Card tests found in `components/Card`.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
Tailwind (`tailwind.config.ts`; custom `card-grid-2`/`card-grid-3` breakpoints).

### Feature Flags and Deployment Concerns
Pin/favorite buttons gated by flags inside AssistantCard; no deployment concerns.

---

## 6. Risk Indicators

- Speculative: Card root div has `onClick` (no keyboard semantics); out of scope, but wrapping in `<li>` must not alter click behavior.
- Speculative: AssistantCard returns sibling popups/tooltip; placing `<li>` wrapper in AssistantGrid avoids invalid children inside `<ul>`.
- Speculative: Changing shared `Card` affects 5 other consumers; prefer wrapping in the grid.
- Speculative: Tailwind grid + `justify-items-center` with `li` may change layout; need `w-full`.
- Speculative: FavoritesPage has the same issue and might be fixed for consistency.
- "Related assistant cards" naming not mapped to a distinct component; assumption of Marketplace grid unverified in browser.

---

## 7. Summary for Complexity Assessment

All three reported pages (Marketplace, Project Assistants, Templates) share one render path: `AssistantGrid.tsx`, which maps cards inside a plain grid `<div>`. The fix surface is small, likely one component plus its test; FavoritesPage has an analogous grid not named in the ticket.

No novel technique is involved; the repo already has a `ul role="list"` precedent and an accessibility guide requiring real lists. Layer is UI only, with no API, config or data changes.

Test posture: AssistantGrid has unit tests (with AssistantCard mocked) that can be extended for list/listitem roles. Main risks are layout regression from list markup and affecting the shared Card if modified.

---

## 8. External References

None named by the task.
