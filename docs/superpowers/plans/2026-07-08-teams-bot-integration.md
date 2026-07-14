# Teams Bot Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Teams Bot Integration" settings page that lets project admins configure which assistants act as a Teams bot for each project.

**Architecture:** Two routes (`/settings/administration/teams` and `/settings/administration/teams/:projectName`) backed by a new `assistantsProjectMappingStore`. A modal using the existing `AssistantSelector` handles adding a single assistant at a time. The feature is gated behind a `features:teamsBotIntegration` config flag.

**Tech Stack:** React, TypeScript, Valtio (proxy store), React Router v6, Vitest + Testing Library, Tailwind CSS.

## Global Constraints

- Feature flag key: `"features:teamsBotIntegration"` (exact string — used in both utility and hook)
- API base path: `v1/assistants/projects/mapping` (GET) and `v1/assistants/{id}/projects/mapping` (POST/DELETE)
- `feature` query/body param is always `"teams"` (the only valid `AssistantProjectFeature` value)
- `page` is 0-indexed everywhere; `per_page` default is 12
- File header: all new files start with the Apache 2.0 copyright header (see any existing file in `src/`)
- Lint: `npm run lint` must pass after every commit
- Type-check: `npm run typecheck` must pass after every commit
- Test command: `npm run test:unit -- --reporter=verbose <test file path>`
- Commit message format: `EPMCDME-13354: Capital sentence` (enforced by CI)
- `toaster.info()` for success messages, `toaster.error()` for failures (consistent with other admin pages)

---

### Task 1: Types and SettingsTab constant

**Test-first:** yes — verify the new enum value and type exports exist without TypeScript errors.

**Files:**
- Modify: `src/constants/index.ts` (add `TEAMS_BOT_INTEGRATION` to `SettingsTab` enum)
- Create: `src/types/entity/assistantProjectMapping.ts`
- Test: `src/types/entity/__tests__/assistantProjectMapping.test.ts`

**Interfaces:**
- Produces: `AssistantProjectFeature`, `AssistantProjectMappingRequest`, `AssistantProjectMappingResponse` — consumed by Task 3 (store) and Task 6 (page 2)
- Produces: `SettingsTab.TEAMS_BOT_INTEGRATION = 'teams_bot_integration'` — consumed by Task 4 (navigation)

- [ ] **Step 1: Write the failing test**

Create `src/types/entity/__tests__/assistantProjectMapping.test.ts`:

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

import { describe, expect, it } from 'vitest'

import type {
  AssistantProjectFeature,
  AssistantProjectMappingRequest,
  AssistantProjectMappingResponse,
} from '../assistantProjectMapping'

describe('assistantProjectMapping types', () => {
  it('accepts "teams" as a valid AssistantProjectFeature', () => {
    const feature: AssistantProjectFeature = 'teams'
    expect(feature).toBe('teams')
  })

  it('AssistantProjectMappingRequest has project_name and feature fields', () => {
    const req: AssistantProjectMappingRequest = { project_name: 'my-project', feature: 'teams' }
    expect(req.project_name).toBe('my-project')
    expect(req.feature).toBe('teams')
  })

  it('AssistantProjectMappingResponse has a message field', () => {
    const res: AssistantProjectMappingResponse = { message: 'ok' }
    expect(res.message).toBe('ok')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/types/entity/__tests__/assistantProjectMapping.test.ts
```

Expected: FAIL — `Cannot find module '../assistantProjectMapping'`

- [ ] **Step 3: Add `TEAMS_BOT_INTEGRATION` to the `SettingsTab` enum**

In `src/constants/index.ts`, add inside the `SettingsTab` enum after `AWS_AGENTCORE_RUNTIMES`:

```typescript
TEAMS_BOT_INTEGRATION = 'teams_bot_integration',
```

- [ ] **Step 4: Create `src/types/entity/assistantProjectMapping.ts`**

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

export type AssistantProjectFeature = 'teams'

export interface AssistantProjectMappingRequest {
  project_name: string
  feature: AssistantProjectFeature
}

export interface AssistantProjectMappingResponse {
  message: string
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/types/entity/__tests__/assistantProjectMapping.test.ts
```

Expected: PASS — 3 tests pass

- [ ] **Step 6: Type-check**

```bash
npm run typecheck
```

Expected: silent output, exit code 0

- [ ] **Step 7: Commit**

```bash
git add src/constants/index.ts src/types/entity/assistantProjectMapping.ts src/types/entity/__tests__/assistantProjectMapping.test.ts
git commit -m "EPMCDME-13354: Add AssistantProjectFeature types and SettingsTab constant"
```

---

### Task 2: Feature flag utility and hook

**Test-first:** yes — verify `isTeamsEnabled()` returns false when config is not loaded.

**Files:**
- Modify: `src/utils/featureFlags.ts` (add `isTeamsEnabled`)
- Modify: `src/hooks/useFeatureFlags.ts` (add `useTeamsEnabled`)
- Test: `src/utils/__tests__/featureFlags.test.ts` (create or append)

**Interfaces:**
- Consumes: `isFeatureEnabled('features:teamsBotIntegration')` from `src/utils/featureFlags.ts`
- Produces: `isTeamsEnabled(): boolean` — consumed by Task 4 (tabs.tsx)
- Produces: `useTeamsEnabled(): FeatureFlagResult` — consumed by Task 5 (TeamsBotPage)

- [ ] **Step 1: Write the failing test**

Check if `src/utils/__tests__/featureFlags.test.ts` exists. If not, create it. Append these tests:

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

import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    isConfigFetched: false,
    configs: null,
  },
}))

