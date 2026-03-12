# Example: Complex Feature Implementation

## Scenario

User wants to implement: "Add an analytics dashboard with customizable widgets"

Jira Ticket: EPMCDME-10750

**Ticket Description:**
```
As a user, I want to view analytics on a dashboard with customizable widgets
so I can monitor assistant usage and performance metrics.

Acceptance Criteria:
- Dashboard page with grid layout for widgets
- Widgets: message volume chart, top assistants list, response time chart
- Users can reorder and resize widgets
- Data fetched from analytics API endpoints
- Persist widget layout in user preferences
```

## Tech Lead Workflow

### Phase 1: Requirement Gathering

**Tech Lead:**
```
To begin, provide the Jira ticket ID (e.g., EPMCDME-12345) to analyze
and implement.
```

**User:** "EPMCDME-10750"

**Tech Lead Actions:**
1. Uses brianna skill: `Skill(skill="brianna", args="get EPMCDME-10750 fields: description,summary")`
2. Receives ticket details

### Phase 2: Technical Analysis

**Guide Consultation:**
```bash
Read .codemie/guides/architecture/project-architecture.md
Read .codemie/guides/patterns/state-management.md
Read .codemie/guides/development/api-integration.md
Read .codemie/guides/development/performance-patterns.md
Read .codemie/guides/architecture/routing-patterns.md
```

**Codebase Exploration:**
```bash
# Check if analytics page or store already exists
Glob pattern="*analytic*" path="src/"
Glob pattern="*dashboard*" path="src/"

# Check existing chart components
Grep pattern="chart|Chart|recharts" glob="*.tsx" path="src/" output_mode="files_with_matches"

# Check how user preferences are stored
Grep pattern="preferences|userSettings" glob="*.ts" path="src/store/" output_mode="content" -n

# Check existing grid/layout patterns
Grep pattern="grid|Grid|layout" glob="*.tsx" path="src/components/" output_mode="files_with_matches"
```

**Findings:**
- No existing analytics page or store
- No chart library currently installed (recharts or similar needed)
- No user preferences persistence mechanism in store
- No drag-and-drop grid library (react-grid-layout would be needed)
- Router exists, needs new route added

### Phase 3: Complexity Assessment

**Tech Lead:**
```markdown
## Implementation Analysis: EPMCDME-10750

### Complexity Rating: Complex

### Reasoning:
- **Multi-Layer Impact**: Requires new page, multiple new components, new Valtio store, new route, and API integration
- **New Dependencies**: Chart library + drag-and-drop grid library not currently installed
- **Missing Patterns**: No existing widget/dashboard pattern in codebase
- **State Persistence**: Layout persistence requires new user preferences mechanism
- **Extensive Changes**: Estimated 12+ files across pages, components, store, router, constants

### Clarity Assessment:
Partially Clear - Core requirements defined, but several technical decisions needed:
- Which chart library? (recharts? chart.js? victory?)
- How to persist layout? (localStorage? API endpoint? user settings store?)
- How to handle loading/error states per widget?
- What's the grid system? (CSS grid? react-grid-layout?)

### Affected Components:
- **Router**: `src/router.tsx` - New /analytics route
- **Analytics Page**: `src/pages/analytics/` - New page directory
- **Dashboard Component**: `src/pages/analytics/components/Dashboard.tsx` - Grid container
- **Widget Components**: `src/pages/analytics/components/widgets/` - 3 chart widgets
- **Analytics Store**: `src/store/analytics.ts` - API calls, data state
- **Preferences Store**: `src/store/` - Widget layout persistence (new or extend existing)
- **Types**: `src/types/entity/analytics.ts` - Analytics data types
- **Constants**: `src/constants/analytics.ts` - Widget IDs, API paths
- **Navigation**: Layout component - Add analytics nav link

### Risk Factors:
- Chart library bundle size impact on app performance
- Drag-and-drop complexity and accessibility
- Layout persistence strategy (localStorage vs API)
- Widget loading state coordination
```

### Phase 4: Clarifying Questions

**Tech Lead uses AskUserQuestion:**
```json
{
  "questions": [
    {
      "question": "Which chart library should be used?",
      "header": "Chart Library",
      "multiSelect": false,
      "options": [
        {
          "label": "Recharts (Recommended)",
          "description": "React-native, widely used, good TypeScript support, tree-shakeable"
        },
        {
          "label": "Chart.js via react-chartjs-2",
          "description": "Feature-rich, but heavier bundle, requires wrapper component"
        },
        {
          "label": "Victory",
          "description": "React-native, composable, but less community resources"
        }
      ]
    },
    {
      "question": "How should widget layout be persisted?",
      "header": "Persistence",
      "multiSelect": false,
      "options": [
        {
          "label": "localStorage (Recommended)",
          "description": "Simple, no backend needed, persists per browser"
        },
        {
          "label": "Backend API endpoint",
          "description": "Synced across devices, requires new API, more complex"
        },
        {
          "label": "No persistence",
          "description": "Simple, reset layout on page refresh"
        }
      ]
    },
    {
      "question": "Should widgets be draggable/resizable or fixed layout?",
      "header": "Layout Type",
      "multiSelect": false,
      "options": [
        {
          "label": "Fixed grid layout",
          "description": "Simpler, no extra library, consistent UX, faster to implement"
        },
        {
          "label": "Drag-and-drop with react-grid-layout",
          "description": "Rich UX but adds dependency, accessibility concerns"
        }
      ]
    }
  ]
}
```

