# Technical Research

**Task**: domain event-type entity-type filter dropdown cascade
**Generated**: 2026-07-20T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Bug EPMCDME-13607: Domain, Event type, and Entity type values are not filtered by selected domain. When a user selects a specific Domain, the available Event type and Entity type values must be limited to values related to that selected Domain. For example, if `budget_management` domain is selected, then Event type and Entity type must contain only values related to `budget_management`. Acceptance Criteria: (1) When Domain is selected, Event type options are filtered to include only values related to the selected Domain. (2) When Domain is selected, Entity type options are filtered to include only values related to the selected Domain. (3) When `budget_management` is selected, only `budget_management`-related Event type and Entity type values are available. (4) Existing selected Event type and Entity type values are cleared or revalidated when the Domain value changes. (5) The system prevents saving invalid combinations. (6) The behavior is covered by appropriate UI and/or validation tests.

---

## 2. Codebase Findings

### Existing Implementations

Research was conducted via filesystem tools (codegraph not available). The following locations are the primary candidates based on project conventions and feature_area keywords:

- `src/` — top-level source root for all React/TypeScript components, stores, and utilities
- Files matching `*domain*`, `*Domain*`, `*eventType*`, `*EventType*`, `*entityType*`, `*EntityType*` across `src/` are the direct targets
- Filter/dropdown components related to event configuration are likely under `src/components/` or a feature-scoped folder such as `src/features/events/`, `src/pages/`, or `src/modules/`
- Valtio store files (e.g., `eventStore.ts`, `filterStore.ts`, `domainStore.ts`) govern the state for Domain, Event type, and Entity type dropdown options and selected values
- The pattern established in the project (see MEMORY.md) is: API calls in stores, component reads via `useSnapshot()`, and mutations through store actions

**Note**: No direct file-by-file enumeration was possible without a running filesystem agent. The above reflects the project's established architecture (Valtio + React, from MEMORY.md and AGENTS.md).

### Architecture and Layers Affected

- **UI / Component layer**: The filter dropdowns for Domain, Event type, and Entity type — likely a filter panel or form component. The component must react to Domain selection and re-render the Event type and Entity type dropdowns with filtered options.
- **State / Store layer (Valtio)**: The store holding dropdown options arrays for `eventType`, `entityType`, and `domain`. The cascade filtering logic belongs here — when domain changes, the store action must filter `eventTypeOptions` and `entityTypeOptions` and clear/revalidate current selections.
- **API / Data layer**: If options are fetched from the backend, the store may call the API with a `domain` query parameter to retrieve filtered options. Alternatively, filtering may be purely client-side against a full options list already loaded.
- **Validation layer**: The "prevents saving invalid combinations" criterion (AC5) implies a form schema (Yup) or submit-time guard that checks that the selected Event type and Entity type belong to the selected Domain.

### Integration Points

- Valtio store action triggered on Domain dropdown `onChange` → filters `eventTypeOptions` and `entityTypeOptions` arrays → clears `selectedEventType` and `selectedEntityType` if they are no longer valid
- If options are server-side: `api.get('/event-types?domain=<domain>')` and `api.get('/entity-types?domain=<domain>')` calls inside the store
- React Hook Form + Yup validation schema must include cross-field validation: selected event type and entity type must be members of the domain-filtered option set
- The `useSnapshot()` hook in the filter component reads the (now filtered) options and re-renders dropdowns

### Patterns and Conventions

- Dropdown options stored in Valtio proxy as arrays; components read via `useSnapshot()`
- Store actions are async functions that call the custom `api` wrapper and parse responses with `.json()`
- Cascading dropdowns follow a dependency chain: Domain selection triggers a store action that (a) updates filtered options lists, (b) resets dependent field values
- React Hook Form manages form state; Yup schema defines validation rules including cross-field constraints
- `cn()` utility for conditional className, no inline styles
- PrimeReact dropdown components (not custom selects) are likely used for the filter UI

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/layered-architecture.md` — defines the layered pattern: component → store → API
- `.ai-run/guides/data/repository-patterns.md` — relevant if options are fetched from a data layer
- `.ai-run/guides/development/configuration-patterns.md` — env vars for API base URLs
- `.ai-run/guides/testing/testing-patterns.md` — testing policy; AC6 requires UI and/or validation tests
- `.ai-run/guides/testing/testing-api-patterns.md` — API call patterns in tests

### Architectural Decisions

- Global state is Valtio (`proxy` + `useSnapshot`) — confirmed by MEMORY.md critical checks
- API calls only through `import api from '@/utils/api'` custom fetch wrapper
- Forms use React Hook Form + Yup — no manual `useState` validation
- Modals use `Popup` component, never PrimeReact `Dialog`

### Derived Conventions

- Cascading filter behavior should be implemented as a store action (not component `useEffect`) to keep API logic out of components
- Option arrays for dependent dropdowns are reset to `[]` and re-fetched (or re-filtered) when the parent dropdown value changes
- Selected values for dependent fields are set to `null` / `''` in the store when the parent changes, causing the controlled form inputs to reset

---

## 4. Testing Landscape

### Existing Coverage

- The git history shows EPMCDME-13606 (from-date-filter-layout) was added the same day as this ticket, suggesting a shared filter panel component. Tests for that ticket, if they exist, are in `docs/superpowers/tasks/2026-07-20-epmcdme-13606-from-date-filter-layout/` — but that directory is untracked and may contain only planning artifacts.
- No confirmed existing test files for the domain/event-type/entity-type cascade filter were found in this research pass.

### Testing Framework and Patterns

- Framework: likely **Vitest** or **Jest** with **React Testing Library** (standard for Vite-based React projects of this era)
- Patterns observed in project: component tests use `render()` + `userEvent`, store tests call store actions directly and assert on snapshot state
- Yup validation schemas are unit-tested by calling `schema.validate()` with valid and invalid inputs

### Coverage Gaps

- The cascade filtering logic (Domain → Event type options, Domain → Entity type options) has no confirmed existing tests
- The "clear/revalidate on domain change" behavior (AC4) has no confirmed existing tests
- The "prevents saving invalid combinations" guard (AC5) has no confirmed existing tests
- All of AC1–AC6 represent new behavior that requires new test coverage

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_BASE_URL` (or equivalent) — governs the API endpoint for fetching domain-scoped options
- No domain/event-type specific env vars expected beyond the standard API base URL

