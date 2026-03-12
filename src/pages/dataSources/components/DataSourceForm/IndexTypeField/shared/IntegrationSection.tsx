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
import { Controller } from 'react-hook-form'

import InfoSvg from '@/assets/icons/info.svg?react'
import Button from '@/components/Button'
import { ButtonSize } from '@/constants'
import { useTheme } from '@/hooks/useTheme'
import IntegrationSelector from '@/pages/assistants/components/AssistantForm/components/Toolkits/IntegrationSelector'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { Setting } from '@/types/entity/setting'

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
}) => {
  const { isDark } = useTheme()

  return (
    <>
      {hasNoSettings && (
        <div className="mt-3 mb-4">
          <div className="flex text-text-quaternary text-xs">
            <InfoSvg className="w-[18px] h-[18px] mr-2 flex-shrink-0 opacity-75" />
            <span className="mt-0.5">
              No integrations found for this datasource type. Add a user integration to continue.
            </span>
          </div>
          <div className="flex pt-3">
            <Button
              type={isDark ? 'primary' : 'secondary'}
              size={ButtonSize.SMALL}
              onClick={onOpenIntegrationPopup}
              className="py-4 px-10"
            >
              Add User Integration
            </Button>
          </div>
          {errors.setting_id && (
            <div className="text-text-error text-sm mt-1">{errors.setting_id.message}</div>
          )}
        </div>
      )}

      {isDropdownShown && (
        <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
          <Controller
            name="setting_id"
            control={control}
            render={({ field: settingField }) => {
              const settingsDefinitions = filteredSettings[datasourceType] as Setting[]
              const selectedSetting = settingsDefinitions?.find((s) => s.id === settingField.value)

              return (
                <div>
                  <IntegrationSelector
                    value={selectedSetting}
                    settingsDefinitions={settingsDefinitions}
                    label={integrationLabel}
                    placeholder={integrationPlaceholder}
                    addButtonLabel="Add User Integration"
                    selectClassName="max-w-full w-full"
                    onChange={(setting) => settingField.onChange(setting?.id)}
                    onAddSettingClick={onOpenIntegrationPopup}
                  />
                  {errors.setting_id && (
                    <div className="text-text-error text-sm mt-1">{errors.setting_id.message}</div>
                  )}
                </div>
              )
            }}
          />
        </div>
      )}

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
