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
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import { ButtonType } from '@/constants'
import { isFoldedOAuth } from '@/constants/integration'
import { INTEGRATIONS, PROJECTS_MANAGEMENT_INTEGRATIONS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { integrationsStore } from '@/store/integrations'
import { userStore } from '@/store/user'
import { navigateBack } from '@/utils/helpers'
import {
  IntegrationScope,
  parseMemberFormScope,
  parseProjectCapableFormScope,
} from '@/utils/integrationScope'
import { getTestableCredentialTypes } from '@/utils/settings'
import toaster from '@/utils/toaster'
import { canUseProjectScope } from '@/utils/user'

import OAuthTestAction from './components/OAuthTestAction'
import SettingsForm, { SettingsFormRef } from './components/SettingsForm/SettingsForm'
import TestIntegration from './components/TestIntegration'
import { getErrorMessage } from './utils/getErrorMessage'

const NEW_PROJECT_ROUTE_ID = 'new-project-integration'

const NewIntegrationPage = () => {
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router
  const { query } = route
  const { user } = useSnapshot(userStore)

  const formRef = useRef<SettingsFormRef>(null)
  const [credentialType, setCredentialType] = useState('')
  const [credentialValues, setCredentialValues] = useState<Record<string, unknown>>({})

  const routeDefault = route.name === NEW_PROJECT_ROUTE_ID ? IntegrationScope.PROJECT : undefined
  const scope = canUseProjectScope(user)
    ? parseProjectCapableFormScope(query.scope ?? routeDefault)
    : parseMemberFormScope()
  const lockedProject =
    scope === IntegrationScope.PROJECT ? (query.project_name as string | undefined) : undefined

  const goBack = () => {
    if (lockedProject) {
      router.push({
        name: PROJECTS_MANAGEMENT_INTEGRATIONS,
        params: { projectName: lockedProject },
      })
      return
    }
    navigateBack(INTEGRATIONS)
  }

  const createSetting = async (values: Record<string, unknown>, formScope: IntegrationScope) => {
    try {
      await integrationsStore.createSetting(formScope, values)
      if (lockedProject) {
        // The admin project page has no saved-row toast of its own, so confirm the save here.
        toaster.info('Integration created successfully')
      } else {
        // The Integrations list confirms the save with its own toast and highlights the row.
        integrationsStore.setSavedRow({
          scope: formScope,
          project_name: (values.project_name as string) ?? '',
          credential_type: values.credential_type as string,
          alias: values.alias as string,
        })
      }
      goBack()
    } catch (error: any) {
      toaster.error(getErrorMessage(error))
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Integrations" description="Manage your integrations" />
      <PageLayout
        showBack
        limitWidth
        title="New Integration"
        onBack={goBack}
        rightContent={
          <div
            data-onboarding="integration-save-actions"
            className="flex justify-end items-center gap-4 max-w-xl mx-auto"
          >
            <Button type={ButtonType.SECONDARY} onClick={goBack}>
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
        {/* The initial scope depends on the profile, so wait for it before mounting the form. */}
        {user && (
          <SettingsForm
            ref={formRef}
            onSubmit={createSetting}
            showScope
            scope={scope}
            scopeLocked={!!lockedProject}
            disableProject={!!lockedProject}
            settingType={scope}
            credentialType={query.credentialType as string}
            projectName={lockedProject ?? (query.project as string)}
            hideActions={true}
            onCredentialValuesChange={setCredentialValues}
            onCredentialTypeChange={(type: string) => setCredentialType(type)}
          />
        )}
      </PageLayout>
    </div>
  )
}

export default NewIntegrationPage
