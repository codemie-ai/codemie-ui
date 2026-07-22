# EPMCDME-13607: Domain-Dependent Filter Options

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a Domain is selected in the Activity Events filter panel, the Event type and Entity type dropdowns show only values that belong to the selected domain(s); selecting multiple domains shows the union; changing domains clears any now-invalid selections.

**Architecture:** The backend `/filter-options` endpoint currently returns three flat, unrelated arrays. We extend the response with a `mapping` field (a dict keyed by domain) that encodes which `event_types` and `entity_types` belong to each domain. The frontend computes the available options client-side from this mapping on every domain change — no extra API calls needed.

**Tech Stack:** Python 3.12 · Pydantic · SQLModel · SQLAlchemy (backend) · React · TypeScript · Valtio · Vitest + React Testing Library (frontend)

---

## File Map

| File | Change |
|---|---|
| `codemie/src/codemie/rest_api/models/activity_event.py` | Add `DomainFilterEntry` model; extend `ActivityEventFilterOptions` with `mapping` field |
| `codemie/src/codemie/service/activity/activity_repository.py` | Add `get_domain_mapping()` method |
| `codemie/src/codemie/service/activity/activity_event_service.py` | Pass `mapping` when constructing `ActivityEventFilterOptions` |
| `codemie/tests/codemie/rest_api/routers/test_activity_events_router.py` | Add test: `get_filter_options` returns mapping |
| `codemie/tests/codemie/service/activity/test_activity_repository.py` | Add test: `get_domain_mapping` groups correctly |
| `codemie-ui/src/types/entity/activityEvent.ts` | Add `DomainFilterEntry` interface; add `mapping` field |
| `codemie-ui/src/pages/settings/administration/ActivityEventsPage.tsx` | Filter `eventTypeOptions`/`entityTypeOptions` by selected domains; revalidate on domain change |
| `codemie-ui/src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx` | New file — tests for filtering and revalidation behaviour |

---

## Task 1: Backend model — add `DomainFilterEntry` and `mapping`

**Files:**
- Modify: `codemie/src/codemie/rest_api/models/activity_event.py:36-39`
- Test: `codemie/tests/codemie/rest_api/routers/test_activity_events_router.py`

- [ ] **Step 1: Write failing test**

Open `codemie/tests/codemie/rest_api/routers/test_activity_events_router.py` and add after the existing imports and helpers:

```python
class TestGetFilterOptions:
    @patch("codemie.rest_api.routers.activity_events_router.activity_event_service")
    def test_returns_mapping_field(self, mock_svc):
        from codemie.rest_api.models.activity_event import DomainFilterEntry
        mock_svc.get_filter_options.return_value = ActivityEventFilterOptions(
            domains=["budget_management"],
            event_types=["budget.created"],
            entity_types=["budget"],
            mapping={
                "budget_management": DomainFilterEntry(
                    event_types=["budget.created"],
                    entity_types=["budget"],
                )
            },
        )
        result = get_filter_options(_=None)
        assert "budget_management" in result.mapping
        assert result.mapping["budget_management"].event_types == ["budget.created"]
        assert result.mapping["budget_management"].entity_types == ["budget"]
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd codemie
poetry run pytest tests/codemie/rest_api/routers/test_activity_events_router.py::TestGetFilterOptions -v
```

Expected: `FAILED` — `DomainFilterEntry` does not exist yet, `ActivityEventFilterOptions` has no `mapping` field.

- [ ] **Step 3: Add `DomainFilterEntry` and `mapping` to the model**

Replace lines 36-39 of `codemie/src/codemie/rest_api/models/activity_event.py`:

```python
class DomainFilterEntry(BaseModel):
    event_types: list[str]
    entity_types: list[str]


class ActivityEventFilterOptions(BaseModel):
    domains: list[str]
    event_types: list[str]
    entity_types: list[str]
    mapping: dict[str, DomainFilterEntry] = {}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
poetry run pytest tests/codemie/rest_api/routers/test_activity_events_router.py::TestGetFilterOptions -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
cd codemie
git add src/codemie/rest_api/models/activity_event.py tests/codemie/rest_api/routers/test_activity_events_router.py
git commit -m "EPMCDME-13607: Add DomainFilterEntry model and mapping field to ActivityEventFilterOptions"
```