**User Responses:**
- Chart Library: Recharts
- Persistence: localStorage
- Layout: Fixed grid layout (defer drag-and-drop to follow-up ticket)

### Phase 5: Recommendation

**Tech Lead:**
```markdown
### Recommendation

This feature is Complex and would benefit from architectural planning before implementation.

**Architectural Decisions Resolved:**
1. Chart library: Recharts (install needed)
2. Layout: Fixed CSS grid (no extra library)
3. Persistence: localStorage via custom hook
4. Widget isolation: Each widget manages its own loading/error state

**Suggested Next Steps:**

**Option 1: Use Solution Architect Skill (Recommended)**
Use solution-architect skill to create a detailed specification covering:
- Component hierarchy and props interface
- Store shape for analytics data
- localStorage schema for widget preferences
- API endpoint mapping
- Loading/error state strategy per widget

This will provide a clear implementation roadmap before writing code.

**Option 2: Proceed with High-Level Plan**
If you're comfortable with the complexity, I can:
1. Create feature branch: `EPMCDME-10750`
2. Start with Recharts installation + analytics store
3. Build widgets one at a time
4. Wire up localStorage persistence last

However, rework risk is higher without upfront architectural alignment.

**Which approach do you prefer?**
```

**User:** "Let's use the solution architect skill first"

### Phase 6: Solution Architect Handoff

**Tech Lead:**
```markdown
Excellent choice. I'll invoke the solution-architect skill to create a
comprehensive specification.

**Context being passed:**
- Jira ticket: EPMCDME-10750
- Complexity assessment: Complex
- Technical decisions: Recharts, localStorage, fixed CSS grid
- Affected components: router, page, 3 widgets, analytics store, types, constants
- Risk factors: bundle size, widget state isolation, localStorage schema
```

**Tech Lead uses Skill tool:**
```
Skill(skill="solution-architect", args="Create specification for EPMCDME-10750:
Analytics dashboard with customizable widgets. Context: Recharts for charts,
localStorage for layout persistence, fixed CSS grid layout. Complex feature
affecting router, new analytics page/store/types, 3 chart widgets. Key concerns:
bundle size, widget loading isolation, localStorage schema, Valtio store shape.")
```

### Phase 7: Post-Specification Implementation

After solution architect completes specification:

**Tech Lead:**
```markdown
Specification complete. Ready to start implementation following the approved design.

**Implementation will proceed in phases:**
1. Phase 1: Install Recharts, add analytics route + empty page
2. Phase 2: Create analytics Valtio store with API calls
3. Phase 3: Build 3 chart widget components
4. Phase 4: Assemble Dashboard grid layout
5. Phase 5: Add localStorage persistence hook
6. Phase 6: Wire navigation link, test end-to-end

**Creating feature branch:**
```

**Branch Creation:**
```bash
git checkout main
git pull origin main
git checkout -b EPMCDME-10750
git push -u origin EPMCDME-10750
```

**Tech Lead:**
```markdown
Feature branch created: EPMCDME-10750

Starting Phase 1: Install Recharts and scaffold new route
Following specification section 3.1...

[Proceeds with implementation following detailed spec]
```

## Outcome

**Time to Specification:** ~30 minutes (solution architect)
**Time to Implementation:** ~2-3 days (complex feature)
**Files Changed:** 14
**Lines Added:** ~800
**New Dependencies:** 1 (recharts)
**Complexity Accurate:** Yes - Complex assessment prevented premature implementation

## Key Success Factors

1. **Early Complexity Detection**: Identified as Complex before wasting time on incomplete implementation
2. **Clarifying Questions**: Resolved library choice, persistence strategy, and layout type upfront
3. **Specification First**: Solution architect provided clear component hierarchy and store shape
4. **Deferred Scope**: Drag-and-drop deferred to follow-up ticket - kept this ticket achievable
5. **Phased Approach**: Incremental implementation reduced risk
6. **Proper Branch**: Isolated complex work from main branch

## Comparison: Without Tech Lead Skill

**If user jumped straight into implementation:**
- ❌ Installed wrong chart library (heavy bundle)
- ❌ Built drag-and-drop before simpler layout was proven
- ❌ No clear widget isolation pattern → inconsistent loading states
- ❌ localStorage schema designed ad-hoc → brittle
- ❌ Would require significant refactoring

**With Tech Lead Skill:**
- ✅ Right library chosen upfront (Recharts)
- ✅ Scope trimmed to achievable (fixed grid, defer drag-and-drop)
- ✅ Clear architectural specification first
- ✅ Widget isolation pattern designed before coding
- ✅ Clean, well-structured implementation
