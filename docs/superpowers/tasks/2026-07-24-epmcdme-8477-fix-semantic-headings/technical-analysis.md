# Technical Research

**Task**: assistants marketplace templates heading accessibility semantic
**Generated**: 2026-07-24T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Fix accessibility bug EPMCDME-8477: The '140 ASSISTANTS' heading is not semantically marked as a heading. Three affected areas: (1) '140 ASSISTANTS' heading on the Marketplace/Assistants page, (2) '№ ASSISTANT' heading on the Project Assistants page, (3) '№ TEMPLATES' heading on the Templates page. Each of these count+label elements needs to be programmatically determined as heading level 2 (h2) for accessibility. Currently they render visually as headings but lack semantic HTML heading markup.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx` — Primary fix target. Renders the count heading for all three assistant tabs (Project Assistants, Marketplace, Templates). Lines 66-69 contain a `<div>` with `{totalCountInfo}` that produces "140 ASSISTANTS", "N ASSISTANT", or "N TEMPLATES" depending on context. A single `<div>` → `<h2>` change here fixes all three scopes.
- `src/pages/assistants/AssistantsListPage.tsx` — Page wrapper; passes `tab` prop selecting scope (ALL=Project Assistants, MARKETPLACE, TEMPLATES); renders `AssistantsList` → `AssistantGrid`.
- `src/pages/assistants/components/AssistantList/AssistantList.tsx` — Passes `totalCount` down to `AssistantGrid`.
- `src/pages/assistants/components/AssistantsNavigation/AssistantsNavigation.tsx` — Sidebar nav; tab IDs map "Project Assistants" (ALL), "Marketplace" (MARKETPLACE), "Templates" (TEMPLATES) — confirms the three affected scopes are all served by `AssistantGrid`.
- `src/pages/workflows/components/WorkflowTemplates.tsx` — Renders a separate workflow templates count as a `<div>` at lines 147-150; this is the workflow-domain Templates page, not the assistant Templates tab. May or may not be in scope — see Risks.
- `src/constants/index.ts` — `AssistantTab` enum: ALL, MARKETPLACE, TEMPLATES, FAVORITES, USER.
- `src/pages/skills/components/SkillsGrid.tsx` — Mirror component with identical `<div>` anti-pattern for skills count; out of scope but illustrates the pattern is widespread.
- `src/pages/katas/components/AIKatasContent.tsx` — Also uses `<div>` for count; out of scope.

### Architecture and Layers Affected

- **Page layer**: `AssistantsListPage.tsx` — entry point for the three affected tab views.
- **List layer**: `AssistantList.tsx` — passes `totalCount` down.
- **Grid/display layer**: `AssistantGrid.tsx` — renders the count heading markup; this is where the `<div>` → `<h2>` change belongs.
- **Route layer**: `router.tsx` — maps routes to `AssistantsListPage` with different `tab` props; not modified.
- **Store layer**: Valtio `assistantsStore` — provides `totalCount` and pagination data; not modified.

Only the Grid/display layer requires a markup change. The Page, List, Store, and Route layers are unaffected.

### Integration Points

- `AssistantGrid` consumes `totalCount` from `AssistantList` (prop drilling from Valtio store snapshot).
- `pluralize()` utility from `@/utils/helpers` formats the count-label string.
- `AssistantGrid` already wraps content in a `<section>` element — the `<h2>` would be the section's implicit heading label.
- `PageLayout` likely renders the page-level `<h1>` — the `<h2>` on the count heading would be the correct next level in the sequential hierarchy.

### Patterns and Conventions

- Count-label heading pattern: `` `${count} ${pluralize(count, 'noun').toUpperCase()}` `` — used in AssistantGrid, WorkflowTemplates, SkillsGrid, WorkflowsList, AIKatasContent; all currently render as styled `<div>`.
- React functional components wrapped with `React.memo`.
- Tailwind CSS styling on the count element: `text-xs text-text-quaternary font-semibold pb-4 pt-6` — these classes remain unchanged; only the element tag changes.
- State management: Valtio proxy + `useSnapshot` for reactive rendering.
- Section wrapping: `AssistantGrid` already uses `<section>` around the count + grid; `WorkflowTemplates` also uses `<section>`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — Directly relevant. Explicitly mandates `<h1>→<h2>→<h3>` sequential hierarchy with no skipped levels. Provides the semantic HTML quick reference table and targets WCAG 2.1 AA compliance.
- `.ai-run/guides/testing/testing-patterns.md` — Specifies that tests should prefer `getByRole('heading', { name: ... })` over `getByText` for heading assertions. Vitest + RTL conventions.
- `.ai-run/guides/quality-gates.md` — Pre-MR gates: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration` must all pass.

### Architectural Decisions

- Project accessibility guide mandates WCAG 2.1 AA as the compliance target.
- Sequential heading hierarchy (`h1` → `h2` → `h3`) is a documented project requirement — using `<h2>` for the count heading is the correct level assuming `PageLayout` renders `<h1>` for the page title.
- Role-based test queries (`getByRole`) are the preferred assertion style per the testing guide.

### Derived Conventions