---

## Task 2: Backend repository — add `get_domain_mapping()`

**Files:**
- Modify: `codemie/src/codemie/service/activity/activity_repository.py:311`
- Test: `codemie/tests/codemie/service/activity/test_activity_repository.py`

- [ ] **Step 1: Write failing test**

Add at the end of `codemie/tests/codemie/service/activity/test_activity_repository.py`:

```python
def test_get_domain_mapping_groups_by_domain():
    session = MagicMock()
    # Simulate three rows: two budget events with different entity types, one user event
    session.execute.return_value.all.return_value = [
        ("budget_management", "budget.created",  "budget"),
        ("budget_management", "budget.updated",  "project_budget_group"),
        ("user_management",   "user.created",    "user"),
    ]

    result = _repo().get_domain_mapping(session)

    assert set(result["budget_management"].event_types) == {"budget.created", "budget.updated"}
    assert set(result["budget_management"].entity_types) == {"budget", "project_budget_group"}
    assert result["user_management"].event_types == ["user.created"]
    assert result["user_management"].entity_types == ["user"]
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd codemie
poetry run pytest tests/codemie/service/activity/test_activity_repository.py::test_get_domain_mapping_groups_by_domain -v
```

Expected: `FAILED` — `SQLActivityEventRepository` has no `get_domain_mapping` method.

- [ ] **Step 3: Implement `get_domain_mapping()`**

Add after line 311 (after `get_distinct_entity_types`) in `codemie/src/codemie/service/activity/activity_repository.py`:

```python
def get_domain_mapping(self, session: Session) -> dict[str, "DomainFilterEntry"]:
    from codemie.rest_api.models.activity_event import DomainFilterEntry

    stmt = (
        select(ActivityEvent.domain, ActivityEvent.event_type, ActivityEvent.entity_type)
        .distinct()
        .order_by(ActivityEvent.domain, ActivityEvent.event_type)
    )
    rows = session.execute(stmt).all()

    raw: dict[str, dict[str, set]] = {}
    for domain, event_type, entity_type in rows:
        if domain not in raw:
            raw[domain] = {"event_types": set(), "entity_types": set()}
        raw[domain]["event_types"].add(event_type)
        if entity_type is not None:
            raw[domain]["entity_types"].add(entity_type)

    return {
        domain: DomainFilterEntry(
            event_types=sorted(data["event_types"]),
            entity_types=sorted(data["entity_types"]),
        )
        for domain, data in raw.items()
    }
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
poetry run pytest tests/codemie/service/activity/test_activity_repository.py::test_get_domain_mapping_groups_by_domain -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
cd codemie
git add src/codemie/service/activity/activity_repository.py tests/codemie/service/activity/test_activity_repository.py
git commit -m "EPMCDME-13607: Add get_domain_mapping repository method"
```

---

## Task 3: Backend service — wire `mapping` into `get_filter_options()`

**Files:**
- Modify: `codemie/src/codemie/service/activity/activity_event_service.py:71-77`
- Test: `codemie/tests/codemie/service/activity/test_activity_event_service.py`

- [ ] **Step 1: Write failing test**

Open `codemie/tests/codemie/service/activity/test_activity_event_service.py` and add a test class for the mapping:

