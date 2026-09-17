# EPMCDME-15019: Scheduler Creation View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dedicated scheduler creation pages (`/schedulers/project/new`, `/schedulers/user/new`) that reuse the integration creation UI with the Credential Type field hidden and preset to "scheduler".

**Architecture:** Two new page components in `src/pages/schedulers/` are near-copies of the integration creation pages, importing the shared `SettingsForm` component with a new `hideType` prop that visually hides the Credential Type Autocomplete field. The existing `projectSettingsStore.createProjectSetting` / `userSettingsStore.createUserSetting` methods handle creation unchanged. Two new entries are added to `schedulerRoutes` in `src/router.tsx`.

**Tech Stack:** React 18, TypeScript 5, Valtio stores, react-router 7, shared `SettingsForm` component from `src/pages/integrations/components/SettingsForm/`.

**Spec:** EPMCDME-15019 — scheduler creation view ticket (see task description in `technical-analysis.md`)

## Global Constraints

- Apache 2.0 license header on every new source file
- Branch: `EPMCDME-10682_additional-fixed-after-initial-implementation`
- Every commit message must include the ticket key `EPMCDME-15019`
- Do not add `useDeprecationRedirect` to scheduler pages — that hook is integration-specific
- Do not add `OAuthTestAction` or `TestIntegration` to scheduler pages — scheduler credential type is never in `getTestableCredentialTypes()`, so they would be dead UI
- Post-save navigation must go to `SCHEDULERS` route, not `INTEGRATIONS`
- Post-save must call `schedulersStore.fetchSchedulers()` (not `projectSettingsStore.fetchProjectSettings()`)
- Formatting is automatic via the PostToolUse hook — do not run prettier or eslint manually

---

### Task 1: Add `hideType` prop to `SettingsForm`

**Files:**
- Modify: `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` (props interface ~line 80 and render ~line 636)

**Interfaces:**
- Produces: `SettingsFormProps.hideType?: boolean` — when `true`, the Credential Type `<div data-onboarding="integration-credential-type-field">` block is not rendered

- [ ] **Step 1: Add `hideType` to the props interface**

  In `SettingsForm.tsx` at the `SettingsFormProps` interface (around line 91, after `hideActions?: boolean`), add:

  ```typescript
  hideType?: boolean
  ```

- [ ] **Step 2: Destructure `hideType` in the component body**

  In the destructuring block (around line 120, after `hideActions = false`), add:

  ```typescript
  hideType = false,
  ```

- [ ] **Step 3: Conditionally render the Credential Type field**

  Wrap the `<div data-onboarding="integration-credential-type-field">` block (around line 636) in a conditional:

  ```tsx
  {!hideType && (
    <div data-onboarding="integration-credential-type-field">
      <Autocomplete
        id="credentialType"
        value={credentialType}
        name="credentialType"
        placeholder="Credential Type"
        label="Credential Type"
        allowEmpty={false}
        options={credentialTypeOptions}
        disabled={editing || disableType}
        onChange={handleCredentialTypeChange}
      />
    </div>
  )}
  ```

