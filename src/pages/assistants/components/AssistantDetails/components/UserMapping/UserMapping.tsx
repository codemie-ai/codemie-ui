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

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import DetailsSidebarSection from '@/components/details/DetailsSidebar/components/DetailsSidebarSection'
import { userStore } from '@/store'
import { assistantsStore } from '@/store/assistants'
import { userSettingsStore } from '@/store/userSettings'
import { Assistant } from '@/types/entity/assistant'
import { User } from '@/types/entity/user'
import { getDisplayableToolkits, initializeUserMappingSettings } from '@/utils/assistants'
import toaster from '@/utils/toaster'
import { isUserProjectAdmin } from '@/utils/user'

import { Toolkit } from './components/Toolkit'
import { SubAssistantUserMapping } from './SubAssistantUserMapping'
import { UserMappingSetting, UserMappingSettings, UserSetting } from './types'

interface UserMappingProps {
  assistant: Assistant
  onNewIntegrationRequest: (project: string, settingType: string, onComplete: () => void) => void
  onSectionVisibilityChange: (visible: boolean) => void
}

interface SubAssistantData {
  assistant: Assistant
  displayableToolkits: any[]
  userMappingSettings: UserMappingSettings
  hasMapping: boolean
}

export const UserMapping: React.FC<UserMappingProps> = ({
  assistant,
  onNewIntegrationRequest,
  onSectionVisibilityChange,
}) => {
  const { getAssistantToolkits } = useSnapshot(assistantsStore)
  const { user } = useSnapshot(userStore)
  const [userMappingSettings, setUserMappingSettings] = useState<UserMappingSettings>({})
  const [settingsOptions, setSettingsOptions] = useState<Record<string, UserSetting[]>>({})
  const [toolsDescriptions, setToolsDescriptions] = useState<
    Record<string, Record<string, string | undefined>>
  >({})
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [subAssistantsData, setSubAssistantsData] = useState<SubAssistantData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const displayableToolkits = useMemo(() => getDisplayableToolkits(assistant), [assistant])
  const hasOrchestratorMapping = displayableToolkits.length > 0
  const hasAnySubAssistantMapping = subAssistantsData.some((data) => data.hasMapping)
  const shouldShowSection = hasOrchestratorMapping || hasAnySubAssistantMapping

  const loadIntegrations = useCallback(async () => {
    await userSettingsStore.indexSettings()
    const fetchedSettings = userSettingsStore.getSettings()

    if (isUserProjectAdmin(user as User, assistant.project, true)) {
      setSettingsOptions(fetchedSettings)
      return
    }

    setSettingsOptions(
      Object.fromEntries(
        Object.entries(fetchedSettings).map(([key, settings]) => [
          key,
          (settings as UserSetting[]).filter((s) => s.setting_type !== 'project'),
        ])
      )
    )
  }, [])

  const fetchUserMappingSettings = useCallback(async () => {
    try {
      const userMapping = await assistantsStore.getUserMapping(assistant.id)
      const initialSettings = initializeUserMappingSettings(assistant, userMapping)
      setUserMappingSettings(initialSettings)
    } catch (error) {
      console.error('Error fetching user mapping settings:', error)
      const initialSettings = initializeUserMappingSettings(assistant)
      setUserMappingSettings(initialSettings)
    }
  }, [assistant])

  const fetchToolsDescriptions = async () => {
    try {
      const toolkits = await getAssistantToolkits()

      setToolsDescriptions(
        Object.fromEntries(
          toolkits.map((toolkit) => [
            toolkit.toolkit,
            Object.fromEntries(toolkit.tools.map((tool) => [tool.name, tool.user_description])),
          ])
        )
      )
    } catch (error) {
      console.error('Error fetching assistant toolkits:', error)
    }
  }

  const fetchSubAssistantsData = useCallback(async () => {
    if (!assistant.nested_assistants || assistant.nested_assistants.length === 0) {
      return []
    }

    const subAssistantsDataPromises = assistant.nested_assistants.map(async (subAssistant) => {
      try {
        const displayableToolkits = getDisplayableToolkits(subAssistant)

        if (displayableToolkits.length === 0) {
          return {
            assistant: subAssistant,
            displayableToolkits: [],
            userMappingSettings: {},
            hasMapping: false,
          }
        }

        try {
          const userMapping = await assistantsStore.getUserMapping(subAssistant.id)
          const initialSettings = initializeUserMappingSettings(subAssistant, userMapping)

          const hasDefaultIntegrations =
            Object.keys(initialSettings).length === 0 ||
            Object.values(initialSettings).some(
              (mapping) => !mapping.settingId || mapping.settingId === ''
            )

          return {
            assistant: subAssistant,
            displayableToolkits,
            userMappingSettings: initialSettings,
            hasMapping: hasDefaultIntegrations,
          }
        } catch (error) {
          console.error(`Error fetching mapping for sub-assistant ${subAssistant.id}:`, error)
          const initialSettings = initializeUserMappingSettings(subAssistant)

          const hasDefaultIntegrations =
            Object.keys(initialSettings).length === 0 ||
            Object.values(initialSettings).some(
              (mapping) => !mapping.settingId || mapping.settingId === ''
            )

          return {
            assistant: subAssistant,
            displayableToolkits,
            userMappingSettings: initialSettings,
            hasMapping: hasDefaultIntegrations,
          }
        }
      } catch (error) {
        console.error(`Error processing sub-assistant ${subAssistant.id}:`, error)
        return {
          assistant: subAssistant,
          displayableToolkits: [],
          userMappingSettings: {},
          hasMapping: false,
        }
      }
    })

    return Promise.all(subAssistantsDataPromises)
  }, [assistant.nested_assistants])

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          loadIntegrations(),
          fetchToolsDescriptions(),
          hasOrchestratorMapping && fetchUserMappingSettings(),
          fetchSubAssistantsData().then(setSubAssistantsData),
        ])
      } catch (error) {
        console.error('Error loading UserMapping data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAllData()
  }, [
    assistant.id,
    loadIntegrations,
    fetchUserMappingSettings,
    fetchSubAssistantsData,
    hasOrchestratorMapping,
  ])

  useEffect(() => {
    onSectionVisibilityChange(shouldShowSection)
  }, [shouldShowSection, onSectionVisibilityChange])

  const handleUpdateSetting = (itemKey: string, value: UserSetting | null) => {
    setUserMappingSettings((prev) => {
      if (prev[itemKey]) {
        return {
          ...prev,
          [itemKey]: {
            ...prev[itemKey],
            settingId: value?.id || null,
            setting: value || null,
          },
        }
      }
      return prev
    })
    setIsDirty(true)
  }

  const handleSaveChanges = async () => {
    if (!assistant?.id) {
      toaster.error('Assistant not available')
      return
    }

    setIsSaving(true)

    try {
      await assistantsStore.saveUserMappingSettings(assistant.id, userMappingSettings)
      toaster.info('Your integration settings have been successfully saved for this assistant.')
      await fetchUserMappingSettings()
    } catch (error) {
      console.error('Error saving user mapping settings:', error)
      const errorMessage =
        (error as Error).message || 'An unexpected error occurred while saving your settings.'
      toaster.error(errorMessage)
    } finally {
      setIsSaving(false)
      setIsDirty(false)
    }
  }

  const handleCancelChanges = () => {
    fetchUserMappingSettings()
    setIsDirty(false)
  }

  const getLatestSetting = (
    mapping: UserMappingSetting,
    latestSettingsOptions: typeof settingsOptions
  ) => {
    if (!mapping) return undefined

    const options = latestSettingsOptions[mapping.credentialType]
    if (!options || options.length === 0) return

    // eslint-disable-next-line consistent-return
    return options[options.length - 1]
  }

  const onSettingAddedCallback = (itemKey: string) => async () => {
    await new Promise((res) => {
      setTimeout(res, 1000)
    })
    await loadIntegrations()

    const latestSettingsOptions = userSettingsStore.getSettings()
    const latestSetting = getLatestSetting(userMappingSettings[itemKey], latestSettingsOptions)

    if (latestSetting) {
      handleUpdateSetting(itemKey, latestSetting)
    }
  }

  const handleAddIntegration = ({
    itemKey,
    settingType,
  }: {
    itemKey: string
    settingType: string
  }) => {
    onNewIntegrationRequest(assistant.project ?? '', settingType, onSettingAddedCallback(itemKey))
  }

  if (isLoading) {
    return null
  }

  if (!shouldShowSection) {
    return null
  }

  const hasSubAssistants = subAssistantsData.some((data) => data.hasMapping)
  const showOrchestratorHeader = hasOrchestratorMapping && hasSubAssistants

  return (
    <DetailsSidebarSection headline="Your Integration Settings">
      <div className="flex flex-col gap-6">
        {hasOrchestratorMapping && (
          <div>
            {showOrchestratorHeader && (
              <h4 className="text-base font-semibold text-text-primary mb-4">Orchestrator Settings</h4>
            )}
            <div className="flex flex-col gap-4">
              {displayableToolkits.map((toolkit) => (
                <Toolkit
                  key={toolkit.toolkit}
                  toolkit={toolkit}
                  project={assistant.project ?? ''}
                  userMappingSettings={userMappingSettings}
                  settingsOptions={settingsOptions}
                  toolsDescriptions={toolsDescriptions}
                  onUpdate={handleUpdateSetting}
                  onAdd={handleAddIntegration}
                />
              ))}
            </div>

            {isDirty && (
              <div className="flex justify-end gap-2 self-end mt-4">
                <Button variant="secondary" disabled={isSaving} onClick={handleCancelChanges}>
                  Cancel
                </Button>
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        )}

        {hasSubAssistants && (
          <div className="flex flex-col gap-4">
            <h4 className="text-base font-semibold text-text-primary">Sub-Assistants Settings</h4>
            {subAssistantsData
              .filter((data) => data.hasMapping)
              .map((subData) => (
                <SubAssistantUserMapping
                  key={subData.assistant.id}
                  subAssistant={subData.assistant}
                  displayableToolkits={subData.displayableToolkits}
                  initialUserMappingSettings={subData.userMappingSettings}
                  project={assistant.project ?? ''}
                  onNewIntegrationRequest={onNewIntegrationRequest}
                  toolsDescriptions={toolsDescriptions}
                  settingsOptions={settingsOptions}
                />
              ))}
          </div>
        )}
      </div>
    </DetailsSidebarSection>
  )
}
