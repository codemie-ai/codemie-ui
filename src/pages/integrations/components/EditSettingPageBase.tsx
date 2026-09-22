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
import { useVueRouter } from '@/hooks/useVueRouter'
import { navigateBack } from '@/utils/helpers'
import toaster from '@/utils/toaster'

import EditIntegrationActions from './EditIntegrationActions'
import SettingsForm, { SettingsFormRef } from './SettingsForm/SettingsForm'
import { getErrorMessage } from '../utils/getErrorMessage'

export interface EditableSetting {
  id: string
  project_name: string
  alias: string
  credential_type: string
  credential_key: string
  credential_values: Array<{ key: string; value: string }>
  is_global?: boolean
}

interface Props {
  title: string
  sidebarTitle: string
  sidebarDescription: string
  backRoute: string
  successMessage: string
  settingType?: 'user' | 'project'
  fetchSetting: (
    projectName: string,
    credentialType: string,
    alias: string
  ) => Promise<EditableSetting | null>
  updateSetting: (id: string, values: Record<string, unknown>) => Promise<unknown>
}

const EditSettingPageBase = ({
  title,
  sidebarTitle,
  sidebarDescription,
  backRoute,
  successMessage,
  settingType,
  fetchSetting,
  updateSetting,
}: Props) => {
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router
  const { query } = route

  const [setting, setSetting] = useState<EditableSetting | null>(null)
  const [credentialValues, setCredentialValues] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const formRef = useRef<SettingsFormRef>(null)

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!setting) return

    try {
      const resp = await updateSetting(setting.id, values)

      if (resp && typeof resp === 'object' && 'error' in resp) {
        toaster.error((resp as { error: string }).error)
        return
      }

      toaster.info(successMessage)
      navigateBack(backRoute)
    } catch (error: unknown) {
      toaster.error(getErrorMessage(error))
    }
  }

  const handleBack = () => {
    navigateBack(backRoute)
  }

  useEffect(() => {
    const load = async () => {
      if (!query.project_name || !query.credential_type || !query.alias) {
        toaster.error('Missing required parameters')
        navigateBack(backRoute)
        return
      }
      setLoading(true)
      try {
        const found = await fetchSetting(
          query.project_name as string,
          query.credential_type as string,
          query.alias as string
        )

        if (found) {
          setSetting(found)

          const values = found.credential_values.reduce((acc, value) => {
            return { ...acc, [value.key]: value.value }
          }, {})
          setCredentialValues(values)
        } else {
          toaster.error('Setting not found')
          navigateBack(backRoute)
        }
      } catch {
        toaster.error('Failed to load settings')
        navigateBack(backRoute)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [query.project_name, query.credential_type, query.alias, fetchSetting, backRoute])

  return (
    <div className="flex h-full">
      <Sidebar title={sidebarTitle} description={sidebarDescription} />
      <PageLayout
        showBack
        limitWidth
        title={title}
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
              onSubmit={handleUpdate}
              onCredentialValuesChange={setCredentialValues}
              submitText="Save"
              editing={true}
              projectName={setting.project_name}
              settingId={setting.id}
              settingAlias={setting.alias}
              credentialType={setting.credential_type}
              credentialKey={setting.credential_key}
              credentialValues={credentialValues}
              settingType={settingType}
              isGlobal={setting.is_global}
              hideActions={true}
            />
          </div>
        )}
      </PageLayout>
    </div>
  )
}

export default EditSettingPageBase