- [ ] **Step 4: Verify existing integration pages are unaffected**

  `hideType` defaults to `false`, so all existing callers that don't pass it are unaffected. No other changes needed.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/integrations/components/SettingsForm/SettingsForm.tsx
  git commit -m "EPMCDME-15019: Add hideType prop to SettingsForm to support visually hiding credential type field

  Generated with AI

  Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
  ```

---

### Task 2: Create `NewProjectSchedulerPage`

**Files:**
- Create: `src/pages/schedulers/NewProjectSchedulerPage.tsx`

**Interfaces:**
- Consumes: `SettingsFormProps.hideType` from Task 1
- Consumes: `SCHEDULERS` from `src/constants/routes.ts`
- Consumes: `projectSettingsStore.createProjectSetting()` from `src/store/projectSettings`
- Consumes: `schedulersStore.fetchSchedulers()` from `src/store/schedulers`

- [ ] **Step 1: Create the file**

  Create `src/pages/schedulers/NewProjectSchedulerPage.tsx` with:

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

  import { useState, useRef } from 'react'

  import Button from '@/components/Button'
  import PageLayout from '@/components/Layouts/Layout'
  import Sidebar from '@/components/Sidebar'
  import { ButtonType } from '@/constants'
  import { SCHEDULERS } from '@/constants/routes'
  import { useVueRouter } from '@/hooks/useVueRouter'
  import { projectSettingsStore } from '@/store/projectSettings'
  import { schedulersStore } from '@/store/schedulers'
  import { navigateBack } from '@/utils/helpers'
  import toaster from '@/utils/toaster'

  import SettingsForm, { SettingsFormRef } from '../integrations/components/SettingsForm/SettingsForm'
  import { getErrorMessage } from '../integrations/utils/getErrorMessage'

  const NewProjectSchedulerPage = () => {
    const router = useVueRouter()
    const formRef = useRef<SettingsFormRef>(null)
    const [credentialValues, setCredentialValues] = useState<Record<string, unknown>>({})

    const createProjectScheduler = async (values: Record<string, unknown>) => {
      try {
        await projectSettingsStore.createProjectSetting(values)
        toaster.info('Scheduler created successfully')
        router.push({ name: 'schedulers' })

        setTimeout(() => {
          schedulersStore.fetchSchedulers()
        }, 1000)
      } catch (error: any) {
        const errorText = getErrorMessage(error)
        toaster.error(errorText)
      }
    }

    const onBack = () => {
      navigateBack(SCHEDULERS)
    }

    return (
      <div className="flex h-full">
        <Sidebar title="Schedulers" description="Manage your schedulers" />
        <PageLayout
          showBack
          limitWidth
          title="New Project Scheduler"
          onBack={onBack}
          rightContent={
            <div className="flex justify-end items-center gap-4 max-w-xl mx-auto">
              <Button type={ButtonType.SECONDARY} onClick={onBack}>
                Cancel
              </Button>
              <Button type={ButtonType.PRIMARY} onClick={() => formRef.current?.submit()}>
                Save
              </Button>
            </div>
          }
        >
          <SettingsForm
            ref={formRef}
            onSubmit={createProjectScheduler}
            settingType="project"
            credentialType="scheduler"
            hideType={true}
            hideActions={true}
            onCredentialValuesChange={setCredentialValues}
            onCredentialTypeChange={() => {}}
          />
        </PageLayout>
      </div>
    )
  }

  export default NewProjectSchedulerPage
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/pages/schedulers/NewProjectSchedulerPage.tsx
  git commit -m "EPMCDME-15019: Add NewProjectSchedulerPage

  Generated with AI

  Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
  ```

---

### Task 3: Create `NewUserSchedulerPage`

**Files:**
- Create: `src/pages/schedulers/NewUserSchedulerPage.tsx`

**Interfaces:**
- Consumes: `SettingsFormProps.hideType` from Task 1
- Consumes: `SCHEDULERS` from `src/constants/routes.ts`
- Consumes: `userSettingsStore.createUserSetting()` from `src/store/userSettings`
- Consumes: `schedulersStore.fetchSchedulers()` from `src/store/schedulers`

