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

import { FC, useEffect, useRef, useState } from 'react'
import { Controller } from 'react-hook-form'

import RefreshSvg from '@/assets/icons/refresh.svg?react'
import Button from '@/components/Button'
import { ButtonSize } from '@/constants'
import IntegrationSelector from '@/pages/assistants/components/AssistantForm/components/Toolkits/IntegrationSelector'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { userSettingsStore } from '@/store/userSettings'
import { Setting } from '@/types/entity/setting'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

interface IntegrationSectionProps {
  hasNoSettings: boolean
  isDropdownShown: boolean
  datasourceType: string
  projectName: string
  control: any
  errors: any
  filteredSettings: any
  showIntegrationPopup: boolean
  onOpenIntegrationPopup: () => void
  onIntegrationSuccess: () => void
  onIntegrationCancel: () => void
  integrationLabel: string
  integrationPlaceholder: string
  credentialType?: string
  isRequired?: boolean
}

const IntegrationSection: FC<IntegrationSectionProps> = ({
  hasNoSettings,
  isDropdownShown,
  datasourceType,
  projectName,
  control,
  errors,
  filteredSettings,
  showIntegrationPopup,
  onOpenIntegrationPopup,
  onIntegrationSuccess,
  onIntegrationCancel,
  integrationLabel,
  integrationPlaceholder,
  credentialType,
  isRequired = true,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      userSettingsStore.resetIsSettingsIndexed()
      await userSettingsStore.indexSettings()
    } catch {
      if (isMountedRef.current) {
        toaster.error('Failed to refresh integrations. Please try again.')
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false)
      }
    }
  }

  return (
    <>
      <div className="mt-3 mb-4">
        <div
          className={cn('items-end', isDropdownShown ? 'grid grid-cols-2 gap-3' : 'flex gap-2')}
        >
          <div>
            <Controller
              name="setting_id"
              control={control}
              render={({ field: settingField }) => {
                const settingsDefinitions = filteredSettings[datasourceType] as Setting[]
                const selectedSetting = settingsDefinitions?.find(
                  (s) => s.id === settingField.value
                )

                return (
                  <IntegrationSelector
                    value={selectedSetting}
                    settingsDefinitions={isDropdownShown ? settingsDefinitions : []}
                    label={integrationLabel}
                    placeholder={integrationPlaceholder}
                    addButtonLabel="Add User Integration"
                    selectClassName="max-w-full w-full"
                    buttonClassName="h-8 ml-0"
                    onChange={(setting) => settingField.onChange(setting?.id)}
                    onAddSettingClick={onOpenIntegrationPopup}
                    disabled={isRequired && hasNoSettings}
                  />
                )
              }}
            />
          </div>
          <Button
            variant="secondary"
            size={ButtonSize.MEDIUM}
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh integrations"
            className="h-8 shrink-0 justify-self-start"
          >
            <RefreshSvg /> Refresh
          </Button>
        </div>
        <div className="text-xs text-text-quaternary mt-1">
          {hasNoSettings
            ? 'Create a user integration, or refresh the list after one is added.'
            : 'Choose an existing integration, or add a new one and refresh the list.'}
        </div>
        {errors.setting_id && (
          <div className="text-text-error text-sm mt-1">{errors.setting_id.message}</div>
        )}
      </div>

      <NewIntegrationPopup
        visible={showIntegrationPopup}
        onHide={onIntegrationCancel}
        onSuccess={onIntegrationSuccess}
        project={projectName}
        credentialType={credentialType || datasourceType || ''}
      />
    </>
  )
}

export default IntegrationSection
