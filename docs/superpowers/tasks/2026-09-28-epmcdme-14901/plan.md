# Remove NEW Badges Except xWiki Datasource — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `NEW` badge from every feature/datasource that currently shows one, except the
xWiki datasource, which keeps it.

**Architecture:** Three independent, data-only edits — no markup change, no gating change. Each
site assigns `badge: 'NEW'` via a plain condition; narrow/delete that condition so only xWiki
qualifies. Rendering (`item.badge && <span>...`) is generic and untouched in all three files.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library.

**Requirements:** Jira EPMCDME-14901 (inline text, no spec.md — see Acceptance criteria below).

**Commit per task using the repository's existing convention.**

## Acceptance criteria

- [ ] NEW badges are removed from all CodeMie UI features except the xWiki datasource.
- [ ] The xWiki datasource continues to display the NEW badge.
- [ ] No other datasource or feature displays the NEW badge after the change.
- [ ] The change does not affect feature availability or datasource functionality.
- [ ] The UI remains visually consistent after the badges are removed.
- [ ] No regressions are introduced in the Data Sources UI.

## Global Constraints

- Never touch the gating conditionals (`isSkillsEnabled`, `isEnterpriseEdition()`,
  `isSchedulersViewEnabled`) that decide whether a nav item renders — only the `badge` field goes.
- Never change `INDEX_TYPES` values or the shared badge-rendering markup in `NavigationLink.tsx`,
  `DataSourceTypeSelector.tsx`'s `itemTemplate`, or `Filters.tsx` — those stay generic; only the
  data (which key gets `badge: 'NEW'`) changes.
- Never add a badge where none exists today (e.g. `SidebarNavigation.tsx` has an unused `badge`
  field — out of scope).
- Don't special-case the pre-existing SVN selector/filter inconsistency — narrowing both files to
  xWiki-only resolves it naturally.

## Negative-constraint pass

- "remove ... from all features except xWiki" / "no other datasource or feature displays" →
  honored by Tasks 1–3 deleting/narrowing every other badge site; violated only if a badge were
  left on Skills, AI Katas, Analytics, or any non-xWiki `INDEX_TYPES` key — none is.
- "does not affect feature availability or datasource functionality" → honored by leaving every
  `if (isSkillsEnabled)`/`isEnterpriseEdition()`/`isSchedulersViewEnabled` gate and every
  `INDEX_TYPES` value untouched; Tasks 1–3 edit only the `badge:`/badge-condition lines.
- "UI remains visually consistent" / "no regressions in Data Sources UI" → honored by not touching
  any rendering markup (`NavigationLink.tsx`, `itemTemplate`, `Filters.tsx`); only the data feeding
  those unchanged templates narrows.
- negative-constraints: none additional stated beyond the above (no Non-goals section in the
  ticket).

## Review Focus

- Skills nav item badge must disappear while the item itself still renders when the flag is on —
  covered by Task 1.
- Analytics nav item badge must disappear while the item itself still renders under
  `isEnterpriseEdition()` — covered by Task 1.
- xWiki must keep its badge in the type selector after narrowing the other four keys away —
  already covered by the untouched existing test in Task 2.
- The Data Sources list-page filter (a second, independently-built badge list) must also lose its
  three remaining non-xWiki badges — covered by Task 3.
- AI Katas' unconditional badge must disappear without affecting the item's unconditional render —
  covered by Task 1.

---

### Task 1: Remove NEW badge from Navigation nav items

**Files:**
- Modify: `src/components/Navigation/Navigation.tsx:92` (Skills), `:129` (AI Katas), `:146`
  (Analytics) — delete the `badge: 'NEW',` line from each of the three object literals. No other
  line in any of the three objects changes.
- Test: `src/components/Navigation/__tests__/Navigation.test.tsx`

**Test-first: yes — three new tests asserting the Skills, Analytics, and AI Katas nav links carry
no `'NEW'` text once rendered (Skills/Analytics via the same `mockAppInfoStore.configs` pattern the
file already uses for Schedulers at lines 220–227).**

- [ ] Step 1: Add to `Navigation.test.tsx` (inside the existing `describe('Navigation', …)` block):

```tsx
it('does not show a NEW badge on Skills when the flag is on', () => {
  mockAppInfoStore.configs = [{ id: 'skills', settings: { enabled: true } }] as any
  renderWithRouter(<Navigation />)
  expect(screen.getByText('Skills').closest('a')).not.toHaveTextContent('NEW')
})

it('does not show a NEW badge on Analytics when enterprise edition is on', () => {
  mockAppInfoStore.configs = [
    { id: 'features:enterpriseEdition', settings: { enabled: true } },
  ] as any
  renderWithRouter(<Navigation />)
  expect(screen.getByText('Analytics').closest('a')).not.toHaveTextContent('NEW')
})

it('does not show a NEW badge on AI Katas', () => {
  renderWithRouter(<Navigation />)
  expect(screen.getByText('AI Katas').closest('a')).not.toHaveTextContent('NEW')
})
```

