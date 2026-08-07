# Hide Marketplace Sorting on Non-Marketplace Assistants Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development. Execute inline in the sdlc-light Stage 4 conversation (do not dispatch per-task subagents). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show marketplace Sort by / Sort order controls only on the Assistant Marketplace tab; hide them on Project Assistants and other non-marketplace assistants scopes.

**Architecture:** Shared `AssistantsListPage` already passes `activeScope`. Fix the `AssistantFilters` scope filter allowlist so `sort_by` / `sort_order` are included only when `activeScope === ASSISTANT_INDEX_SCOPES.MARKETPLACE`. Strip persisted `sort_by` / `sort_order` for non-marketplace scopes so hidden UI cannot still affect API queries. Cover with integration regression tests.

**Tech Stack:** React, Vitest, Testing Library, PrimeReact Filters accordion, valtio assistants store

## Global Constraints

- Ticket: EPMCDME-13942
- Repo: `codemie-ui` on branch `EPMCDME-13942_hide-marketplace-sorting`
- Commit format: `EPMCDME-13942: <Description>`
- Commit **only changed files** for this ticket (do not stage unrelated dirty `package.json` / `vite.config.ts` / untracked junk)
- Preserve EPMCDME-9984 marketplace sorting behavior
- Favorites / Templates / Project Assistants must not show marketplace sort controls

## Requirements (inline)

Marketplace-related sorting/ordering options must be visible only on the Assistant Marketplace page. Project Assistants and other assistants pages must not display those controls. Marketplace sorting from EPMCDME-9984 must remain functional. Regression tests must cover Marketplace (visible) and Project Assistants (hidden).

### Clarification assumptions

- Favorites also hides sort controls (AC: other assistants pages do not show marketplace-specific controls unless requirements say otherwise; none do for Favorites).
- After hiding the controls, non-marketplace scopes must not send stale persisted `sort_by` / `sort_order` to the API.

## File map

| File | Responsibility |
|---|---|
| `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` | Scope allowlist: keep `sort_by`/`sort_order` only for marketplace |
| `src/pages/assistants/hooks/useAssistantFilters.ts` | Strip stale sort fields for non-marketplace scopes |
| `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` | Visibility regression tests |

---

### Task 1: Regression tests — sort visibility by scope

**Test-first: yes — failing tests that assert SORT BY / SORT ORDER present on marketplace and absent on project assistants (and favorites).**

**Files:**
- Modify: `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx`
- (Implementation in Task 2/3 will make them pass)

**Interfaces:**
- Consumes: `renderPage`, `mockAPI`, existing `createAssistantFixture`
- Produces: new `describe('Marketplace sorting visibility')` block

- [ ] **Step 1: Write the failing tests**

Add this describe block after the existing `Filters and Pagination` describe (before `Project filter display name`):

```tsx
  describe('Marketplace sorting visibility', () => {
    it('shows Sort by and Sort order on Marketplace', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture({ id: 'marketplace-1', name: 'Marketplace Assistant' })],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/users', { data: [] })
      mockAPI('GET', 'v1/assistants/categories', [])

      renderPage('/assistants/marketplace')

      await waitFor(() => {
        expect(screen.getByText('Marketplace Assistant')).toBeInTheDocument()
      })

      expect(screen.getByText('SORT BY')).toBeInTheDocument()
      expect(screen.getByText('SORT ORDER')).toBeInTheDocument()
    })

    it('does not show Sort by or Sort order on Project Assistants', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture()],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/projects', { data: [] })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByText('SORT BY')).not.toBeInTheDocument()
      expect(screen.queryByText('SORT ORDER')).not.toBeInTheDocument()
    })

    it('does not show Sort by or Sort order on Favorites', async () => {
      mockAPI('GET', 'v1/config', [{ key: 'favorites_enabled', value: 'true' }])
      mockAPI('GET', 'v1/favorites', {
        data: [createAssistantFixture({ id: 'fav-1', name: 'Favorite Assistant' })],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/favorites')

      await waitFor(() => {
        expect(screen.getByText('Favorite Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByText('SORT BY')).not.toBeInTheDocument()
      expect(screen.queryByText('SORT ORDER')).not.toBeInTheDocument()
    })
  })
```

If favorites mock shape differs from existing Favorites tests in this file, copy the exact mock pattern from the existing `loads and displays favorite assistants` test and only add the SORT BY / SORT ORDER assertions.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npx vitest run --project integration src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx -t "Marketplace sorting visibility"
```

Expected: Project Assistants (and Favorites) cases **FAIL** because SORT BY / SORT ORDER are currently visible. Marketplace case should **PASS**.

- [ ] **Step 3: Commit tests only**

```bash
git add src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx
git commit -m "EPMCDME-13942: Add failing tests for marketplace sort visibility"
```

---

### Task 2: Restrict sort controls to marketplace scope

**Test-first: yes — Task 1 Project Assistants / Favorites tests fail until this change.**

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` (filter predicate ~lines 194–207)

