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

import React, { useState, useMemo, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { ToolkitType } from '@/constants/assistants'
import { AvatarType } from '@/constants/avatar'
import IntegrationSelector from '@/pages/assistants/components/AssistantForm/components/Toolkits/IntegrationSelector'
import ToolkitsViewList from '@/pages/assistants/components/ToolkitsViewList'
import { settingsStore } from '@/store/settings'
import { MissingIntegrationByCredentialType } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'
import { flattenMissingIntegrations } from '@/utils/assistantValidation'
import { getCredentialType } from '@/utils/settings'
import { cn } from '@/utils/utils'

export interface MissingIntegrationsState {
  isModalVisible: boolean
  missingByCredentialType: MissingIntegrationByCredentialType[]
  subAssistantsMissing: MissingIntegrationByCredentialType[]
  validationMessage: string
  pendingAssistantValues: any
}

export interface MissingIntegrationsModalProps {
  state: MissingIntegrationsState
  project?: string
  onCancel: () => void
  onSaveWithValidation: (selectedIntegrations: Record<string, Setting | undefined>) => void
  onSkipValidation: () => void
  onConfigureIntegration?: (project: string, credentialType: string) => void
  isSubmitting?: boolean
}

const MissingIntegrationsModal: React.FC<MissingIntegrationsModalProps> = ({
  state,
  project = '',
  onCancel,
  onSaveWithValidation,
  onSkipValidation,
  onConfigureIntegration,
  isSubmitting = false,
}) => {
  const { isModalVisible, missingByCredentialType, subAssistantsMissing, validationMessage } = state
  const { settings } = useSnapshot(settingsStore)
  const [selectedIntegrations, setSelectedIntegrations] = useState<
    Record<string, Setting | undefined>
  >({})

  // Flatten the new format into a list of missing integrations
  const missingIntegrations = useMemo(
    () => flattenMissingIntegrations(missingByCredentialType, subAssistantsMissing),
    [missingByCredentialType, subAssistantsMissing]
  )

  const filteredSettings = React.useMemo(() => {
    return Object.fromEntries(
      Object.entries(settings).map(([key, options]) => {
        const filteredOptions = (options as Setting[]).filter(
          (setting) => setting.project_name === project || setting.is_global
        )
        return [key, filteredOptions]
      })
    )
  }, [settings, project])

  const handleConfigureClick = (originalCredentialType: string) => {
    if (onConfigureIntegration) {
      onConfigureIntegration(project, originalCredentialType)
    }
  }

  const handleIntegrationChange = (credentialType: string, setting?: Setting) => {
    setSelectedIntegrations((prev) => ({
      ...prev,
      [credentialType]: setting,
    }))
  }

  const handleValidateAndSave = useCallback(() => {
    onSaveWithValidation(selectedIntegrations)
  }, [onSaveWithValidation, selectedIntegrations])

  const footerContent = (
    <div className="flex justify-end gap-4">
      <Button variant={ButtonType.SECONDARY} onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button variant={ButtonType.SECONDARY} onClick={onSkipValidation} disabled={isSubmitting}>
        Skip Validation & Save
      </Button>
      <Button variant={ButtonType.PRIMARY} onClick={handleValidateAndSave} disabled={isSubmitting}>
        Validate & Save
      </Button>
    </div>
  )

  return (
    <Popup
      className="w-[650px]"
      overlayClassName="z-60"
      hideClose
      header="Missing Integrations"
      visible={isModalVisible}
      onHide={onCancel}
      withBorder
      footerContent={footerContent}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <p className="text-sm text-text-secondary">
            {validationMessage || 'The following integrations are required but not configured:'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {missingIntegrations.map((integration) => {
            const credentialType = getCredentialType(integration.credential_type)
            const settingsOptions = filteredSettings[credentialType] ?? []

            // Create unique key from credential type and optional sub-assistant info
            const uniqueKey = integration.sub_assistant_id
              ? `${credentialType}-${integration.sub_assistant_id}`
              : credentialType

            return (
              <div
                key={uniqueKey}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border border-border-structural bg-surface-base-secondary p-3'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-tertiary font-semibold">
                        Integration Type:
                      </span>
                      <span className="w-fit rounded-lg rounded-br-sm px-2 py-1 text-xs bg-gradient1">
                        {integration.label}
                      </span>
                    </div>

                    {integration.sub_assistant_name && (
                      <div className="flex items-center gap-2">
                        <Avatar
                          iconUrl={integration.sub_assistant_icon_url}
                          name={integration.sub_assistant_name}
                          type={AvatarType.XS}
                          className="flex-shrink-0"
                        />
                        <span className="text-xs text-text-tertiary">
                          Sub-assistant: {integration.sub_assistant_name}
                        </span>
                      </div>
                    )}

                    <ToolkitsViewList
                      toolkits={integration.toolkits.map((toolkit) => ({
                        toolkit: toolkit as ToolkitType,
                        label: toolkit,
                        tools: integration.tools
                          .filter((tool) => tool.toolkit === toolkit)
                          .map((tool) => ({
                            name: tool.tool,
                            label: tool.label,
                            settings_config: false,
                            tool,
                          })),
                        settings_config: false,
                        is_external: false,
                      }))}
                      className="flex flex-col gap-3 mt-2"
                    />
                  </div>
                </div>

                {onConfigureIntegration && (
                  <IntegrationSelector
                    value={selectedIntegrations[credentialType]}
                    settingsDefinitions={settingsOptions}
                    addButtonLabel="Add Integration"
                    placeholder="Default integration"
                    className="!w-auto"
                    onChange={(setting) => handleIntegrationChange(credentialType, setting)}
                    onAddSettingClick={() => handleConfigureClick(integration.credential_type)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Popup>
  )
}

export default MissingIntegrationsModal