- [ ] Step 2: Run `npx vitest run src/components/Navigation/__tests__/Navigation.test.tsx` —
  expect all three new tests to FAIL (each anchor currently contains `NEW`).
- [ ] Step 3: Delete the `badge: 'NEW',` line at each of `Navigation.tsx:92`, `:129`, `:146`.
- [ ] Step 4: Re-run the same test file — expect all tests, new and pre-existing, to PASS.
- [ ] Step 5: Commit.

---

### Task 2: Narrow the Datasource Type selector badge to xWiki only

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceTypeSelector.tsx:65-74` — replace the
  five-key `||` condition with `INDEX_TYPES[key] === INDEX_TYPES.XWIKI`, and reword the comment on
  line 65 to state the badge is xWiki-only.
- Test: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

**Test-first: yes — new test asserting X-ray, SharePoint, SVN, and Azure DevOps Work Item options
carry no `NEW` badge, alongside the existing xWiki-keeps-badge test (lines 421-431), which must
stay green and unmodified.**

- [ ] Step 1: Add a sibling test after the existing `'marks the xWiki option with a NEW badge...'`
  test:

```tsx
it('does not mark X-ray, SharePoint, SVN, or Azure DevOps Work Item with a NEW badge', async () => {
  const user = userEvent.setup()
  renderPage('/data-sources/create')
  await waitForFormReady()

  const selector = await getAutocomplete('Datasource Type')
  await openAutocompleteDropdown(selector, user)

  for (const label of ['X-ray', 'SharePoint', 'SVN', 'Azure Devops Work Item']) {
    const option = await screen.findByText(label)
    expect(option.parentElement).not.toHaveTextContent('NEW')
  }
})
```

- [ ] Step 2: Run
  `npx vitest run src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` —
  expect the new test to FAIL (all four still carry `NEW`).
- [ ] Step 3: In `DataSourceTypeSelector.tsx`, replace the `if` condition at lines 66-72 with a
  single check: `if (INDEX_TYPES[key] === INDEX_TYPES.XWIKI) { return { ...option, badge: 'NEW' } }`,
  and update the preceding comment to say the badge now applies to xWiki only.
- [ ] Step 4: Re-run the same test file — expect the new test and the existing xWiki test to PASS.
- [ ] Step 5: Commit.

---

### Task 3: Narrow the Data Sources list-page filter badge to xWiki only

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceFilters.tsx:112-120` — replace the four-key
  `||` condition with `INDEX_TYPES[key] === INDEX_TYPES.XWIKI`, and reword the comment on line 112.
- Test: `src/pages/dataSources/components/__tests__/DataSourceFilters.test.tsx`

**Test-first: yes — new test capturing the `index_type` filter definition's options (via the
existing `@/components/Filters` capture-stub pattern used for `projectDef`) and asserting only the
xWiki option carries `badge: 'NEW'`.**

- [ ] Step 1: Extend the `@/components/Filters` mock to also capture the `index_type` definition,
  and add a test:

```tsx
let capturedIndexTypeOptions: any[] = []
// inside the existing vi.mock('@/components/Filters', ...) factory, alongside projectDef capture:
//   const indexTypeDef = filterDefinitions?.find((d: any) => d.name === 'index_type')
//   if (indexTypeDef) capturedIndexTypeOptions = indexTypeDef.options

it('marks only xWiki with a NEW badge in the type filter', () => {
  render(<DataSourceFilters onApplyFilters={vi.fn()} />)
  const badged = capturedIndexTypeOptions.filter((o) => o.badge === 'NEW')
  expect(badged.map((o) => o.label)).toEqual(['xWiki'])
})
```

- [ ] Step 2: Run
  `npx vitest run src/pages/dataSources/components/__tests__/DataSourceFilters.test.tsx` — expect
  the new test to FAIL (X-ray, SharePoint, Azure Devops Work Item also badged).
- [ ] Step 3: In `DataSourceFilters.tsx`, replace the `if` condition at lines 113-118 with
  `if (INDEX_TYPES[key] === INDEX_TYPES.XWIKI) { return { ...option, badge: 'NEW' } }`, and update
  the preceding comment.
- [ ] Step 4: Re-run the same test file — expect the new test and existing debounce test to PASS.
- [ ] Step 5: Commit.
