# Technical Analysis: Rename 'Agent Usage' to 'Assistant Usage' in Analytics UI

**Analysis Date**: 2026-07-09  
**Codebase**: codemie-ui  
**Feature Area**: Analytics UI / Dashboard Terminology

---

## Executive Summary

This rename task affects three UI label strings that reference "Agent" terminology in the Analytics dashboard, specifically the TOP_AGENTS_USAGE and AGENTS_USAGE metrics. Both of these backend endpoints actually return **Assistant data**, not Agent data. The labels are already inconsistent with their descriptions, which correctly reference "assistants". This is a **UI-only label change** with no backend API changes required.

---

## Codebase Findings

### 1. Affected Files

#### Frontend UI Label Changes (3 locations)

**File 1: `/home/psyche/usr/codemie-repos/codemie-ui/src/pages/analytics/components/InsightsTab.tsx`**
- **Line 158**: `title="Top Agents Usage"` → should be `"Top Assistants Usage"`
- **Line 159**: Description already correctly states: `"Most used assistants with invocations, cost, and user metrics"`
- **Context**: This is a TableWidget component that displays the TOP_AGENTS_USAGE metric
- **Related**: Line 153 has a comment referencing "Top Agents + Top Workflow" which could be updated to "Top Assistants + Top Workflow" for consistency

**File 2: `/home/psyche/usr/codemie-repos/codemie-ui/src/pages/analytics/components/DashboardForm/constants.ts`**
- **Line 35**: `{ label: 'Agents Usage', value: TabularMetricType.AGENTS_USAGE }` → should be `'Assistants Usage'`
- **Line 52**: `{ label: 'Top Agents Usage', value: TabularMetricType.TOP_AGENTS_USAGE }` → should be `'Top Assistants Usage'`
- **Context**: TABULAR_METRIC_OPTIONS array used in widget creation forms
- **Usage**: This constant is referenced in line 65 of the same file in METRIC_TYPE_OPTIONS export
- **Impact**: These labels appear in dropdowns when users create custom dashboards

#### Enum Definitions (No changes required - these are internal identifiers)

**File: `/home/psyche/usr/codemie-repos/codemie-ui/src/types/analytics.ts`**
- **Line 194**: `AGENTS_USAGE = 'agents-usage'` (internal enum value - do NOT change)
- **Line 237**: `TOP_AGENTS_USAGE = 'top-agents-usage'` (internal enum value - do NOT change)
- **Note**: These are API endpoint identifiers mapped to backend endpoints and should remain unchanged

#### Backend Service Integration (No changes required)

**File: `/home/psyche/usr/codemie-repos/codemie-ui/src/store/analytics.ts`**
- **Line 484**: Uses metric type value as endpoint path: `v1/analytics/${type}`
- **Impact**: When metricType is `TOP_AGENTS_USAGE`, the enum value `'top-agents-usage'` is used to construct the endpoint `v1/analytics/top-agents-usage`
- **No changes needed**: The internal enum values remain unchanged

---

## Data Flow & Backend Analysis

### API Endpoints

**Backend Service Endpoints** (Backend repository: codemie)

1. **GET /v1/analytics/agents-usage**
   - File: `/codemie/src/codemie/rest_api/routers/analytics.py` (line 790-809)
   - Handler: `get_agents_usage()` 
   - Service: `/codemie/src/codemie/service/analytics/analytics_service.py` (line 374)
   - Implementation: `/codemie/src/codemie/service/analytics/handlers/assistant_handler.py` (line 208)
   - **Purpose**: Returns comprehensive assistant usage analytics (conversations, cost, unique users, tool errors)
   - **Data Type**: Assistants (clearly documented in docstring: "Get assistant and tool usage analytics")

2. **GET /v1/analytics/top-agents-usage**
   - File: `/codemie/src/codemie/rest_api/routers/analytics.py` (line 856-875)
   - Handler: `get_top_agents_usage()`
   - Service: `/codemie/src/codemie/service/analytics/analytics_service.py` (line 985)
   - Implementation: `/codemie/src/codemie/service/analytics/handlers/assistant_handler.py` (line 478)
   - **Purpose**: Returns top assistants by usage with invocations, cost, unique users metrics
   - **Data Type**: Assistants (docstring confirms: "Get top agents usage: invocations, cost, unique users, and most recent user per assistant")

### Key Finding: Mismatched Terminology

Both endpoints use `assistant_handler.py` and explicitly handle `CONVERSATION_ASSISTANT_USAGE` metrics (line 272, 294, 566 in assistant_handler.py). The term "agents" in the endpoint names and method names is a misnomer—the data is strictly assistant usage metrics.

**Backend Evidence**:
- Assistant handler method at line 218: Docstring explicitly states "Get assistant and tool usage analytics"
- Line 245: Group by field is `ASSISTANT_NAME_KEYWORD_FIELD`
- Line 272, 294, 566: All filter on `MetricName.CONVERSATION_ASSISTANT_USAGE.value`

---

## Related UI Components

### Components Using TOP_AGENTS_USAGE Metric

1. **InsightsTab Component** (`src/pages/analytics/components/InsightsTab.tsx`)
   - TableWidget using `TabularMetricType.TOP_AGENTS_USAGE`
   - Title: "Top Agents Usage" (needs update)
   - Description: "Most used assistants..." (already correct)

2. **DashboardForm Constants** (`src/pages/analytics/components/DashboardForm/constants.ts`)
   - TABULAR_METRIC_OPTIONS dropdown used in dashboard customization UI
   - Two labels need updating: "Agents Usage" and "Top Agents Usage"

