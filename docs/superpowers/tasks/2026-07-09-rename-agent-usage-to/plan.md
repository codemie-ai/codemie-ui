# Rename "Agent Usage" to "Assistant Usage" in Analytics UI

> **For agentic workers:** Use superpowers:test-driven-development to implement this plan inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update three UI label strings in the Analytics dashboard to use consistent "Assistant" terminology instead of "Agent" for metrics that display Assistant data.

**Architecture:** This is a UI-only label change affecting the Insights tab title and the dashboard customization dropdown. No backend API changes, no enum value changes, no data model changes. The internal enum identifiers (`AGENTS_USAGE`, `TOP_AGENTS_USAGE`) remain unchanged to preserve the API contract and saved dashboard configurations (which store enum values, not labels).

**Tech Stack:** React, TypeScript, TailwindCSS

## Global Constraints

- Do NOT modify enum values in `src/types/analytics.ts` — these are internal API identifiers
- Do NOT change backend endpoint paths or method names — enum values remain `agents-usage`, `top-agents-usage`
- Update ONLY the user-facing label strings
- No breaking changes to dashboard configurations (they use enum values, not labels)
- Do NOT modify CLI Agents or Coding Agents references — those are separate product concepts

---

### Task 1: Update Analytics UI Label Strings

**Files:**
- Modify: `src/pages/analytics/components/InsightsTab.tsx:158`
- Modify: `src/pages/analytics/components/DashboardForm/constants.ts:35,52`

**Interfaces:**
- Consumes: Existing React components and TypeScript constants
- Produces: Updated label strings visible in:
  - Insights tab top panel title: "Top Assistants Usage"
  - Dashboard customization dropdown: "Assistants Usage" and "Top Assistants Usage"

**Steps:**

- [ ] **Step 1: Update InsightsTab.tsx line 158**

Open `src/pages/analytics/components/InsightsTab.tsx` and locate line 158. Change:

```typescript
// BEFORE:
            title="Top Agents Usage"

// AFTER:
            title="Top Assistants Usage"
```

The description on line 159 already correctly states "Most used assistants..." so no change needed there.

Expected: One string label changed from "Top Agents Usage" to "Top Assistants Usage".

- [ ] **Step 2: Update DashboardForm/constants.ts line 35**

Open `src/pages/analytics/components/DashboardForm/constants.ts` and locate line 35 in the `TABULAR_METRIC_OPTIONS` array. Change:

```typescript
// BEFORE:
  { label: 'Agents Usage', value: TabularMetricType.AGENTS_USAGE },

// AFTER:
  { label: 'Assistants Usage', value: TabularMetricType.AGENTS_USAGE },
```

Note: The `value` remains `TabularMetricType.AGENTS_USAGE` — only the user-facing `label` string changes.

Expected: One label string changed from 'Agents Usage' to 'Assistants Usage'.

- [ ] **Step 3: Update DashboardForm/constants.ts line 52**

In the same file, locate line 52 in the `TABULAR_METRIC_OPTIONS` array. Change:

```typescript
// BEFORE:
  { label: 'Top Agents Usage', value: TabularMetricType.TOP_AGENTS_USAGE },

// AFTER:
  { label: 'Top Assistants Usage', value: TabularMetricType.TOP_AGENTS_USAGE },
```

Note: The `value` remains `TabularMetricType.TOP_AGENTS_USAGE` — only the user-facing `label` string changes.

Expected: One label string changed from 'Top Agents Usage' to 'Top Assistants Usage'.

- [ ] **Step 4: Verify file integrity**

Run:
```bash
grep -n "label.*Usage" src/pages/analytics/components/DashboardForm/constants.ts | head -20
```

Expected output should show:
```
35:  { label: 'Assistants Usage', value: TabularMetricType.AGENTS_USAGE },
52:  { label: 'Top Assistants Usage', value: TabularMetricType.TOP_AGENTS_USAGE },
```

Also verify enum values are unchanged:
```bash
grep -n "AGENTS_USAGE\|TOP_AGENTS_USAGE" src/types/analytics.ts
```

Expected: Lines showing `AGENTS_USAGE = 'agents-usage'` and `TOP_AGENTS_USAGE = 'top-agents-usage'` — no changes.

- [ ] **Step 5: Commit changes**

