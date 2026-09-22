# EPMCDME-15124: Scheduler Edit Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/schedulers/user/edit` and `/schedulers/project/edit` routes backed by thin wrapper pages that navigate back to `/schedulers` on save/cancel, replacing the current navigation to `/integrations/*/edit`.

**Architecture:** Two new page components under `src/pages/schedulers/` copy the logic of the existing integration edit pages but swap `INTEGRATIONS` for `SCHEDULERS` in all `navigateBack` calls. The new routes are appended to `schedulerRoutes` in `src/router.tsx`. The single navigation callsite in `SchedulersPage.tsx` is updated to use the new paths.

**Tech Stack:** React 18, TypeScript 5, Valtio, react-router 7, `useVueRouter` hook, `navigateBack` utility.

**Spec:** `docs/superpowers/tasks/2026-09-21-epmcdme-15124-scheduler-edit-routes/technical-analysis.md`

## Global Constraints

- All new files must carry the Apache 2.0 licence header (see any existing file in `src/pages/schedulers/`).
- Commit prefix must be `EPMCDME-15124:` on every commit.
- No new npm dependencies.
- Route IDs must be unique across the whole router; use `scheduler-user-edit` and `scheduler-project-edit`.
- Formatting is auto-applied by the pre-commit hook — do not manually run prettier.

---

### Task 1: Create `EditUserSchedulerPage`

Thin copy of `EditUserIntegrationPage` that navigates back to `/schedulers` instead of `/integrations`.

**Files:**
- Create: `src/pages/schedulers/EditUserSchedulerPage.tsx`

**Interfaces:**
- Produces: default export `EditUserSchedulerPage` — a React functional component with no props, reads query params `project_name`, `credential_type`, `alias` from `useVueRouter`.

**Test-first:** no — no existing test harness for integration edit pages; regression is manual.

- [ ] **Step 1: Create the file**

```tsx
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

import { useEffect, useState, useRef } from 'react'

import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { SCHEDULERS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import EditIntegrationActions from '@/pages/integrations/components/EditIntegrationActions'
import SettingsForm, {
  SettingsFormRef,
} from '@/pages/integrations/components/SettingsForm/SettingsForm'
import { getErrorMessage } from '@/pages/integrations/utils/getErrorMessage'
import { userSettingsStore } from '@/store/userSettings'
import { navigateBack } from '@/utils/helpers'
import toaster from '@/utils/toaster'

interface UserSetting {
  id: string
  project_name: string
  alias: string
  credential_type: string
  credential_key: string
  credential_values: Array<{ key: string; value: string }>
  is_global?: boolean
}

const EditUserSchedulerPage = () => {
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router
  const { query } = route

  const [setting, setSetting] = useState<UserSetting | null>(null)
  const [credentialValues, setCredentialValues] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const formRef = useRef<SettingsFormRef>(null)

  const updateSetting = async (values: Record<string, unknown>) => {
    if (!setting) return

    try {
      const resp = await userSettingsStore.updateUserSetting(setting.id, values)

      if ((resp as any).error) {
        toaster.error((resp as any).error)
        return
      }

      toaster.info('Integration updated successfully')
      navigateBack(SCHEDULERS)
    } catch (error: any) {
      const errorText = getErrorMessage(error)
      toaster.error(errorText)
    }
  }

  const handleBack = () => {
    navigateBack(SCHEDULERS)
  }

  useEffect(() => {
    const fetchSetting = async () => {
      setLoading(true)
      try {
        const foundSetting = await userSettingsStore.findUserSetting(
          query.project_name as string,
          query.credential_type as string,
          query.alias as string
        )

        if (foundSetting) {
          setSetting(foundSetting as UserSetting)

          const values = foundSetting.credential_values.reduce((acc, value) => {
            return { ...acc, [value.key]: value.value }
          }, {})
          setCredentialValues(values)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSetting()
  }, [query.project_name, query.credential_type, query.alias])

  return (
    <div className="flex h-full">
      <Sidebar title="Schedulers" description="Manage your schedulers" />
      <PageLayout
        showBack
        limitWidth
        title="Edit Scheduler"
        onBack={handleBack}
        rightContent={
          <div className="flex justify-end items-center gap-4 max-w-xl mx-auto">
            <Button type={ButtonType.SECONDARY} onClick={handleBack}>
              Cancel
            </Button>
            {setting && (
              <EditIntegrationActions
                credentialType={setting.credential_type}
                credentialValues={credentialValues}
                settingId={setting.id}
                onSave={() => formRef.current?.submit()}
                onBeforeTest={() => formRef.current?.validate() ?? Promise.resolve(true)}
              />
            )}
          </div>
        }
      >
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        )}

        {!loading && setting && (
          <div className="page-container-inner">
            <SettingsForm
              ref={formRef}
              onSubmit={updateSetting}
              onCredentialValuesChange={setCredentialValues}
              submitText="Save"
              editing={true}
              projectName={setting.project_name}
              settingId={setting.id}
              settingAlias={setting.alias}
              credentialType={setting.credential_type}
              credentialKey={setting.credential_key}
              credentialValues={credentialValues}
              isGlobal={setting.is_global}
              hideActions={true}
            />
          </div>
        )}
      </PageLayout>
    </div>
  )
}

export default EditUserSchedulerPage
```

