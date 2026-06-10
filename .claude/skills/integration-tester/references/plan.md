# Integration Test Plan: [ComponentName]

**Generated**: [date]
**Total Flows Discovered**: X
**Components Analyzed**: Y

## Flow Inventory

### [Subsystem 1] (N flows)

#### Flow 1: [User Action Name]
- **Entry**: [How user starts - e.g. "Clicks 'Add Provider' button"]
- **Preconditions**: 
  - [What must be true - e.g. "User logged in (v1/user needs id)"]
  - [e.g. "Page loaded (v1/assistants/categories returned)"]
- **Data Path**: 
  1. [Step 1 - e.g. "handleAddClick captures form data"]
  2. [Step 2 - e.g. "POST v1/providers with { name, type }"]
  3. [Step 3 - e.g. "Response contains new provider with id"]
  4. [Step 4 - e.g. "providersStore.providers.push(newProvider)"]
  5. [Step 5 - e.g. "router.push({ name: 'providers-list' })"]
- **State Changes**: 
  - [e.g. "providersStore.providers array grows by 1"]
  - [e.g. "URL changes to /providers"]
  - [e.g. "Toast shows 'Provider added'"]
- **Exit**: [Where user ends - e.g. "Navigate to providers list"]
- **Error Paths**: 
  - [e.g. "API 422: Toast shows error message from response"]
  - [e.g. "Network error: Toast shows 'Failed to connect'"]
- **Test Complexity**: [Low/Medium/High/Very High]
- **Priority**: [High/Medium/Low]

#### Flow 2: [...]
[Repeat for each flow]

### [Subsystem 2] (M flows)
[Repeat pattern]

---

## Test Priority Matrix

| Priority | Flow Count | Rationale |
|----------|-----------|-----------|
| **High** | X | Primary user actions, critical paths, common workflows |
| **Medium** | Y | Secondary features, less common paths, feature-flagged |
| **Low** | Z | Edge cases, disabled features, error-only paths |

---

## Coverage Targets

| Level | Flows | Estimated Tests | Expected Branch % |
|-------|-------|-----------------|-------------------|
| **Minimum** | High priority only | X tests | ~60% |
| **Recommended** ⭐ | High + Medium | Y tests | ~80% |
| **Complete** | All flows | Z tests | ~95% |

**Recommended level balances coverage and effort.**

---

## Known Complexity Factors

[If any flows marked "Very High" complexity, explain why:]
- Flow N: [Reason - e.g. "Requires multi-step form with file upload + validation"]
- Flow M: [Reason - e.g. "Tests real-time WebSocket updates"]

---

## Skipped Flows (Planned)

[If any flows will be intentionally skipped, document upfront:]
- Flow X: [Reason - e.g. "Feature disabled by default, no production usage"]
- Flow Y: [Reason - e.g. "Requires external service not available in test environment"]
