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

import React, { useState, useCallback } from 'react'

import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import { AvatarType } from '@/constants/avatar'
import { assistantsStore } from '@/store/assistants'
import { userSettingsStore } from '@/store/userSettings'
import { Assistant } from '@/types/entity/assistant'
import { initializeUserMappingSettings } from '@/utils/assistants'
import toaster from '@/utils/toaster'

import { Toolkit } from './components/Toolkit'
import { UserMappingSettings, UserSetting } from './types'

interface SubAssistantUserMappingProps {
  subAssistant: Assistant
  displayableToolkits: any[]
  initialUserMappingSettings: UserMappingSettings
  project: string
  onNewIntegrationRequest: (project: string, settingType: string, onComplete: () => void) => void
  toolsDescriptions: Record<string, Record<string, string | undefined>>
  settingsOptions: Record<string, UserSetting[]>
}

export const SubAssistantUserMapping: React.FC<SubAssistantUserMappingProps> = ({
  subAssistant,
  displayableToolkits,
  initialUserMappingSettings,
  project,
  onNewIntegrationRequest,
  toolsDescriptions,
  settingsOptions,
}) => {
  const [userMappingSettings, setUserMappingSettings] = useState<UserMappingSettings>(
    initialUserMappingSettings
  )
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchUserMappingSettings = useCallback(async () => {
    try {
      const userMapping = await assistantsStore.getUserMapping(subAssistant.id)
      const settings = initializeUserMappingSettings(subAssistant, userMapping)
      setUserMappingSettings(settings)
    } catch (error) {
      console.error('Error fetching user mapping settings:', error)
      const settings = initializeUserMappingSettings(subAssistant)
      setUserMappingSettings(settings)
    }
  }, [subAssistant])

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
    if (!subAssistant?.id) {
      toaster.error('Assistant not available')
      return
    }

    setIsSaving(true)

    try {
      await assistantsStore.saveUserMappingSettings(subAssistant.id, userMappingSettings)
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
    mapping: any,
    latestSettingsOptions: typeof settingsOptions
  ): null | UserSetting => {
    if (!mapping) return null

    const options = latestSettingsOptions[mapping.credentialType]
    if (!options || options.length === 0) return null

    return options.at(-1) ?? null // Use .at() for the last element
  }

  const onSettingAddedCallback = (itemKey: string) => async () => {
    await new Promise((res) => {
      setTimeout(res, 1000)
    })

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
    onNewIntegrationRequest(project, settingType, onSettingAddedCallback(itemKey))
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-surface-elevated rounded-lg border border-border-structural">
      <div className="flex items-center gap-2">
        <Avatar iconUrl={subAssistant.icon_url} name={subAssistant.name} type={AvatarType.SMALL} />
        <h4 className="text-sm font-semibold text-text-primary">{subAssistant.name}</h4>
      </div>

      <div className="flex flex-col gap-4">
        {displayableToolkits.map((toolkit) => (
          <Toolkit
            key={toolkit.toolkit}
            project={project}
            toolkit={toolkit}
            userMappingSettings={userMappingSettings}
            settingsOptions={settingsOptions}
            toolsDescriptions={toolsDescriptions}
            onUpdate={handleUpdateSetting}
            onAdd={handleAddIntegration}
          />
        ))}
      </div>

      {isDirty && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={isSaving} onClick={handleCancelChanges}>
            Cancel
          </Button>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}