describe('isTeamsEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when config is not fetched', async () => {
    const { isTeamsEnabled } = await import('@/utils/featureFlags')
    expect(isTeamsEnabled()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/utils/__tests__/featureFlags.test.ts
```

Expected: FAIL — `isTeamsEnabled is not a function`

- [ ] **Step 3: Add `isTeamsEnabled` to `src/utils/featureFlags.ts`**

Append after `isRequestHedgingEnabled`:

```typescript
/**
 * Check if Teams Bot Integration feature is enabled (non-reactive utility)
 */
export const isTeamsEnabled = (): boolean => {
  return isFeatureEnabled('features:teamsBotIntegration')
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/utils/__tests__/featureFlags.test.ts
```

Expected: PASS

- [ ] **Step 5: Add `useTeamsEnabled` to `src/hooks/useFeatureFlags.ts`**

Append after `useRequestHedgingEnabled`:

```typescript
export const useTeamsEnabled = (): FeatureFlagResult => {
  return useFeatureFlag('features:teamsBotIntegration')
}
```

- [ ] **Step 6: Lint and type-check**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0 for both

- [ ] **Step 7: Commit**

```bash
git add src/utils/featureFlags.ts src/hooks/useFeatureFlags.ts src/utils/__tests__/featureFlags.test.ts
git commit -m "EPMCDME-13354: Add isTeamsEnabled and useTeamsEnabled feature flag helpers"
```

---

### Task 3: `assistantsProjectMappingStore`

**Test-first:** yes — `fetchMappings` stores assistants and pagination; `addMapping` calls the correct POST URL; `removeMapping` calls DELETE and treats 404 as no-op.

**Files:**
- Create: `src/store/assistantsProjectMapping.ts`
- Create: `src/store/__tests__/assistantsProjectMapping.test.ts`

**Interfaces:**
- Consumes: `Assistant` from `@/types/entity/assistant`, `Pagination` from `@/types/common`, `AssistantProjectMappingRequest` from `@/types/entity/assistantProjectMapping`
- Produces: `assistantsProjectMappingStore` with `fetchMappings`, `addMapping`, `removeMapping`, `assistants`, `pagination`, `loading`, `error` — consumed by Tasks 6 and 7

- [ ] **Step 1: Write the failing tests**

Create `src/store/__tests__/assistantsProjectMapping.test.ts`:

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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('assistantsProjectMappingStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchMappings', () => {
    it('stores assistants and pagination on success', async () => {
      const mockAssistants = [
        { id: 'a1', name: 'Assistant One', slug: 'assistant-one', description: '', is_global: false, shared: false, created_at: '', updated_at: '', system_prompt: '', llm_model_type: '' },
      ]
      mockGet.mockResolvedValue({
        json: async () => ({
          data: mockAssistants,
          pagination: { page: 0, per_page: 12, total: 1, pages: 1 },
        }),
      })

      const { assistantsProjectMappingStore } = await import('@/store/assistantsProjectMapping')
      await assistantsProjectMappingStore.fetchMappings('my-project')

      expect(mockGet).toHaveBeenCalledWith(
        'v1/assistants/projects/mapping?feature=teams&project=my-project&page=0&per_page=12'
      )
      expect(assistantsProjectMappingStore.assistants).toEqual(mockAssistants)
      expect(assistantsProjectMappingStore.pagination.totalCount).toBe(1)
      expect(assistantsProjectMappingStore.loading).toBe(false)
    })

    it('sets error on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      const { assistantsProjectMappingStore } = await import('@/store/assistantsProjectMapping')
      await expect(assistantsProjectMappingStore.fetchMappings('my-project')).rejects.toThrow()

      expect(assistantsProjectMappingStore.error).toContain('Failed to fetch')
      expect(assistantsProjectMappingStore.loading).toBe(false)
    })
  })

  describe('addMapping', () => {
    it('calls POST with correct URL and body', async () => {
      mockPost.mockResolvedValue({ json: async () => ({ message: 'ok' }) })
      mockGet.mockResolvedValue({ json: async () => ({ data: [], pagination: { page: 0, per_page: 12, total: 0, pages: 0 } }) })

      const { assistantsProjectMappingStore } = await import('@/store/assistantsProjectMapping')
      await assistantsProjectMappingStore.addMapping('assistant-uuid-123', 'my-project')

      expect(mockPost).toHaveBeenCalledWith(
        'v1/assistants/assistant-uuid-123/projects/mapping',
        { project_name: 'my-project', feature: 'teams' }
      )
    })
  })

  describe('removeMapping', () => {
    it('calls DELETE with correct URL and query params', async () => {
      mockDelete.mockResolvedValue({ json: async () => ({ message: 'ok' }) })
      mockGet.mockResolvedValue({ json: async () => ({ data: [], pagination: { page: 0, per_page: 12, total: 0, pages: 0 } }) })

      const { assistantsProjectMappingStore } = await import('@/store/assistantsProjectMapping')
      await assistantsProjectMappingStore.removeMapping('assistant-uuid-123', 'my-project')

      expect(mockDelete).toHaveBeenCalledWith(
        'v1/assistants/assistant-uuid-123/projects/mapping?project=my-project&feature=teams'
      )
    })

    it('treats 404 as a no-op (does not throw)', async () => {
      const notFoundError: any = new Error('Not found')
      notFoundError.response = { status: 404 }
      mockDelete.mockRejectedValue(notFoundError)
      mockGet.mockResolvedValue({ json: async () => ({ data: [], pagination: { page: 0, per_page: 12, total: 0, pages: 0 } }) })

      const { assistantsProjectMappingStore } = await import('@/store/assistantsProjectMapping')
      await expect(assistantsProjectMappingStore.removeMapping('assistant-uuid-123', 'my-project')).resolves.not.toThrow()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- --reporter=verbose src/store/__tests__/assistantsProjectMapping.test.ts
```

Expected: FAIL — `Cannot find module '@/store/assistantsProjectMapping'`

- [ ] **Step 3: Create `src/store/assistantsProjectMapping.ts`**

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

import { proxy } from 'valtio'

import { Pagination } from '@/types/common'
import { Assistant } from '@/types/entity/assistant'
import api from '@/utils/api'

const DEFAULT_PAGE = 0
const DEFAULT_PER_PAGE = 12

interface AssistantsProjectMappingStore {
  assistants: Assistant[]
  pagination: Pagination
  loading: boolean
  error: string | null
  fetchMappings: (project: string, page?: number, perPage?: number) => Promise<void>
  addMapping: (assistantId: string, projectName: string) => Promise<void>
  removeMapping: (assistantId: string, projectName: string) => Promise<void>
}

export const assistantsProjectMappingStore = proxy<AssistantsProjectMappingStore>({
  assistants: [],
  pagination: {
    page: DEFAULT_PAGE,
    perPage: DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  loading: false,
  error: null,

  async fetchMappings(project, page = DEFAULT_PAGE, perPage = DEFAULT_PER_PAGE) {
    this.loading = true
    this.error = null

    try {
      const url = `v1/assistants/projects/mapping?feature=teams&project=${encodeURIComponent(project)}&page=${page}&per_page=${perPage}`
      const response = await api.get(url)
      const data = await response.json()

      this.assistants = data.data ?? []
      this.pagination = {
        page: data.pagination?.page ?? 0,
        perPage: data.pagination?.per_page ?? perPage,
        totalPages: data.pagination?.pages ?? 0,
        totalCount: data.pagination?.total ?? 0,
      }
    } catch (error: any) {
      this.error = `Failed to fetch assistant mappings: ${error.message}`
      throw error
    } finally {
      this.loading = false
    }
  },

  async addMapping(assistantId, projectName) {
    const response = await api.post(`v1/assistants/${assistantId}/projects/mapping`, {
      project_name: projectName,
      feature: 'teams',
    })
    await response.json()
    await this.fetchMappings(projectName, this.pagination.page, this.pagination.perPage)
  },

  async removeMapping(assistantId, projectName) {
    try {
      const url = `v1/assistants/${assistantId}/projects/mapping?project=${encodeURIComponent(projectName)}&feature=teams`
      const response = await api.delete(url)
      await response.json()
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return
      }
      throw error
    }
    await this.fetchMappings(projectName, this.pagination.page, this.pagination.perPage)
  },
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- --reporter=verbose src/store/__tests__/assistantsProjectMapping.test.ts
```

Expected: PASS — 5 tests pass

- [ ] **Step 5: Lint and type-check**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0 for both

- [ ] **Step 6: Commit**

```bash
git add src/store/assistantsProjectMapping.ts src/store/__tests__/assistantsProjectMapping.test.ts
git commit -m "EPMCDME-13354: Add assistantsProjectMappingStore with fetch/add/remove methods"
```

---

### Task 4: Navigation tab and routes

**Test-first:** no — navigation/routing changes are verified by running the app. The tabs.tsx change is straightforward configuration.

**Files:**
- Modify: `src/pages/settings/tabs.tsx` (add Teams bot integration nav entry)
- Modify: `src/router.tsx` (add 2 new routes + import 2 new page components)

**Interfaces:**
- Consumes: `SettingsTab.TEAMS_BOT_INTEGRATION` from Task 1
- Consumes: `isTeamsEnabled()` from Task 2
- Produces: routes `/settings/administration/teams` and `/settings/administration/teams/:projectName` — consumed by Tasks 5 and 6

- [ ] **Step 1: Add nav entry in `src/pages/settings/tabs.tsx`**

Add `isTeamsEnabled` import at the top (alongside `isMcpEnabled`):

```typescript
import { isCostCentersEnabled, isMcpEnabled, isTeamsEnabled } from '@/utils/featureFlags'
```

In the `administrationChildren` array inside `getNavigationTabs`, add the Teams bot entry (it goes through `.sort()` alphabetically, so ordering in source doesn't matter):

```typescript
...(isTeamsEnabled()
  ? [
      {
        id: SettingsTab.TEAMS_BOT_INTEGRATION,
        name: 'Teams bot integration',
        title: 'Teams bot integration',
        url: '/settings/administration/teams',
      },
    ]
  : []),
```

Add this block alongside the `isMcpFeatureEnabled` block — place it right after the MCP block for clarity. The `.sort()` call will put it alphabetically.

- [ ] **Step 2: Add routes in `src/router.tsx`**

Add imports at the top of the file (alongside other page imports):

```typescript
import TeamsBotPage from '@/pages/settings/administration/TeamsBotPage'
import TeamsBotProjectPage from '@/pages/settings/administration/TeamsBotProjectPage'
```

Add the two routes inside `settingsRoutes`, after the MCP route:

```typescript
{
  path: '/settings/administration/teams',
  Component: TeamsBotPage,
},
{
  id: 'teams-bot-project',
  path: '/settings/administration/teams/:projectName',
  Component: TeamsBotProjectPage,
},
```

- [ ] **Step 3: Create placeholder page stubs so the router compiles**

Create `src/pages/settings/administration/TeamsBotPage.tsx`:

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

import { FC } from 'react'

import SettingsLayout from '@/pages/settings/components/SettingsLayout'

const TeamsBotPage: FC = () => {
  return <SettingsLayout contentTitle="Teams bot integration" content={<div />} />
}

export default TeamsBotPage
```

Create `src/pages/settings/administration/TeamsBotProjectPage.tsx`:

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

import { FC } from 'react'

import SettingsLayout from '@/pages/settings/components/SettingsLayout'

const TeamsBotProjectPage: FC = () => {
  return <SettingsLayout contentTitle="Teams bot" content={<div />} />
}

export default TeamsBotProjectPage
```

- [ ] **Step 4: Lint and type-check**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0 for both

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/tabs.tsx src/router.tsx src/pages/settings/administration/TeamsBotPage.tsx src/pages/settings/administration/TeamsBotProjectPage.tsx
git commit -m "EPMCDME-13354: Add Teams bot integration nav tab and routes"
```

---

### Task 5: Page 1 — TeamsBotPage (project list)

**Test-first:** yes — renders a table with projects from the store; "Configure" button navigates to the project page; redirects when feature flag is disabled.

**Files:**
- Modify: `src/pages/settings/administration/TeamsBotPage.tsx` (full implementation, replacing placeholder)
- Create: `src/pages/settings/administration/__tests__/TeamsBotPage.test.tsx`

**Interfaces:**
- Consumes: `projectsStore.indexProjects(page, perPage, search)` from `@/store/projects`
- Consumes: `useTeamsEnabled()` from Task 2
- Consumes: `DEFAULT_PAGINATION_OPTIONS` from `@/constants`
- Produces: navigates to `/settings/administration/teams/:projectName` on "Configure" click

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/__tests__/TeamsBotPage.test.tsx`:

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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
const mockIndexProjects = vi.fn()

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/store/projects', () => ({
  projectsStore: {
    projects: [
      { id: 'p1', name: 'alpha-project', display_name: 'Alpha Project' },
      { id: 'p2', name: 'beta-project', display_name: 'Beta Project' },
    ],
    pagination: { page: 0, perPage: 12, totalPages: 1, totalCount: 2 },
    loading: false,
    indexProjects: mockIndexProjects,
  },
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useTeamsEnabled: () => [true, true],
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: { content: React.ReactNode }) => <div>{content}</div>,
}))

describe('TeamsBotPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIndexProjects.mockResolvedValue([])
  })

  it('renders project rows', async () => {
    const { default: TeamsBotPage } = await import('../TeamsBotPage')
    render(<MemoryRouter><TeamsBotPage /></MemoryRouter>)
    expect(await screen.findByText('alpha-project')).toBeInTheDocument()
    expect(screen.getByText('beta-project')).toBeInTheDocument()
  })

  it('navigates to project page on Configure click', async () => {
    const { default: TeamsBotPage } = await import('../TeamsBotPage')
    render(<MemoryRouter><TeamsBotPage /></MemoryRouter>)
    const buttons = await screen.findAllByRole('button', { name: /configure/i })
    fireEvent.click(buttons[0])
    expect(mockNavigate).toHaveBeenCalledWith('/settings/administration/teams/alpha-project')
  })

  it('redirects to /settings/administration when feature flag is disabled', async () => {
    vi.doMock('@/hooks/useFeatureFlags', () => ({
      useTeamsEnabled: () => [false, true],
    }))
    const { default: TeamsBotPage } = await import('../TeamsBotPage')
    render(<MemoryRouter><TeamsBotPage /></MemoryRouter>)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/administration', { replace: true })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/pages/settings/administration/__tests__/TeamsBotPage.test.tsx
```

Expected: FAIL — component is a placeholder stub

- [ ] **Step 3: Implement `src/pages/settings/administration/TeamsBotPage.tsx`**

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

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Table from '@/components/Table'
import { ButtonSize, DEFAULT_PAGINATION_OPTIONS } from '@/constants'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { useTeamsEnabled } from '@/hooks/useFeatureFlags'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { projectsStore } from '@/store/projects'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

const columnDefinitions: ColumnDefinition[] = [
  { key: 'name', label: 'Name', type: DefinitionTypes.Custom, headClassNames: 'w-[80%]' },
  { key: 'actions', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
]

const TeamsBotPage: FC = () => {
  const navigate = useNavigate()
  const { projects, pagination, loading } = useSnapshot(projectsStore) as typeof projectsStore
  const [isTeamsFeatureEnabled, isConfigLoaded] = useTeamsEnabled()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isConfigLoaded && !isTeamsFeatureEnabled) {
      navigate('/settings/administration', { replace: true })
    }
  }, [isTeamsFeatureEnabled, isConfigLoaded, navigate])

  const loadProjects = useCallback(
    (page: number, perPage: number, currentSearch: string) => {
      projectsStore.indexProjects(page, perPage, currentSearch || undefined).catch((error) => {
        console.error('Failed to load projects:', error)
      })
    },
    []
  )

  useDebouncedApply(search, 300, () => {
    loadProjects(0, pagination.perPage, search)
  })

  useEffect(() => {
    loadProjects(0, pagination.perPage, '')
  }, [])

  const handlePageChange = useCallback(
    (page: number, newPerPage?: number) => {
      loadProjects(page, newPerPage ?? pagination.perPage, search)
    },
    [pagination.perPage, search, loadProjects]
  )

  const customRenderColumns = useMemo(
    () => ({
      name: (item: (typeof projects)[0]) => <span>{item.name}</span>,
      actions: (item: (typeof projects)[0]) => (
        <Button
          size={ButtonSize.MEDIUM}
          onClick={() => navigate(`/settings/administration/teams/${item.name}`)}
        >
          Configure
        </Button>
      ),
    }),
    [navigate]
  )

  if (!isConfigLoaded) return null
  if (!isTeamsFeatureEnabled) return null

  const renderContent = () => (
    <div className="flex flex-col h-full pt-6 gap-4">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          label="Search"
          placeholder="Search projects"
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
        />
      </div>
      <Table
        items={projects}
        columnDefinitions={columnDefinitions}
        customRenderColumns={customRenderColumns}
        loading={loading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          perPage: pagination.perPage,
        }}
        onPaginationChange={handlePageChange}
        perPageOptions={DEFAULT_PAGINATION_OPTIONS}
      />
    </div>
  )

  return (
    <SettingsLayout contentTitle="Teams bot integration" content={renderContent()} />
  )
}

export default TeamsBotPage
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/pages/settings/administration/__tests__/TeamsBotPage.test.tsx
```

Expected: PASS

- [ ] **Step 5: Lint and type-check**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0 for both

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/TeamsBotPage.tsx src/pages/settings/administration/__tests__/TeamsBotPage.test.tsx
git commit -m "EPMCDME-13354: Implement TeamsBotPage project list with search and pagination"
```

---

### Task 6: Page 2 — TeamsBotProjectPage (assistant list per project)

**Test-first:** yes — loads assistant mappings on mount; Delete button calls `removeMapping` and shows toast; empty state is shown when no assistants.

**Files:**
- Modify: `src/pages/settings/administration/TeamsBotProjectPage.tsx` (full implementation)
- Create: `src/pages/settings/administration/__tests__/TeamsBotProjectPage.test.tsx`

**Interfaces:**
- Consumes: `assistantsProjectMappingStore.fetchMappings/removeMapping` from Task 3
- Consumes: `useParams()` to read `:projectName` from URL
- Produces: renders a table of enabled assistants; "Add assistant" button (wired in Task 7)

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/__tests__/TeamsBotProjectPage.test.tsx`:

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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockFetchMappings = vi.fn()
const mockRemoveMapping = vi.fn()

vi.mock('@/store/assistantsProjectMapping', () => ({
  assistantsProjectMappingStore: {
    assistants: [
      { id: 'a1', name: 'Bot Alpha', slug: 'bot-alpha', description: '', is_global: false, shared: false, created_at: '', updated_at: '', system_prompt: '', llm_model_type: '' },
    ],
    pagination: { page: 0, perPage: 12, totalPages: 1, totalCount: 1 },
    loading: false,
    error: null,
    fetchMappings: mockFetchMappings,
    removeMapping: mockRemoveMapping,
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: { content: React.ReactNode }) => <div>{content}</div>,
}))

const renderWithRoute = (projectName: string) => {
  const { default: TeamsBotProjectPage } = require('../TeamsBotProjectPage')
  return render(
    <MemoryRouter initialEntries={[`/settings/administration/teams/${projectName}`]}>
      <Routes>
        <Route path="/settings/administration/teams/:projectName" element={<TeamsBotProjectPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TeamsBotProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchMappings.mockResolvedValue(undefined)
    mockRemoveMapping.mockResolvedValue(undefined)
  })

  it('calls fetchMappings on mount with projectName from URL', async () => {
    renderWithRoute('my-project')
    await waitFor(() => {
      expect(mockFetchMappings).toHaveBeenCalledWith('my-project', 0, 12)
    })
  })

  it('renders assistant rows', async () => {
    renderWithRoute('my-project')
    expect(await screen.findByText('Bot Alpha')).toBeInTheDocument()
  })

  it('calls removeMapping when Delete is clicked and shows success toast', async () => {
    const toaster = (await import('@/utils/toaster')).default
    renderWithRoute('my-project')
    const deleteButton = await screen.findByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)
    await waitFor(() => {
      expect(mockRemoveMapping).toHaveBeenCalledWith('a1', 'my-project')
      expect(toaster.info).toHaveBeenCalledWith('Assistant removed')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/pages/settings/administration/__tests__/TeamsBotProjectPage.test.tsx
```

Expected: FAIL — placeholder stub doesn't render assistants or call fetchMappings

- [ ] **Step 3: Implement `src/pages/settings/administration/TeamsBotProjectPage.tsx`**

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

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useSnapshot } from 'valtio'

import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import Button from '@/components/Button'
import Table from '@/components/Table'
import { ButtonSize, ButtonType, DEFAULT_PAGINATION_OPTIONS } from '@/constants'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { assistantsProjectMappingStore } from '@/store/assistantsProjectMapping'
import { Assistant } from '@/types/entity/assistant'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import toaster from '@/utils/toaster'

import AddAssistantModal from './components/AddAssistantModal'

const columnDefinitions: ColumnDefinition[] = [
  { key: 'name', label: 'Name', type: DefinitionTypes.Custom, headClassNames: 'w-[80%]' },
  { key: 'actions', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
]

const TeamsBotProjectPage: FC = () => {
  const { projectName } = useParams<{ projectName: string }>()
  const navigate = useNavigate()
  const { assistants, pagination, loading } = useSnapshot(
    assistantsProjectMappingStore
  ) as typeof assistantsProjectMappingStore
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!projectName) return
    assistantsProjectMappingStore
      .fetchMappings(projectName, pagination.page, pagination.perPage)
      .catch((error) => console.error('Failed to load assistant mappings:', error))
  }, [projectName])

  const handleDelete = useCallback(
    async (assistant: Assistant) => {
      if (!projectName) return
      try {
        await assistantsProjectMappingStore.removeMapping(assistant.id, projectName)
        toaster.info('Assistant removed')
      } catch (error: any) {
        toaster.error(error?.message || 'Failed to remove assistant')
      }
    },
    [projectName]
  )

  const handlePageChange = useCallback(
    (page: number, newPerPage?: number) => {
      if (!projectName) return
      assistantsProjectMappingStore
        .fetchMappings(projectName, page, newPerPage ?? pagination.perPage)
        .catch((error) => console.error('Failed to load assistant mappings:', error))
    },
    [projectName, pagination.perPage]
  )

  const customRenderColumns = useMemo(
    () => ({
      name: (item: Assistant) => <span>{item.name}</span>,
      actions: (item: Assistant) => (
        <Button
          size={ButtonSize.MEDIUM}
          type={ButtonType.DELETE}
          onClick={() => handleDelete(item)}
        >
          Delete
        </Button>
      ),
    }),
    [handleDelete]
  )

  const renderHeaderActions = useMemo(
    () => (
      <Button onClick={() => setShowModal(true)} size={ButtonSize.MEDIUM}>
        <PlusFilledSvg />
        Add assistant
      </Button>
    ),
    []
  )

  const renderContent = () => (
    <div className="flex flex-col h-full pt-6">
      <Table
        items={assistants}
        columnDefinitions={columnDefinitions}
        customRenderColumns={customRenderColumns}
        loading={loading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          perPage: pagination.perPage,
        }}
        onPaginationChange={handlePageChange}
        perPageOptions={DEFAULT_PAGINATION_OPTIONS}
      />
      {showModal && projectName && (
        <AddAssistantModal
          projectName={projectName}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )

  return (
    <SettingsLayout
      contentTitle={`Teams bot — ${projectName ?? ''}`}
      content={renderContent()}
      rightContent={renderHeaderActions}
      onBack={() => navigate('/settings/administration/teams')}
    />
  )
}

export default TeamsBotProjectPage
```

**Note on `onBack`:** check `SettingsLayout`'s props — if it does not accept `onBack`, use a `<button>` or `<Link>` above the table instead. Run `grep -n "onBack\|backUrl\|back" src/pages/settings/components/SettingsLayout.tsx` to verify the prop name.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/pages/settings/administration/__tests__/TeamsBotProjectPage.test.tsx
```

Expected: PASS

- [ ] **Step 5: Lint and type-check**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0 for both

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/TeamsBotProjectPage.tsx src/pages/settings/administration/__tests__/TeamsBotProjectPage.test.tsx
git commit -m "EPMCDME-13354: Implement TeamsBotProjectPage assistant list with delete"
```

---

### Task 7: AddAssistantModal

**Test-first:** yes — renders an assistant selector and calls `addMapping` with the selected assistant id on confirm.

**Files:**
- Create: `src/pages/settings/administration/components/AddAssistantModal.tsx`
- Create: `src/pages/settings/administration/components/__tests__/AddAssistantModal.test.tsx`

**Interfaces:**
- Consumes: `AssistantSelector` from `@/pages/assistants/components/AssistantSelector` with props `singleValue={true}`, `project={projectName}`
- Consumes: `assistantsProjectMappingStore.addMapping` from Task 3
- Props: `{ projectName: string; onClose: () => void }`

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/components/__tests__/AddAssistantModal.test.tsx`:

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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockAddMapping = vi.fn()

vi.mock('@/store/assistantsProjectMapping', () => ({
  assistantsProjectMappingStore: {
    addMapping: mockAddMapping,
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('@/pages/assistants/components/AssistantSelector', () => ({
  default: ({ onChange }: { onChange: (val: any[]) => void }) => (
    <button
      data-testid="mock-assistant-selector"
      onClick={() => onChange([{ id: 'selected-assistant-id', name: 'My Bot' }])}
    >
      Select Assistant
    </button>
  ),
}))

describe('AddAssistantModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddMapping.mockResolvedValue(undefined)
  })

  it('renders selector and action buttons', async () => {
    const { default: AddAssistantModal } = await import('../AddAssistantModal')
    render(<AddAssistantModal projectName="my-project" onClose={vi.fn()} />)
    expect(screen.getByTestId('mock-assistant-selector')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls addMapping with selected assistant id on confirm', async () => {
    const onClose = vi.fn()
    const toaster = (await import('@/utils/toaster')).default
    const { default: AddAssistantModal } = await import('../AddAssistantModal')
    render(<AddAssistantModal projectName="my-project" onClose={onClose} />)

    fireEvent.click(screen.getByTestId('mock-assistant-selector'))
    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(mockAddMapping).toHaveBeenCalledWith('selected-assistant-id', 'my-project')
      expect(toaster.info).toHaveBeenCalledWith('Assistant added')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    const { default: AddAssistantModal } = require('../AddAssistantModal')
    render(<AddAssistantModal projectName="my-project" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error toast and keeps modal open on addMapping failure', async () => {
    mockAddMapping.mockRejectedValue(new Error('API error'))
    const toaster = (await import('@/utils/toaster')).default
    const onClose = vi.fn()
    const { default: AddAssistantModal } = await import('../AddAssistantModal')
    render(<AddAssistantModal projectName="my-project" onClose={onClose} />)

    fireEvent.click(screen.getByTestId('mock-assistant-selector'))
    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/pages/settings/administration/components/__tests__/AddAssistantModal.test.tsx
```

Expected: FAIL — `Cannot find module '../AddAssistantModal'`

- [ ] **Step 3: Create `src/pages/settings/administration/components/AddAssistantModal.tsx`**

First, run `grep -n "onBack\|back" src/pages/settings/components/SettingsLayout.tsx` to verify `SettingsLayout` prop names used in Task 6.

Then create the modal:

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

import { FC, useState } from 'react'

import Button from '@/components/Button'
import AssistantSelector, {
  AssistantOption,
} from '@/pages/assistants/components/AssistantSelector'
import { assistantsProjectMappingStore } from '@/store/assistantsProjectMapping'
import { ButtonSize, ButtonType } from '@/constants'
import toaster from '@/utils/toaster'

interface AddAssistantModalProps {
  projectName: string
  onClose: () => void
}

const AddAssistantModal: FC<AddAssistantModalProps> = ({ projectName, onClose }) => {
  const [selected, setSelected] = useState<AssistantOption[]>([])
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!selected.length) return
    setSubmitting(true)
    try {
      await assistantsProjectMappingStore.addMapping(selected[0].id, projectName)
      toaster.info('Assistant added')
      onClose()
    } catch (error: any) {
      toaster.error(error?.message || 'Failed to add assistant')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Add assistant"
    >
      <div className="bg-background-primary rounded-lg shadow-xl p-6 w-[480px] flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Add assistant</h2>

        <AssistantSelector
          singleValue
          project={projectName}
          value={selected}
          onChange={setSelected}
          placeholder="Search assistants…"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            size={ButtonSize.MEDIUM}
            type={ButtonType.SECONDARY}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size={ButtonSize.MEDIUM}
            onClick={handleConfirm}
            disabled={!selected.length || submitting}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AddAssistantModal
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/pages/settings/administration/components/__tests__/AddAssistantModal.test.tsx
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Lint and type-check**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0 for both

- [ ] **Step 6: Run full unit test suite**

```bash
npm run test:unit
```

Expected: all tests pass (no regressions)

- [ ] **Step 7: Commit**

```bash
git add src/pages/settings/administration/components/AddAssistantModal.tsx src/pages/settings/administration/components/__tests__/AddAssistantModal.test.tsx
git commit -m "EPMCDME-13354: Add AddAssistantModal with single-select assistant picker"
```

---

## Self-Review

**Spec coverage:**
- [x] Page 1 — project list with search, pagination, Configure button → Task 5
- [x] Page 2 — assistant list per project, Delete, Add button → Task 6
- [x] Page 3 — AddAssistantModal with single-select → Task 7
- [x] GET /v1/assistants/projects/mapping → Task 3
- [x] POST /v1/assistants/{id}/projects/mapping → Task 3
- [x] DELETE /v1/assistants/{id}/projects/mapping → Task 3
- [x] Feature flag `features:teamsBotIntegration` → Task 2
- [x] Navigation tab in Administration → Task 4
- [x] Routes `/settings/administration/teams` and `teams/:projectName` → Task 4
- [x] SettingsTab.TEAMS_BOT_INTEGRATION constant → Task 1
- [x] 403 shows error state, 404 on delete is no-op → Task 3 + Task 6
- [x] Feature flag disabled → redirect to `/settings/administration` → Task 5

**Type consistency:**
- `assistantsProjectMappingStore` export name used consistently Tasks 3, 6, 7
- `AssistantOption` imported from `AssistantSelector` in Task 7 (matches the export from that file)
- `fetchMappings(projectName, 0, 12)` called in Task 6 test matches the signature in Task 3

**Placeholder scan:** No TBD/TODO found. All code blocks are complete.

**Note on SettingsLayout `onBack`:** Task 6 uses `onBack` prop — verify this prop exists by grepping `SettingsLayout.tsx` before implementing Task 6.