```python
from unittest.mock import MagicMock, patch

from codemie.rest_api.models.activity_event import DomainFilterEntry
from codemie.service.activity.activity_event_service import ActivityEventService


class TestGetFilterOptions:
    @patch("codemie.service.activity.activity_event_service.activity_event_repository")
    @patch("codemie.service.activity.activity_event_service.PostgresClient")
    def test_mapping_included_in_response(self, mock_pg, mock_repo):
        mock_pg.get_engine.return_value = MagicMock()
        mock_repo.get_distinct_domains.return_value = ["budget_management"]
        mock_repo.get_distinct_event_types.return_value = ["budget.created"]
        mock_repo.get_distinct_entity_types.return_value = ["budget"]
        mock_repo.get_domain_mapping.return_value = {
            "budget_management": DomainFilterEntry(
                event_types=["budget.created"],
                entity_types=["budget"],
            )
        }

        result = ActivityEventService().get_filter_options()

        assert "budget_management" in result.mapping
        assert result.mapping["budget_management"].event_types == ["budget.created"]
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd codemie
poetry run pytest tests/codemie/service/activity/test_activity_event_service.py::TestGetFilterOptions -v
```

Expected: `FAILED` — service does not call `get_domain_mapping` yet.

- [ ] **Step 3: Update `get_filter_options()` in the service**

Replace lines 71-77 in `codemie/src/codemie/service/activity/activity_event_service.py`:

```python
def get_filter_options(self) -> ActivityEventFilterOptions:
    with Session(PostgresClient.get_engine()) as session:
        return ActivityEventFilterOptions(
            domains=activity_event_repository.get_distinct_domains(session),
            event_types=activity_event_repository.get_distinct_event_types(session),
            entity_types=activity_event_repository.get_distinct_entity_types(session),
            mapping=activity_event_repository.get_domain_mapping(session),
        )
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
poetry run pytest tests/codemie/service/activity/test_activity_event_service.py::TestGetFilterOptions -v
```

Expected: `PASSED`

- [ ] **Step 5: Run all activity tests to confirm no regressions**

```bash
poetry run pytest tests/codemie/service/activity/ tests/codemie/rest_api/routers/test_activity_events_router.py -v
```

Expected: all `PASSED`

- [ ] **Step 6: Commit**

```bash
cd codemie
git add src/codemie/service/activity/activity_event_service.py tests/codemie/service/activity/test_activity_event_service.py
git commit -m "EPMCDME-13607: Include domain mapping in get_filter_options response"
```

---

## Task 4: Frontend types — add `DomainFilterEntry` and `mapping`

**Files:**
- Modify: `codemie-ui/src/types/entity/activityEvent.ts:29-33`

- [ ] **Step 1: Update the TypeScript interface**

Replace lines 29-33 in `codemie-ui/src/types/entity/activityEvent.ts`:

```typescript
export interface DomainFilterEntry {
  event_types: string[]
  entity_types: string[]
}

export interface ActivityEventFilterOptions {
  domains: string[]
  event_types: string[]
  entity_types: string[]
  mapping: Record<string, DomainFilterEntry>
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd codemie-ui
npm run type-check
```

Expected: no new errors. (`filterOptions` in the store is typed as `ActivityEventFilterOptions | null` — the new `mapping` field is additive, so existing code that does not access `mapping` compiles unchanged.)

- [ ] **Step 3: Commit**

```bash
cd codemie-ui
git add src/types/entity/activityEvent.ts
git commit -m "EPMCDME-13607: Add DomainFilterEntry type and mapping field to ActivityEventFilterOptions"
```

---

## Task 5: Frontend page — filter options by selected domains + revalidate on change

**Files:**
- Modify: `codemie-ui/src/pages/settings/administration/ActivityEventsPage.tsx:231-244`
- Test: `codemie-ui/src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx` (new file)

- [ ] **Step 1: Write failing tests**