3. **Related Components** (already using correct terminology)
   - Line 59 (InsightsTab.tsx): `{ field: 'assistants_spent', label: 'Assistants' }` ✓
   - Line 89 (InsightsTab.tsx): Description mentions "Assistants, Workflows, Datasources" ✓
   - Line 176 (InsightsTab.tsx): Title "Assistants Chats" ✓

### Components NOT Affected

- **CLI Agents** (`DashboardForm/constants.ts` line 46): This is separate from the rename scope; refers to CLI proxy agents, not assistants
- **CLIInsightsTab** (`src/pages/analytics/components/CLIInsightsTab.tsx` line 139): References "Coding Agents" which is intentional for CLI context
- **Leaderboard** components: Reference to "D5: CLI & Agentic Engineering" is intentional product terminology

---

## Test Coverage

### Current Test Status
- **No test files found** in `/src/pages/analytics/__tests__/` directory
- No integration tests or unit tests for analytics UI components
- **Risk**: Rename has zero test coverage verification

### Potential Test Areas (if tests exist elsewhere)
- E2E tests that might reference dropdown labels in dashboard creation flows
- Component tests for DashboardForm widget selection
- Integration tests for analytics page rendering

**Action**: Run `find . -type f -name "*test*" | xargs grep -l "Top Agents Usage\|Agents Usage" 2>/dev/null` to identify any test files with hardcoded label references.

---

## Risk Indicators

### 1. Backward Compatibility Risk: LOW
- **Impact**: UI labels only, no API contract changes
- **Saved Dashboards**: Dashboards stored in localStorage/backend use the enum value `'top-agents-usage'`, not the label string, so user-created dashboards are unaffected by label changes
- **Confirmation**: The metric value is the enum (e.g., `TabularMetricType.TOP_AGENTS_USAGE`), not the label string

### 2. Enum Naming Mismatch Risk: MEDIUM (existing issue, not in scope)
- **Finding**: Backend endpoints and Python methods are named `get_top_agents_usage()` but handle assistant data
- **Current State**: This is an existing terminology inconsistency in the codebase
- **Recommendation**: This is outside the current scope but note that backend naming should ideally be updated in a separate task for full consistency (e.g., `get_top_assistants_usage()`)
- **No Breaking Impact**: The frontend enum/endpoint values remain unchanged, so this doesn't affect the current rename

### 3. Scope Creep Risk: MEDIUM
- **Consideration 1**: Should "Agents Usage" (line 35, constants.ts) also be renamed?
  - Currently: `{ label: 'Agents Usage', value: TabularMetricType.AGENTS_USAGE }`
  - This metric shows identical assistant data as TOP_AGENTS_USAGE
  - **Decision**: Task explicitly states three changes (line 158, line 35, line 52), confirming both "Agents Usage" entries should be renamed
  
- **Consideration 2**: Should backend enum names be updated?
  - Task scope is "update three string labels" - enum values are internal identifiers, not user-facing labels
  - Updating enum values would be a breaking API change
  - **Recommendation**: Keep enum values unchanged; this is UI-only

### 4. Data Consistency Risk: NONE
- Both AGENTS_USAGE and TOP_AGENTS_USAGE return identical data structure from the same handler
- No data model changes needed
- Response format unchanged

### 5. User-Facing Impact: LOW
- Affects dashboard customization dropdown labels and the Insights tab title
- Users won't see broken functionality, only label updates
- Existing saved dashboards continue to work (uses enum values, not labels)

---

## Summary of Required Changes

### Changes Required (UI Labels Only)

| File | Location | Current | Target | Type |
|------|----------|---------|--------|------|
| InsightsTab.tsx | Line 158 | `title="Top Agents Usage"` | `title="Top Assistants Usage"` | String update |
| InsightsTab.tsx | Line 153 | Comment: "Top Agents + Top Workflow" | Comment: "Top Assistants + Top Workflow" | Comment update (optional) |
| constants.ts | Line 35 | `label: 'Agents Usage'` | `label: 'Assistants Usage'` | String update |
| constants.ts | Line 52 | `label: 'Top Agents Usage'` | `label: 'Top Assistants Usage'` | String update |

### Changes NOT Required

- ✓ `src/types/analytics.ts` enum values - keep unchanged (internal identifiers)
- ✓ `src/store/analytics.ts` endpoint construction - uses enum values, unaffected
- ✓ Backend API routes - endpoint paths remain `/agents-usage` and `/top-agents-usage`
- ✓ Backend method names - remain `get_agents_usage()` and `get_top_agents_usage()`
- ✓ CLI-related labels - outside scope
- ✓ Leaderboard references - intentional product terminology

---

## Verification Checklist

Before completion, verify:
- [ ] Three string labels updated in specified files
- [ ] No changes made to enum values in `src/types/analytics.ts`
- [ ] No backend API changes required
- [ ] Inspect localStorage for saved dashboard configurations to confirm they use enum values, not labels
- [ ] Run app and verify "Assistants Usage" and "Top Assistants Usage" appear in:
  - [ ] Insights tab (title "Top Assistants Usage")
  - [ ] Dashboard customization form (dropdown options)
- [ ] Check for any integration/E2E tests that reference old labels
- [ ] Verify no hardcoded label references in test files

---

## Additional Notes

**Terminology Consistency**: The codebase uses "Assistant" for the main product concept. This rename aligns UI labels with:
- Backend method docstrings (explicitly state "assistant usage")
- Data field names (e.g., `assistants_spent`, `ASSISTANT_NAME_KEYWORD_FIELD`)
- Other UI labels already using "Assistants" terminology (e.g., "Assistants Chats", "Assistants published to marketplace")

**Future Consideration**: A broader backend refactoring task could rename the Python methods and endpoint paths from `agents` to `assistants` for full terminology consistency, but that is outside the current scope and would require backend API coordination.
