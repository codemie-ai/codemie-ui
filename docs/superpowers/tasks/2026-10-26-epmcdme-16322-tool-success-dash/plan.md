# Tool Success Dash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render CLI Analytics Tool Success as an em dash (—) instead of 0% on the Overview summary, the Users per-user detail column and the user modal summary whenever the selected sessions contain no tool calls.

**Architecture:** The two `UserRow`-backed surfaces (table column and modal tile) share one new exported pure formatter in `format.ts`, tested directly — that is where the duplication actually is. The Overview subtitle has different copy (one decimal plus a `% success` suffix) so it keeps its own inline guard. Every branch is on the **tool-call counter**, never on the rate, so a genuine 0% still renders as a percentage. No API, type or backend change.

**Tech Stack:** React 18 + TypeScript, Vitest + @testing-library/react.

**Spec:** Jira EPMCDME-16322 (acceptance criteria reproduced under Global Constraints) and `technical-analysis.md` in this directory. `technical-analysis-backend.md` records why the backend is deliberately untouched.

## Global Constraints

- AC1 — Tool Calls = 0 → Tool Success displays as a dash on Overview, in Per-user detail and in the user modal Summary.
- AC2 — Tool Calls > 0 → Tool Success displays as a percentage as before, **including a real 0% when all calls failed**.
- The dash glyph is the em dash `—` (U+2014), matching `formatDuration` and `truncateModelName` in `format.ts`.
- Branch on the tool-call counter (`total_tool_calls` / `tool_calls`), never on the rate value. A truthiness check on the rate would wrongly dash a real 0%.
- `MetricFormat.PERCENTAGE` runs `Number(value).toFixed(2)` with no non-numeric guard, so any `Metric` carrying the dash string must **omit** `format` or it renders `NaN%`.
- Do not touch `buildRepoMetrics` in `format.ts`, `RepositoriesView.tsx` or `SessionBody.tsx` — those surfaces are outside the acceptance criteria and share code with the Repositories tab.
- Commit messages: `EPMCDME-16322: Capital sentence` (Tekton CI blocks on violations).

## Review Focus

- `tool_calls` arriving as `undefined` (the field is optional in `UserRow`) must count as "no tool calls" and dash, not throw or render `NaN%` — Task 1.
- A genuine total failure (`tool_calls: 12`, `tool_success_rate: 0`) must render `0.00%`, not a dash — Task 1, and the single most likely way to break AC2.
- `tool_success_rate` arriving as `undefined` while `tool_calls > 0` must render `0.00%` rather than `NaN%` or a dash — Task 1.
- The Overview subtitle must drop the `% success` suffix entirely when dashing, rather than rendering `— success` — Task 3.
- The Repositories tab and session-detail Tool Success must be byte-identical after this change, since they read sibling code — Task 2 step 5 guards this with the full unit suite.

---

### Task 1: `formatToolSuccess` pure formatter

**Files:**
- Modify: `src/pages/analytics/components/cli-analytics/format.ts` (add a new export; leave `buildRepoMetrics` untouched)
- Test: `src/pages/analytics/components/cli-analytics/__tests__/format.test.ts`

**Interfaces:**
- Consumes: `formatMetricValue` and `MetricFormat` from `@/utils/analyticsFormatters` / `@/types/analytics`.
- Produces: `formatToolSuccess(rate: number | null | undefined, toolCalls: number | null | undefined): string` — returns `'—'` when `(toolCalls ?? 0) === 0`, otherwise `formatMetricValue(rate ?? 0, MetricFormat.PERCENTAGE)` (e.g. `'95.00%'`). Task 2 consumes this.

**Test-first: yes** — `format.test.ts` asserts `formatToolSuccess(0, 0) === '—'` before the function exists, failing to import it.

- [ ] **Step 1: Write the failing tests**

