# Implementation Plan: Platform Activity Management (Work Item CRUD)

## Overview
Implement front-end UI in codemie-ui for creating, viewing, editing, filtering, and sorting work items with fields: Title, Description, Type, Priority, Status, Assignee, and Tags.

## User Story
**As a** platform user, **I want to** create and manage work items, **so that** I can track platform activities effectively.

## Acceptance Criteria
1. Users can create/edit work items with Title, Description, Type, Priority, Status, Assignee, and Tags
2. Users can view work items in a list
3. Users can filter by Type, Priority, and Status
4. Users can sort by Priority, Created date, and Updated date
5. Required fields are validated before submission
6. UI integrates with existing REST APIs

## Data Model
**Work Item:**
- `id` (string, auto-generated)
- `title` (string, required, max 200 chars)
- `description` (string, optional)
- `type` (enum: Task, Bug, Feature, required)
- `priority` (enum: Low, Medium, High, Critical, required)
- `status` (enum: Open, InProgress, Done, Closed, required)
- `assignee` (string, user ID, optional)
- `tags` (string[], optional)
- `createdAt` (ISO datetime)
- `updatedAt` (ISO datetime)

## API Endpoints
Assume backend provides:
- `GET /v1/work-items?type=&priority=&status=&sort=&order=` - list with filters/sort
- `GET /v1/work-items/:id` - get single item
- `POST /v1/work-items` - create
- `PUT /v1/work-items/:id` - update
- `DELETE /v1/work-items/:id` - delete

## Front-end Components Needed
1. **WorkItemList** - table with filter controls and sort headers
2. **WorkItemForm** - create/edit modal using React Hook Form + Yup validation
3. **WorkItemFilters** - dropdown controls for Type, Priority, Status
4. **WorkItemCard** - optional card view for future mobile layout
5. **store/workItems.ts** - Valtio store managing state and API calls

## Implementation Sequence
1. Create Valtio store (`src/store/workItems.ts`) with CRUD methods
2. Build WorkItemForm modal with validation (Title required, max lengths)
3. Build WorkItemList page with PrimeReact DataTable
4. Add filter dropdowns and sort handlers
5. Integrate form save → API → store update → list refresh
6. Add unit tests for store logic
7. Add integration test for full create/list flow
8. Update routing in `src/router.tsx` to `/work-items`