- [ ] **Step 1: Create the file**

  Create `src/pages/schedulers/NewUserSchedulerPage.tsx` with:

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

  import { useRef } from 'react'

  import Button from '@/components/Button'
  import PageLayout from '@/components/Layouts/Layout'
  import Sidebar from '@/components/Sidebar'
  import { ButtonType } from '@/constants'
  import { SCHEDULERS } from '@/constants/routes'
  import { useVueRouter } from '@/hooks/useVueRouter'
  import { schedulersStore } from '@/store/schedulers'
  import { userSettingsStore } from '@/store/userSettings'
  import { navigateBack } from '@/utils/helpers'
  import toaster from '@/utils/toaster'

  import SettingsForm, { SettingsFormRef } from '../integrations/components/SettingsForm/SettingsForm'
  import { getErrorMessage } from '../integrations/utils/getErrorMessage'

  const NewUserSchedulerPage = () => {
    const formRef = useRef<SettingsFormRef>(null)

    const createUserScheduler = async (values: Record<string, unknown>) => {
      try {
        await userSettingsStore.createUserSetting(values)
        toaster.info('Scheduler created successfully')
        navigateBack(SCHEDULERS)
        setTimeout(() => {
          schedulersStore.fetchSchedulers()
        }, 1000)
      } catch (error: any) {
        const errorText = getErrorMessage(error)
        toaster.error(errorText)
      }
    }

    const onBack = () => {
      navigateBack(SCHEDULERS)
    }

    return (
      <div className="flex h-full">
        <Sidebar title="Schedulers" description="Manage your schedulers" />
        <PageLayout
          showBack
          limitWidth
          title="New User Scheduler"
          onBack={onBack}
          rightContent={
            <div className="flex justify-end items-center gap-4 max-w-xl mx-auto">
              <Button type={ButtonType.SECONDARY} onClick={onBack}>
                Cancel
              </Button>
              <Button type={ButtonType.PRIMARY} onClick={() => formRef.current?.submit()}>
                Save
              </Button>
            </div>
          }
        >
          <SettingsForm
            ref={formRef}
            onSubmit={createUserScheduler}
            credentialType="scheduler"
            hideType={true}
            hideActions={true}
            onCredentialValuesChange={() => {}}
            onCredentialTypeChange={() => {}}
          />
        </PageLayout>
      </div>
    )
  }

  export default NewUserSchedulerPage
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/pages/schedulers/NewUserSchedulerPage.tsx
  git commit -m "EPMCDME-15019: Add NewUserSchedulerPage

  Generated with AI

  Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
  ```

---

### Task 4: Register routes in `src/router.tsx`

**Files:**
- Modify: `src/router.tsx` (around line 305 — the `schedulerRoutes` array)

**Interfaces:**
- Consumes: `NewProjectSchedulerPage` from Task 2
- Consumes: `NewUserSchedulerPage` from Task 3

- [ ] **Step 1: Add imports**

  After the existing scheduler page imports (around line 64), add:

  ```typescript
  import NewProjectSchedulerPage from '@/pages/schedulers/NewProjectSchedulerPage'
  import NewUserSchedulerPage from '@/pages/schedulers/NewUserSchedulerPage'
  ```

- [ ] **Step 2: Add routes to `schedulerRoutes`**

  In the `schedulerRoutes` array (after line 309, the `schedulers` route entry), add:

  ```typescript
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
  ```

- [ ] **Step 3: Verify type-check passes**

  ```bash
  npm run ts-check
  ```

  Expected: no new errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/router.tsx
  git commit -m "EPMCDME-15019: Register scheduler creation routes in router

  Generated with AI

  Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
  ```

---

### Task 5: Wire up navigation from `SchedulersPage`

**Files:**
- Modify: `src/pages/schedulers/SchedulersPage.tsx`

**Context:** The existing SchedulersPage has a user/project type switch (EPMCDME-15020). Check if it already has a "New Scheduler" / "Create" button. If yes, update its `onClick` to navigate to the correct creation route. If no, add one.

- [ ] **Step 1: Read `SchedulersPage.tsx`**

  Read `src/pages/schedulers/SchedulersPage.tsx` to understand the current button/action structure before editing.

- [ ] **Step 2: Add or update the "New Scheduler" button**

  The button should navigate to `/schedulers/project/new` when `schedulerType === IntegrationOption.PROJECT` and `/schedulers/user/new` when `schedulerType === IntegrationOption.USER`.

  Example navigation call (use the hook already imported in the file):

  ```tsx
  const handleNewScheduler = () => {
    const path =
      schedulerType === IntegrationOption.PROJECT
        ? 'schedulers/project/new'
        : 'schedulers/user/new'
    router.push({ path: `/${path}` })
  }
  ```

  Wire this to the "New Scheduler" / "Create" button's `onClick`.

- [ ] **Step 3: Commit**

  ```bash
  git add src/pages/schedulers/SchedulersPage.tsx
  git commit -m "EPMCDME-15019: Wire New Scheduler button to creation routes

  Generated with AI

  Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
  ```