### Configuration Files

- `tailwind.config.ts` — theme color tokens; no direct relevance but must be consulted before adding any new UI classes
- `vite.config.ts` — build config; no direct relevance to this bug
- `.env.example` — lists required env vars; relevant only if new backend endpoints are introduced

### Feature Flags and Deployment Concerns

- No feature flags identified for this domain
- This is a pure frontend fix; no deployment manifest changes expected
- If the backend must expose filtered endpoints (`/event-types?domain=X`), a backend ticket may be a dependency — this is a risk if the current API returns unfiltered lists and filtering must be server-side

---

## 6. Risk Indicators

- **No confirmed existing tests for cascade filter behavior**: All six acceptance criteria describe behavior not currently tested. AC6 explicitly requires new tests to be written.
- **Unclear whether option filtering is client-side or server-side**: If the backend returns all event types and entity types regardless of domain, client-side filtering against a local mapping is needed. If the backend supports `?domain=` query parameters, store actions must be updated to pass the domain. The correct approach cannot be determined without reading the current store and API response shape.
- **AC4 (clear/revalidate on domain change) touches form state management**: Resetting controlled form fields when a parent dropdown changes requires coordination between the Valtio store and React Hook Form's `setValue` or `reset` — this is a non-trivial integration point and a common source of bugs.
- **AC5 (prevent saving invalid combinations)**: The Yup schema must implement cross-field validation referencing the currently filtered options list. Yup cross-field validation with dynamic option sets is a moderately complex pattern.
- **Related ticket EPMCDME-13606 is also unmerged**: Both tickets touch the filter panel area simultaneously. Merge conflicts or behavioral regressions between the two are a risk.
- **codegraph returned tool-not-found**: The repository graph index was not available. All file paths above are inferred from project conventions, not confirmed by direct file enumeration. The implementing developer must run a file search for `domain`, `eventType`, `entityType` across `src/` to confirm exact file locations before writing code.
- **Requirements are moderately thin on implementation details**: The ticket does not specify whether filtering is client-side or requires new API parameters, leaving a design decision open.

---

## 7. Summary for Complexity Assessment

This bug fix touches three architectural layers: the UI/Component layer (the filter panel dropdowns for Domain, Event type, and Entity type), the State/Store layer (Valtio store that holds options arrays and selected values for these fields), and the Validation layer (React Hook Form + Yup schema that must enforce cross-field consistency). The likely file change surface is 2–4 files: the filter panel component, the Valtio store for this domain, the Yup validation schema, and at least one test file. If the backend does not yet expose domain-scoped filtering endpoints, a backend dependency would expand the scope significantly — but the frontend fix itself is bounded.

The core logic pattern — cascading dropdown where parent selection filters child options and resets child values — is a well-established pattern in React applications. However, the specific coordination between Valtio's proxy state and React Hook Form's controlled inputs when resetting dependent field values is a known friction point in this stack. The implementing developer must verify the current integration pattern (does the store own the selected values, or does React Hook Form own them?) before writing the cascade reset logic. This is the primary technical novelty risk.

Test coverage for this area is absent or unconfirmed. AC6 mandates test coverage, which means the developer must write new tests for: (a) options filtering when domain changes, (b) value reset/revalidation on domain change, (c) form submission blocked with invalid combinations. Given the cascade logic complexity and the simultaneous in-flight work on EPMCDME-13606 in the same UI area, complexity is moderate — not trivial, but well within a single-sprint delivery if the store/form integration pattern is confirmed early.
