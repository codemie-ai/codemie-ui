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
import { isFoldedOAuth } from '@/constants/integration'
import { INTEGRATIONS, PROJECTS_MANAGEMENT_INTEGRATIONS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { projectSettingsStore } from '@/store/projectSettings'
import { navigateBack } from '@/utils/helpers'
import { getTestableCredentialTypes } from '@/utils/settings'
import toaster from '@/utils/toaster'

import OAuthTestAction from './components/OAuthTestAction'
import SettingsForm, { SettingsFormRef } from './components/SettingsForm/SettingsForm'
import TestIntegration from './components/TestIntegration'
import { getErrorMessage } from './utils/getErrorMessage'

const NewProjectIntegrationPage = () => {
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router
  const projectName = route.query.project_name as string | undefined

  const formRef = useRef<SettingsFormRef>(null)
  const [credentialType, setCredentialType] = useState('')
  const [credentialValues, setCredentialValues] = useState<Record<string, unknown>>({})

  const createProjectSetting = async (values: Record<string, unknown>) => {
    try {
      await projectSettingsStore.createProjectSetting(values)
      toaster.info('Integration created successfully')
      router.push(
        projectName
          ? { name: PROJECTS_MANAGEMENT_INTEGRATIONS, params: { projectName } }
          : { name: 'integrations' }
      )

      // Refresh the integrations list
      setTimeout(() => {
        projectSettingsStore.fetchProjectSettings(
          0,
          100,
          projectName ? { project: [projectName] } : undefined
        )
      }, 1000)
    } catch (error: any) {
      const errorText = getErrorMessage(error)
      toaster.error(errorText)
    }
  }

  const onBack = () => {
    if (projectName) {
      router.push({ name: PROJECTS_MANAGEMENT_INTEGRATIONS, params: { projectName } })
      return
    }
    navigateBack(INTEGRATIONS)
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Integrations" description="Manage your integrations" />
      <PageLayout
        showBack
        limitWidth
        title="New Project Integration"
        onBack={onBack}
        rightContent={
          <div className="flex justify-end items-center gap-4 max-w-xl mx-auto">
            <Button type={ButtonType.SECONDARY} onClick={onBack}>
              Cancel
            </Button>
            {/* EPMCDME-14587: a folded OAuth integration is tested via OAuthTestAction, not the generic
                PAT-style TestIntegration — hide the PAT test when the OAuth marker is present. */}
            {credentialType &&
              !isFoldedOAuth(credentialValues) &&
              getTestableCredentialTypes().includes(credentialType.toLowerCase()) && (
                <TestIntegration
                  credentialType={credentialType.toLowerCase()}
                  credentialValues={credentialValues}
                  label="Test"
                  onBeforeTest={() => formRef.current!.validate()}
                />
              )}
            <OAuthTestAction
              credentialType={credentialType.toLowerCase()}
              credentialValues={credentialValues}
            />
            <Button type={ButtonType.PRIMARY} onClick={() => formRef.current?.submit()}>
              Save
            </Button>
          </div>
        }
      >
        <SettingsForm
          ref={formRef}
          onSubmit={createProjectSetting}
          projectName={projectName}
          settingType="project"
          disableProject={!!projectName}
          hideActions={true}
          onCredentialValuesChange={setCredentialValues}
          onCredentialTypeChange={(type: string) => setCredentialType(type)}
        />
      </PageLayout>
    </div>
  )
}

export default NewProjectIntegrationPage