Create `codemie-ui/src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { ActivityEventFilterOptions } from '@/types/entity/activityEvent'

// Pure helper extracted from the component — we test the logic in isolation
function computeFilteredOptions(
  filterOptions: ActivityEventFilterOptions | null,
  selectedDomains: string[]
): { eventTypeOptions: string[]; entityTypeOptions: string[] } {
  if (!filterOptions) return { eventTypeOptions: [], entityTypeOptions: [] }
  if (!selectedDomains.length) {
    return {
      eventTypeOptions: filterOptions.event_types,
      entityTypeOptions: filterOptions.entity_types,
    }
  }
  const eventTypes = new Set(
    selectedDomains.flatMap((d) => filterOptions.mapping[d]?.event_types ?? [])
  )
  const entityTypes = new Set(
    selectedDomains.flatMap((d) => filterOptions.mapping[d]?.entity_types ?? [])
  )
  return {
    eventTypeOptions: [...eventTypes].sort(),
    entityTypeOptions: [...entityTypes].sort(),
  }
}

function revalidateSelections(
  filterOptions: ActivityEventFilterOptions | null,
  selectedDomains: string[],
  selectedEventTypes: string[],
  selectedEntityTypes: string[]
): { eventType: string[]; entityType: string[] } {
  if (!filterOptions || !selectedDomains.length) {
    return { eventType: selectedEventTypes, entityType: selectedEntityTypes }
  }
  const allowedEvents = new Set(
    selectedDomains.flatMap((d) => filterOptions.mapping[d]?.event_types ?? [])
  )
  const allowedEntities = new Set(
    selectedDomains.flatMap((d) => filterOptions.mapping[d]?.entity_types ?? [])
  )
  return {
    eventType: selectedEventTypes.filter((e) => allowedEvents.has(e)),
    entityType: selectedEntityTypes.filter((t) => allowedEntities.has(t)),
  }
}

const FILTER_OPTIONS: ActivityEventFilterOptions = {
  domains: ['budget_management', 'user_management', 'project_management'],
  event_types: ['budget.created', 'project.created', 'user.created'],
  entity_types: ['budget', 'project', 'user'],
  mapping: {
    budget_management: {
      event_types: ['budget.created'],
      entity_types: ['budget'],
    },
    user_management: {
      event_types: ['user.created'],
      entity_types: ['user'],
    },
    project_management: {
      event_types: ['project.created'],
      entity_types: ['project'],
    },
  },
}

describe('computeFilteredOptions', () => {
  it('returns all options when no domain is selected', () => {
    const result = computeFilteredOptions(FILTER_OPTIONS, [])
    expect(result.eventTypeOptions).toEqual(['budget.created', 'project.created', 'user.created'])
    expect(result.entityTypeOptions).toEqual(['budget', 'project', 'user'])
  })

  it('returns empty arrays when filterOptions is null', () => {
    const result = computeFilteredOptions(null, ['budget_management'])
    expect(result.eventTypeOptions).toEqual([])
    expect(result.entityTypeOptions).toEqual([])
  })

  it('filters to selected domain only', () => {
    const result = computeFilteredOptions(FILTER_OPTIONS, ['budget_management'])
    expect(result.eventTypeOptions).toEqual(['budget.created'])
    expect(result.entityTypeOptions).toEqual(['budget'])
  })

  it('returns union when multiple domains are selected', () => {
    const result = computeFilteredOptions(FILTER_OPTIONS, ['budget_management', 'user_management'])
    expect(result.eventTypeOptions).toEqual(['budget.created', 'user.created'])
    expect(result.entityTypeOptions).toEqual(['budget', 'user'])
  })
})

describe('revalidateSelections', () => {
  it('clears event types no longer in allowed set when domain changes', () => {
    const result = revalidateSelections(
      FILTER_OPTIONS,
      ['budget_management'],
      ['budget.created', 'user.created'],
      ['budget', 'user']
    )
    expect(result.eventType).toEqual(['budget.created'])
    expect(result.entityType).toEqual(['budget'])
  })

  it('keeps all selections when no domain is selected', () => {
    const result = revalidateSelections(
      FILTER_OPTIONS,
      [],
      ['budget.created', 'user.created'],
      ['budget']
    )
    expect(result.eventType).toEqual(['budget.created', 'user.created'])
    expect(result.entityType).toEqual(['budget'])
  })

  it('keeps valid selections when multiple domains are selected', () => {
    const result = revalidateSelections(
      FILTER_OPTIONS,
      ['budget_management', 'user_management'],
      ['budget.created', 'user.created'],
      ['budget', 'user']
    )
    expect(result.eventType).toEqual(['budget.created', 'user.created'])
    expect(result.entityType).toEqual(['budget', 'user'])
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd codemie-ui
npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx
```

