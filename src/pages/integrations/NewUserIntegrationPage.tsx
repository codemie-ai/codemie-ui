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

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import { ButtonType } from '@/constants'
import { INTEGRATIONS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { userSettingsStore } from '@/store/userSettings'
import { navigateBack } from '@/utils/helpers'
import { getTestableCredentialTypes } from '@/utils/settings'
import toaster from '@/utils/toaster'

import SettingsForm, { SettingsFormRef } from './components/SettingsForm/SettingsForm'
import TestIntegration from './components/TestIntegration'
import { getErrorMessage } from './utils/getErrorMessage'

const NewUserIntegrationPage = () => {
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router
  const { query } = route

  const formRef = useRef<SettingsFormRef>(null)
  const [credentialType, setCredentialType] = useState('')
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({})

  const createUserSetting = async (values: Record<string, unknown>) => {
    try {
      await userSettingsStore.createUserSetting(values)
      toaster.info('Integration created successfully')
      onBack()
    } catch (error: any) {
      const errorText = getErrorMessage(error)
      toaster.error(errorText)
    }
  }

  const onBack = () => {
    navigateBack(INTEGRATIONS)
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Integrations" description="Manage your integrations" />
      <PageLayout
        showBack
        limitWidth
        title="New User Integration"
        onBack={onBack}
        rightContent={
          <div className="flex justify-end items-center gap-4 max-w-xl mx-auto">
            <Button type={ButtonType.SECONDARY} onClick={onBack}>
              Cancel
            </Button>
            {credentialType &&
              getTestableCredentialTypes().includes(credentialType.toLowerCase()) && (
                <TestIntegration
                  credentialType={credentialType.toLowerCase()}
                  credentialValues={credentialValues}
                  label="Test"
                />
              )}
            <Button type={ButtonType.PRIMARY} onClick={() => formRef.current?.submit()}>
              <PlusIcon /> Save
            </Button>
          </div>
        }
      >
        <SettingsForm
          ref={formRef}
          onSubmit={createUserSetting}
          credentialType={query.credentialType as string}
          projectName={query.project as string}
          hideActions={true}
          onCredentialValuesChange={setCredentialValues}
          onCredentialTypeChange={(type: string) => setCredentialType(type)}
        />
      </PageLayout>
    </div>
  )
}

export default NewUserIntegrationPage