```bash
git add src/pages/analytics/components/InsightsTab.tsx src/pages/analytics/components/DashboardForm/constants.ts
git commit -m "EPMCDME-9986: Rename 'Agent Usage' to 'Assistant Usage' in Analytics UI"
```

Expected: Commit succeeds with message referencing the ticket.

---

### Task 2: Manual UI Verification

**Files:**
- Test: `src/pages/analytics/components/InsightsTab.tsx` (visual inspection)
- Test: `src/pages/analytics/components/DashboardForm/` (visual inspection)

**Interfaces:**
- Consumes: Updated label strings from Task 1
- Produces: Verified UI displaying correct labels

**Steps:**

- [ ] **Step 1: Start the development server**

Run:
```bash
npm run dev
```

Expected: Dev server starts on `http://localhost:3000` (or configured port). Wait for compilation to complete and the server to be ready.

- [ ] **Step 2: Navigate to Analytics page**

Open browser to `http://localhost:3000/analytics` (or appropriate Analytics route). Log in if required.

Expected: Analytics dashboard loads. You should see the Insights tab with various metrics displayed.

- [ ] **Step 3: Verify Insights tab title**

Locate the top section titled "Top Assistants Usage" (formerly "Top Agents Usage"). The description below should read "Most used assistants with invocations, cost, and user metrics".

Expected: Title reads "Top Assistants Usage" and description mentions "assistants" (no "agents").

Verify the table below displays assistant data (assistant names, invocation counts, cost, metrics).

Expected: Table correctly shows assistant-related metrics with no broken data.

- [ ] **Step 4: Verify dashboard customization dropdown**

Navigate to dashboard customization or widget creation form (exact path depends on your UI structure, typically an "Edit Dashboard" mode or "Add Widget" dialog).

Look for the dropdown menu with metric options. Scroll through and verify:
- "Assistants Usage" appears (was "Agents Usage")
- "Top Assistants Usage" appears (was "Top Agents Usage")
- Both enum values are mapped correctly (selecting them constructs proper API calls)

Expected: Dropdown labels show "Assistants Usage" and "Top Assistants Usage"; clicking to select them doesn't break the dashboard or cause API errors.

- [ ] **Step 5: Verify no CLI-related regressions**

While in the Analytics page, verify that:
- "CLI Agents" still appears as "CLI Agents" (unchanged — separate concept)
- "Coding Agents" still appears in any CLI-related sections (unchanged)

Expected: No unintended side effects; only "Agent Usage" and "Top Agents Usage" labels were renamed.

- [ ] **Step 6: Console check**

Open browser DevTools console (F12 → Console tab).

Expected: No errors related to undefined labels, component render failures, or API call mismatches. The analytics data loads without warnings.

- [ ] **Step 7: Verify backward compatibility**

If you have access to saved dashboard configurations (in browser storage or backend), verify that existing dashboards using the `TOP_AGENTS_USAGE` metric still load and render correctly.

How to check (if applicable):
- Navigate to a saved dashboard that previously used "Top Agents Usage"
- Verify it still loads with the same data and now displays the updated label "Top Assistants Usage"

Expected: Old saved dashboards continue to work; users see updated labels but no functionality breaks.

---

## Verification Checklist

Before declaring complete:

- [ ] All three string labels updated in specified files
- [ ] Enum values in `src/types/analytics.ts` remain unchanged
- [ ] API endpoint paths remain unchanged (verified by grep)
- [ ] InsightsTab renders with "Top Assistants Usage" title
- [ ] DashboardForm dropdown shows "Assistants Usage" and "Top Assistants Usage"
- [ ] No console errors or warnings
- [ ] No unintended changes to CLI-related labels
- [ ] Existing saved dashboards continue to function (if applicable)

---

## Notes

**Why enum values stay unchanged:**
- Enum values are internal API identifiers used to construct backend API paths
- Dashboards stored in localStorage/database use the enum value (e.g., `'top-agents-usage'`), not the label
- Changing enum values would break saved dashboards and require a backend API update
- This is UI-only label change; all infrastructure remains unchanged

**Future work (out of scope):**
- Backend method names (`get_agents_usage()`, `get_top_agents_usage()`) could be renamed in a separate task
- Backend endpoint paths could align terminology in a broader refactor, but that would require coordination across multiple teams