- The count-label heading is visually styled to look like a heading but currently uses a `<div>`; all parallel components (SkillsGrid, WorkflowsList, etc.) follow the same non-semantic pattern — the fix establishes a corrected pattern for future reference.
- `<section>` wrapping is already in place; adding `<h2>` inside the section is the natural semantic completion.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/assistants/components/AssistantList/AssistantGrid/__tests__/AssistantGrid.test.tsx` — Covers empty-state messages only. No test asserts the count heading's role or tag.
- `src/pages/workflows/components/__tests__/WorkflowTemplates.test.tsx` — Line 84 asserts `getByText('2 TEMPLATES')` by text content, not by role. If `WorkflowTemplates` is also fixed, this assertion must be updated to `getByRole('heading', { name: '2 TEMPLATES' })`.
- `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` — Integration tests for the list page; no assertions on heading role for the count.
- `src/pages/assistants/__tests__/AssistantTemplatesPagination.integration.test.tsx` — Integration tests for template pagination.
- `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx` — Integration tests for workflow template pagination; sets `totalCount = 0`.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library.
- Two workspace projects: `unit` (`*.test.tsx`) and `integration` (`*.integration.test.tsx`).
- Preferred query for headings: `screen.getByRole('heading', { name: /pattern/, level: 2 })`.
- Fixtures: MSW or inline mocks; component tests use `render` directly.

### Coverage Gaps

- `AssistantGrid.test.tsx` has no test case verifying the count element has `role="heading"` or is rendered as `<h2>`. A new test case is needed.
- No existing test validates heading level (h2) for any of the three affected scopes (Project Assistants, Marketplace, Templates count labels).
- If `WorkflowTemplates.tsx` is in scope, its existing `getByText('2 TEMPLATES')` assertion will break after the fix and must be updated.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are relevant to this markup-only change.

### Configuration Files

No configuration files are relevant to this change. Tailwind class names on the element remain unchanged.

### Feature Flags and Deployment Concerns

No feature flags or deployment concerns. This is a pure HTML semantics fix with no runtime behavior change.

---

## 6. Risk Indicators

- **Scope ambiguity — "Templates page"**: The ticket references "N TEMPLATES heading on the Templates page." Two candidates exist: (a) the Templates tab within `AssistantGrid` (assistant templates, served by `AssistantGrid.tsx`) and (b) the Workflow Templates page (`WorkflowTemplates.tsx`). The navigation in `AssistantsNavigation.tsx` confirms a "Templates" tab under Assistants; the ticket likely means assistant templates. Clarification recommended before touching `WorkflowTemplates.tsx`.
- **Single component covers all three scopes**: `AssistantGrid.tsx` handles ALL (Project Assistants), MARKETPLACE, and TEMPLATES tabs through a single `totalCountInfo` render block. One change fixes all three — but also means a regression in any one scope breaks all three.
- **No existing heading-role test coverage**: None of the three affected count labels have tests asserting `role="heading"`. New tests must be added; without them the fix is unverifiable by CI.
- **`WorkflowTemplates.test.tsx` line 84 will break** if `WorkflowTemplates.tsx` is included in scope — `getByText('2 TEMPLATES')` will need updating to a role query.
- **Heading level assumption**: The fix targets `<h2>`. This is correct only if `PageLayout` renders `<h1>` for the page title. If the page has no `<h1>` or already uses `<h2>` for a title, the level choice must be adjusted. The accessibility guide mandates no skipped levels — verify heading hierarchy on each affected page before committing to `<h2>`.
- **Pattern proliferation**: The same `<div>` anti-pattern exists in `SkillsGrid.tsx`, `WorkflowsList.tsx`, and `AIKatasContent.tsx`. These are out of scope but represent known technical debt.
- **No docs for count-heading pattern**: No guide documents the intended semantic tag for count headings — the fix itself will establish the precedent.

---

## 7. Summary for Complexity Assessment

The task is a focused HTML semantics fix confined almost entirely to a single display-layer component: `AssistantGrid.tsx`. All three accessibility violations reported in the ticket (Project Assistants count, Marketplace count, Templates count) are rendered by the same `<div>` element in that file, meaning a single tag change from `<div>` to `<h2>` resolves all three scopes simultaneously. The page, list, store, and route layers require no changes. If the workflow Templates page (`WorkflowTemplates.tsx`) is confirmed in scope, it is a second independent single-line change in a parallel component.

The task follows a well-established project pattern: `<section>` wrappers are already in place, Tailwind classes on the element are unchanged, and the accessibility guide explicitly documents the `<h2>` requirement. There is no technical novelty. The only architectural judgment required is confirming the heading level (h2 vs h3) by verifying the existing `<h1>` on each affected page — this is a read-only investigation, not a design decision.

Test coverage for the affected areas is the primary risk. `AssistantGrid.test.tsx` has no assertion on the count heading's role, and `WorkflowTemplates.test.tsx` uses a `getByText` assertion that will break if that component is also fixed. New unit test cases asserting `getByRole('heading', { name: /ASSISTANTS/i, level: 2 })` (and equivalents for TEMPLATES) are required to make the fix verifiable by CI. Overall complexity is low: one to two source file changes, one to two test file updates, no migration, no config change, no new dependencies.