- [ ] **Step 2: Verify TypeScript compilation passes**

```bash
npx tsc --noEmit
```

Expected: no errors on the new file.

- [ ] **Step 3: Commit**

```bash
git add src/pages/schedulers/EditUserSchedulerPage.tsx
git commit -m "EPMCDME-15124: Add EditUserSchedulerPage with back-nav to schedulers

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

### Task 2: Create `EditProjectSchedulerPage`

Thin copy of `EditProjectIntegrationPage` that navigates back to `/schedulers` instead of `/integrations`.

**Files:**
- Create: `src/pages/schedulers/EditProjectSchedulerPage.tsx`

**Interfaces:**
- Consumes: `projectSettingsStore.findProjectSetting(project_name, credential_type, alias)`, `projectSettingsStore.updateProjectSetting(id, values)`, `ProjectSetting` type from `@/types/entity/setting`.
- Produces: default export `EditProjectSchedulerPage` — React functional component, no props.

**Test-first:** no — same rationale as Task 1.

- [ ] **Step 1: Create the file**

```tsx
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

import { useEffect, useState, useRef } from 'react'

import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { SCHEDULERS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import EditIntegrationActions from '@/pages/integrations/components/EditIntegrationActions'
import SettingsForm, {
  SettingsFormRef,
} from '@/pages/integrations/components/SettingsForm/SettingsForm'
import { getErrorMessage } from '@/pages/integrations/utils/getErrorMessage'
import { projectSettingsStore } from '@/store/projectSettings'
import { ProjectSetting } from '@/types/entity/setting'
import { navigateBack } from '@/utils/helpers'
import toaster from '@/utils/toaster'

const EditProjectSchedulerPage = () => {
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router
  const { query } = route

  const [setting, setSetting] = useState<ProjectSetting | null>(null)
  const [credentialValues, setCredentialValues] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const formRef = useRef<SettingsFormRef>(null)

  const updateSetting = async (values: Record<string, unknown>) => {
    if (!setting) return

    try {
      const resp = await projectSettingsStore.updateProjectSetting(setting.id, values)

      if ((resp as any).error) {
        toaster.error((resp as any).error)
        return
      }

      toaster.info('Integration updated successfully')
      navigateBack(SCHEDULERS)
    } catch (error: any) {
      const errorText = getErrorMessage(error)
      toaster.error(errorText)
    }
  }

  const handleBack = () => {
    navigateBack(SCHEDULERS)
  }

  useEffect(() => {
    const fetchSetting = async () => {
      setLoading(true)
      try {
        const foundSetting = await projectSettingsStore.findProjectSetting(
          query.project_name as string,
          query.credential_type as string,
          query.alias as string
        )

        if (foundSetting) {
          setSetting(foundSetting)

          const values = foundSetting.credential_values.reduce((acc, value) => {
            return { ...acc, [value.key]: value.value }
          }, {})
          setCredentialValues(values)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSetting()
  }, [query.project_name, query.credential_type, query.alias])

  return (
    <div className="flex h-full">
      <Sidebar title="Schedulers" description="Manage your schedulers" />
      <PageLayout
        showBack
        limitWidth
        title="Edit Project Scheduler"
        onBack={handleBack}
        rightContent={
          <div className="flex justify-end items-center gap-4 max-w-xl mx-auto">
            <Button type={ButtonType.SECONDARY} onClick={handleBack}>
              Cancel
            </Button>
            {setting && (
              <EditIntegrationActions
                credentialType={setting.credential_type}
                credentialValues={credentialValues}
                settingId={setting.id}
                onSave={() => formRef.current?.submit()}
                onBeforeTest={() => formRef.current?.validate() ?? Promise.resolve(true)}
              />
            )}
          </div>
        }
      >
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        )}

        {!loading && setting && (
          <div className="page-container-inner">
            <SettingsForm
              ref={formRef}
              onSubmit={updateSetting}
              onCredentialValuesChange={setCredentialValues}
              submitText="Save"
              editing={true}
              projectName={setting.project_name}
              settingId={setting.id}
              settingAlias={setting.alias}
              credentialType={setting.credential_type}
              credentialKey={setting.credential_key}
              credentialValues={credentialValues}
              settingType="project"
              hideActions={true}
            />
          </div>
        )}
      </PageLayout>
    </div>
  )
}

export default EditProjectSchedulerPage
```

- [ ] **Step 2: Verify TypeScript compilation passes**

```bash
npx tsc --noEmit
```

Expected: no errors on the new file.

- [ ] **Step 3: Commit**

```bash
git add src/pages/schedulers/EditProjectSchedulerPage.tsx
git commit -m "EPMCDME-15124: Add EditProjectSchedulerPage with back-nav to schedulers

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

### Task 3: Add scheduler edit routes to `router.tsx` and update `SchedulersPage.tsx`

Wire up the new pages as routes and fix the navigation callsite.

**Files:**
- Modify: `src/router.tsx` (around line 306 — `schedulerRoutes` array; around line 51 — imports)
- Modify: `src/pages/schedulers/SchedulersPage.tsx` (lines 209–212 — the `router.push` paths)

**Interfaces:**
- Consumes: `EditUserSchedulerPage` from Task 1, `EditProjectSchedulerPage` from Task 2.

**Test-first:** no — no existing test coverage for routing or SchedulersPage navigation.

- [ ] **Step 1: Add imports to `router.tsx`**

After the existing scheduler page imports (search for `NewUserSchedulerPage`), add:

```tsx
import EditProjectSchedulerPage from '@/pages/schedulers/EditProjectSchedulerPage'
import EditUserSchedulerPage from '@/pages/schedulers/EditUserSchedulerPage'
```

- [ ] **Step 2: Add routes to `schedulerRoutes` in `router.tsx`**

After the `scheduler-user-new` route object (around line 320), add two new objects:

```tsx
  {
    id: 'scheduler-user-edit',
    path: '/schedulers/user/edit',
    Component: EditUserSchedulerPage,
  },
  {
    id: 'scheduler-project-edit',
    path: '/schedulers/project/edit',
    Component: EditProjectSchedulerPage,
  },
```

The full `schedulerRoutes` array should then look like:

```tsx
const schedulerRoutes: RouteObject[] = [
  {
    id: 'schedulers',
    path: 'schedulers',
    Component: SchedulersPage,
  },
  {
    id: 'scheduler-project-new',
    path: 'schedulers/project/new',
    Component: NewProjectSchedulerPage,
  },
  {
    id: 'scheduler-user-new',
    path: 'schedulers/user/new',
    Component: NewUserSchedulerPage,
  },
  {
    id: 'scheduler-user-edit',
    path: '/schedulers/user/edit',
    Component: EditUserSchedulerPage,
  },
  {
    id: 'scheduler-project-edit',
    path: '/schedulers/project/edit',
    Component: EditProjectSchedulerPage,
  },
  {
    id: 'scheduler-runs',
    path: 'schedulers/:schedulerId/runs',
    Component: SchedulerRunHistoryPage,
  },
  {
    id: 'scheduler-run-details',
    path: 'schedulers/:schedulerId/runs/:runId',
    Component: SchedulerRunDetailsPage,
  },
]
```

- [ ] **Step 3: Update navigation callsite in `SchedulersPage.tsx`**

Find the `router.push` call in `renderActions` (around line 208–218). Change:

```tsx
router.push({
  path:
    schedulerType === IntegrationOption.PROJECT
      ? '/integrations/project/edit'
      : '/integrations/user/edit',
  query: {
    project_name: item.project.name,
    credential_type: 'Scheduler',
    alias: item.name,
  },
})
```

To:

```tsx
router.push({
  path:
    schedulerType === IntegrationOption.PROJECT
      ? '/schedulers/project/edit'
      : '/schedulers/user/edit',
  query: {
    project_name: item.project.name,
    credential_type: 'Scheduler',
    alias: item.name,
  },
})
```

- [ ] **Step 4: Verify TypeScript compilation passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/router.tsx src/pages/schedulers/SchedulersPage.tsx
git commit -m "EPMCDME-15124: Add /schedulers/*/edit routes and update navigation callsite

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```