```ts
describe('formatToolSuccess', () => {
  it('dashes when there are no tool calls', () => {
    expect(formatToolSuccess(0, 0)).toBe('—')
  })

  it('dashes when the tool-call count is missing', () => {
    expect(formatToolSuccess(undefined, undefined)).toBe('—')
  })

  it('keeps a real 0% when calls exist and all of them failed', () => {
    expect(formatToolSuccess(0, 12)).toBe('0.00%')
  })

  it('formats a normal rate as a two-decimal percentage', () => {
    expect(formatToolSuccess(95, 20)).toBe('95.00%')
  })

  it('treats a missing rate with calls present as 0.00%', () => {
    expect(formatToolSuccess(undefined, 5)).toBe('0.00%')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:unit -- --reporter=verbose src/pages/analytics/components/cli-analytics/__tests__/format.test.ts`
Expected: FAIL — `formatToolSuccess` is not exported from `../format`.

- [ ] **Step 3: Implement `formatToolSuccess(rate, toolCalls)` in `format.ts`**

Place it next to `formatDuration`. Add a comment recording why the branch is on the counter and not the rate (AC2).

- [ ] **Step 4: Run the tests to verify they pass**

Run: same command as Step 2. Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/analytics/components/cli-analytics/format.ts \
        src/pages/analytics/components/cli-analytics/__tests__/format.test.ts
git commit -m "EPMCDME-16322: Add formatToolSuccess dashing a zero tool-call rate"
```

---

### Task 2: Users table column and user modal tile

**Files:**
- Modify: `src/pages/analytics/components/cli-analytics/views/UsersView.tsx` — `ToolSuccessRateCell` (`:98-102`) and the `tool_success_rate` entry of `buildUserMetrics` (`:61-67`)
- Test: `src/pages/analytics/components/cli-analytics/__tests__/UsersView.test.tsx`

**Interfaces:**
- Consumes: `formatToolSuccess` from Task 1.
- Produces: no new exports. The modal tile's `Metric` becomes `{ id: 'tool_success_rate', label: 'Tool Success', type: ColumnType.NUMBER, value: <string> }` — a pre-formatted string with **no** `format` key.

**Test-first: yes** — `UsersView.test.tsx` renders a `tool_calls: 0` row and asserts the table cell and the modal tile both read `—`, failing because both currently read `0.00%`.

- [ ] **Step 1: Extend the two existing mocks so the real renderers run**

The current `@/components/Table` mock renders only `developer_name`, and the `ExtendedSessionsModal` mock renders only `target.title`, so neither exercises the code under test. Extend them:
- Table mock: accept `customRenderColumns` and render `customRenderColumns.tool_success_rate(item)` inside `<span data-testid="cell-tool-success">`.
- Modal mock: render `target.metrics.find((m) => m.id === 'tool_success_rate')?.value` inside `<span data-testid="modal-tool-success">`.

Also make the `useCliAnalyticsUsers` mock overridable per test: import the mocked hook and set `tableRows` through `vi.mocked(useCliAnalyticsUsers).mockReturnValue(...)`.

- [ ] **Step 2: Write the failing tests**

```ts
it('dashes Tool Success in the table when the user made no tool calls', () => {
  renderWithRow({ tool_calls: 0, tool_success_rate: 0 })
  expect(screen.getByTestId('cell-tool-success')).toHaveTextContent('—')
})

it('dashes Tool Success in the user modal when the user made no tool calls', async () => {
  const user = userEvent.setup()
  renderWithRow({ tool_calls: 0, tool_success_rate: 0 })
  await user.click(screen.getByRole('button', { name: 'Alice' }))
  expect(screen.getByTestId('modal-tool-success')).toHaveTextContent('—')
})

it('keeps a real 0% in the table when every tool call failed', () => {
  renderWithRow({ tool_calls: 12, tool_success_rate: 0 })
  expect(screen.getByTestId('cell-tool-success')).toHaveTextContent('0.00%')
})
```

`renderWithRow(overrides)` is a local helper that merges `overrides` into the existing `Alice` fixture, sets the hook mock and renders `<UsersView filters={MOCK_FILTERS} />`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test:unit -- --reporter=verbose src/pages/analytics/components/cli-analytics/__tests__/UsersView.test.tsx`
Expected: FAIL on the two dash tests — received `0.00%`, expected `—`. The real-0% test passes already.

