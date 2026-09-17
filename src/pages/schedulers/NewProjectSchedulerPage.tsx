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
import { projectSettingsStore } from '@/store/projectSettings'
import { navigateBack } from '@/utils/helpers'
import toaster from '@/utils/toaster'

import SettingsForm, { SettingsFormRef } from '../integrations/components/SettingsForm/SettingsForm'
import { getErrorMessage } from '../integrations/utils/getErrorMessage'

const NewProjectSchedulerPage = () => {
  const router = useVueRouter()
  const formRef = useRef<SettingsFormRef>(null)

  const createProjectScheduler = async (values: Record<string, unknown>) => {
    try {
      await projectSettingsStore.createProjectSetting(values)
      toaster.info('Scheduler created successfully')
      router.push({ name: 'schedulers' })
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
          onCredentialValuesChange={() => {}}
          onCredentialTypeChange={() => {}}
        />
      </PageLayout>
    </div>
  )
}

export default NewProjectSchedulerPage