**Interfaces:**
- Consumes: `ASSISTANT_INDEX_SCOPES`, existing `filterDefinitions`
- Produces: non-marketplace scopes exclude `sort_by` and `sort_order`

- [ ] **Step 1: Implement minimal allowlist fix**

Replace the fall-through `return definition` so non-marketplace / non-templates scopes exclude marketplace sort fields:

```tsx
      ].filter((definition) => {
        if (activeScope === ASSISTANT_INDEX_SCOPES.TEMPLATES) {
          return false
        }
        if (activeScope === ASSISTANT_INDEX_SCOPES.MARKETPLACE) {
          return (
            definition.name === CREATED_BY ||
            definition.name === CATEGORIES ||
            definition.name === 'sort_by' ||
            definition.name === 'sort_order'
          )
        }
        return definition.name !== 'sort_by' && definition.name !== 'sort_order'
      }),
```

- [ ] **Step 2: Re-run visibility tests (GREEN)**

Run:

```bash
npx vitest run --project integration src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx -t "Marketplace sorting visibility"
```

Expected: all three tests **PASS**.

- [ ] **Step 3: Commit implementation**

```bash
git add src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx
git commit -m "EPMCDME-13942: Hide marketplace sort controls outside marketplace"
```

---

### Task 3: Strip stale sort params on non-marketplace scopes

**Test-first: yes — unit test that non-marketplace filter merge drops sort_by/sort_order (or integration asserting project assistants fetch URL has no sort_by).**

**Files:**
- Modify: `src/pages/assistants/hooks/useAssistantFilters.ts`
- Create (preferred): `src/pages/assistants/hooks/__tests__/useAssistantFilters.test.ts`
  - OR extend integration test if unit harness for this hook is awkward

**Interfaces:**
- Consumes: `ASSISTANT_INDEX_SCOPES` (import from `@/constants/assistants`), `filters` memo
- Produces: for scopes other than `marketplace`, returned `filters.sort_by === null` and no meaningful `sort_order` sent downstream (match existing strip behavior: delete `sort_order` when `sort_by` absent)

- [ ] **Step 1: Write failing unit test**

Create `src/pages/assistants/hooks/__tests__/useAssistantFilters.test.ts` that:
1. Seeds filter storage for `assistants.visible_to_user` with `{ sort_by: 'usage', sort_order: 'asc' }` (use the same storage helpers the hook uses: `setFilters` / `FILTER_ENTITY` from `@/utils/filters`, and mock `userStore` if required by existing patterns).
2. Renders the hook with `scope: 'visible_to_user'`.
3. Asserts `result.current.filters.sort_by` is `null` (or falsy) so `indexAssistants` will not append sort query params.

If unit-testing the hook is blocked by heavy store deps, instead add an integration assertion: with localStorage pre-seeded, Project Assistants fetch URL must not contain `sort_by=`.

- [ ] **Step 2: Run test — expect RED**

- [ ] **Step 3: Implement strip in `useAssistantFilters`**

In the `filters` `useMemo`, after building `result`, if `scope !== ASSISTANT_INDEX_SCOPES.MARKETPLACE`, force:

```ts
result.sort_by = null
// keep sort_order default harmless; store only sends sort_order when sort_by is set
```

Import `ASSISTANT_INDEX_SCOPES` from `@/constants/assistants`.

Optionally also persist the cleaned filters for that key so localStorage does not keep rehydrating stale sort — only if the failing test requires it; prefer the smallest change that stops API sort params.

- [ ] **Step 4: Run test — expect GREEN**

- [ ] **Step 5: Re-run Task 1 visibility suite + this new test**

- [ ] **Step 6: Commit only these files**

```bash
git add src/pages/assistants/hooks/useAssistantFilters.ts src/pages/assistants/hooks/__tests__/useAssistantFilters.test.ts
# (or the integration test file if that path was used instead)
git commit -m "EPMCDME-13942: Ignore stale marketplace sort on other scopes"
```

---

## Self-review

1. **Spec coverage:** Marketplace-only visibility → Tasks 1–2. Other pages → Task 1 favorites + Task 2 exclude. 9984 remains (marketplace whitelist unchanged). Regression tests → Task 1. Stale API sort → Task 3. Commit-only-changed-files → every commit step lists explicit paths.
2. **Placeholders:** None.
3. **Consistency:** Field names `sort_by` / `sort_order`; scope `ASSISTANT_INDEX_SCOPES.MARKETPLACE`; labels `SORT BY` / `SORT ORDER` match Filters `toUpperCase()`.