- [ ] **Step 4: Replace both call sites with `formatToolSuccess`**

`ToolSuccessRateCell` renders `formatToolSuccess(row.tool_success_rate, row.tool_calls)`. In `buildUserMetrics`, set `value` to the same call and **delete the `format: MetricFormat.PERCENTAGE` line** from that entry only. Drop the now-unused `MetricFormat` import only if nothing else in the file uses it.

- [ ] **Step 5: Run the tests to verify they pass, then the full unit suite**

Run: same command as Step 3. Expected: PASS.
Run: `npm run test:unit:slnt`
Expected: exit 0 — proves the Repositories and session-detail surfaces are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/pages/analytics/components/cli-analytics/views/UsersView.tsx \
        src/pages/analytics/components/cli-analytics/__tests__/UsersView.test.tsx
git commit -m "EPMCDME-16322: Dash Tool Success for zero-tool-call users and modal"
```

---

### Task 3: Overview summary subtitle

**Files:**
- Modify: `src/pages/analytics/components/cli-analytics/views/OverviewView.tsx:80`
- Test: `src/pages/analytics/components/cli-analytics/__tests__/OverviewView.test.tsx`

**Interfaces:**
- Consumes: `kpis.total_tool_calls` and `kpis.tool_call_success_rate` (both required `number` on `OverviewKPIs`), already in scope at `:76-80`.
- Produces: no new exports. Does **not** use `formatToolSuccess` — this surface renders one decimal and a `% success` suffix, which that helper deliberately does not model.

**Test-first: yes** — `OverviewView.test.tsx` asserts the TOOL CALLS card subtitle is `—` for `total_tool_calls: 0`, failing because it currently reads `0.0% success`.

- [ ] **Step 1: Extend the `MetricCard` mock to expose the subtitle**

The mock at `:76-82` renders only `metric.label` and `metric.value`. Add `<span data-testid="metric-description">{metric.description}</span>` and widen its prop type with `description?: string`.

- [ ] **Step 2: Write the failing tests**

```ts
it('dashes the Tool Calls subtitle when there were no tool calls', () => {
  renderWithKpis({ total_tool_calls: 0, tool_call_success_rate: 0 })
  expect(screen.getByTestId('metric-total_tool_calls')).toHaveTextContent('—')
})

it('keeps the success subtitle when tool calls exist', () => {
  renderWithKpis({ total_tool_calls: 850, tool_call_success_rate: 94.5 })
  expect(screen.getByTestId('metric-total_tool_calls')).toHaveTextContent('94.5% success')
})
```

`renderWithKpis(overrides)` merges `overrides` into the existing KPI fixture via `vi.mocked(useCliAnalyticsOverview).mockReturnValue(...)` and renders `<OverviewView … />` with the props the existing tests already use.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test:unit -- --reporter=verbose src/pages/analytics/components/cli-analytics/__tests__/OverviewView.test.tsx`
Expected: FAIL on the dash test — received `0.0% success`, expected `—`.

- [ ] **Step 4: Guard the subtitle in `OverviewView.tsx`**

Make `description` conditional on `kpis.total_tool_calls > 0`, yielding the existing template string when true and the bare `'—'` (no suffix) when false.

- [ ] **Step 5: Run the tests to verify they pass**

Run: same command as Step 3. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/analytics/components/cli-analytics/views/OverviewView.tsx \
        src/pages/analytics/components/cli-analytics/__tests__/OverviewView.test.tsx
git commit -m "EPMCDME-16322: Dash the Overview Tool Success subtitle at zero calls"
```

---

## Gates (run after Task 3)

```bash
npm run lint
npm run typecheck
npm run test:unit:slnt
npm run test:integration:slnt
```

All four must exit 0. `npm run test-harness` output then goes in the MR's `## Test harness` section (the `auto_epm-cdme_vcs` bot checks for it).