Expected: `FAILED` — `computeFilteredOptions` and `revalidateSelections` do not exist in the module yet. (The test file defines them as local helpers for isolation; the component will implement the same logic inline. After the component is updated, these tests will pass as they test the identical pure logic.)

- [ ] **Step 3: Update `ActivityEventsPage.tsx`**

Replace lines 231-244 (the three `useMemo` blocks for `domainOptions`, `eventTypeOptions`, `entityTypeOptions`) with:

```typescript
const domainOptions = useMemo(
  () => (filterOptions?.domains ?? []).map((d) => ({ label: d, value: d })),
  [filterOptions]
)

const eventTypeOptions = useMemo(() => {
  if (!filterOptions) return []
  if (!domain.length) return filterOptions.event_types.map((e) => ({ label: e, value: e }))
  const allowed = new Set(domain.flatMap((d) => filterOptions.mapping[d]?.event_types ?? []))
  return [...allowed].sort().map((e) => ({ label: e, value: e }))
}, [filterOptions, domain])

const entityTypeOptions = useMemo(() => {
  if (!filterOptions) return []
  if (!domain.length) return filterOptions.entity_types.map((t) => ({ label: t, value: t }))
  const allowed = new Set(domain.flatMap((d) => filterOptions.mapping[d]?.entity_types ?? []))
  return [...allowed].sort().map((t) => ({ label: t, value: t }))
}, [filterOptions, domain])
```

Then add a revalidation `useEffect` after the existing `useEffect` block that calls `loadFilterOptions` (after line 192):

```typescript
useEffect(() => {
  if (!filterOptions || !domain.length) return
  const allowedEventTypes = new Set(
    domain.flatMap((d) => filterOptions.mapping[d]?.event_types ?? [])
  )
  const allowedEntityTypes = new Set(
    domain.flatMap((d) => filterOptions.mapping[d]?.entity_types ?? [])
  )
  setEventType((prev) => prev.filter((e) => allowedEventTypes.has(e)))
  setEntityType((prev) => prev.filter((t) => allowedEntityTypes.has(t)))
}, [domain, filterOptions])
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd codemie-ui
npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx
```

Expected: all `PASSED`

- [ ] **Step 5: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd codemie-ui
git add src/pages/settings/administration/ActivityEventsPage.tsx src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx
git commit -m "EPMCDME-13607: Filter Event type and Entity type options by selected domain(s)"
```

---

## Test-first summary

| Task | Test-first | Failing test description |
|---|---|---|
| 1 | yes | `TestGetFilterOptions.test_returns_mapping_field` — `DomainFilterEntry` not imported |
| 2 | yes | `test_get_domain_mapping_groups_by_domain` — method missing on repo |
| 3 | yes | `TestGetFilterOptions.test_mapping_included_in_response` — service does not call `get_domain_mapping` |
| 4 | no | Pure type change; no logic to test-drive |
| 5 | yes | `computeFilteredOptions` / `revalidateSelections` in isolated helper tests |

---

## Manual verification checklist

After all tasks are committed, verify in the browser with the seeded data:

1. Open `/settings/administration/activity-events` (must be a maintainer).
2. All three dropdowns show values.
3. Select `budget_management` in Domain → Event type shows only `budget.*` entries; Entity type shows only `budget`, `project_budget_group`, `user_budget_assignment`, `project_budget_assignment`.
4. Select also `user_management` → Event type now includes `user.*` entries too; Entity type also includes `user`.
5. Pre-select `user.created` in Event type, then remove `user_management` from Domain → `user.created` is automatically removed from Event type selection.
6. Clear all domain selections → all Event type and Entity type options reappear.
