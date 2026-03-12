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
import { INTEGRATIONS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { userSettingsStore } from '@/store/userSettings'
import { navigateBack } from '@/utils/helpers'
import { getTestableCredentialTypes } from '@/utils/settings'
import toaster from '@/utils/toaster'

import SettingsForm, { SettingsFormRef } from './components/SettingsForm/SettingsForm'
import TestIntegration from './components/TestIntegration'
import { getErrorMessage } from './utils/getErrorMessage'

interface UserSetting {
  id: string
  project_name: string
  alias: string
  credential_type: string
  credential_key: string
  credential_values: Array<{ key: string; value: string }>
  is_global?: boolean
}

const EditUserIntegrationPage = () => {
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router
  const { query } = route

  const [setting, setSetting] = useState<UserSetting | null>(null)
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({})
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
      navigateBack(INTEGRATIONS)
    } catch (error: any) {
      const errorText = getErrorMessage(error)
      toaster.error(errorText)
    }
  }

  const handleBack = () => {
    navigateBack(INTEGRATIONS)
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
      <Sidebar title="Integrations" description="Manage your integrations" />
      <PageLayout
        showBack
        limitWidth
        title="Edit Integration"
        onBack={handleBack}
        rightContent={
          <div className="flex justify-end items-center gap-4 max-w-xl mx-auto">
            <Button type={ButtonType.SECONDARY} onClick={handleBack}>
              Cancel
            </Button>
            {setting &&
              getTestableCredentialTypes().includes(setting.credential_type.toLowerCase()) && (
                <TestIntegration
                  credentialType={setting.credential_type.toLowerCase()}
                  credentialValues={credentialValues}
                  settingId={setting.id}
                  label="Test"
                />
              )}
            <Button type={ButtonType.PRIMARY} onClick={() => formRef.current?.submit()}>
              Save
            </Button>
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

export default EditUserIntegrationPage
