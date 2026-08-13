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
import { Checkbox } from '@/components/form/Checkbox'
import { assistantsStore } from '@/store/assistants'
import { userSettingsStore } from '@/store/userSettings'
import { Assistant } from '@/types/entity/assistant'
import {
  applyAutoResolvedIntegrations,
  collectAutoLookupCredentialTypes,
  getDisplayableToolkits,
  getScopedMappingIntegrationOptions,
  initializeUserMappingSettings,
} from '@/utils/assistants'
import toaster from '@/utils/toaster'

import { Toolkit } from './components/Toolkit'
import { SubAssistantUserMapping } from './SubAssistantUserMapping'
import { UserMappingSetting, UserMappingSettings, UserSetting } from './types'

interface UserMappingProps {
  assistant: Assistant
  onNewIntegrationRequest: (project: string, settingType: string, onComplete: () => void) => void
  onSectionVisibilityChange: (visible: boolean) => void
  // Set when the section is opened from a workflow screen. Selections then default to that
  // workflow; on the assistant page it is undefined and saves stay assistant-wide.
  workflowId?: string
}

interface SubAssistantData {
  assistant: Assistant
  displayableToolkits: any[]
  userMappingSettings: UserMappingSettings
  hasMapping: boolean
  // Whether this sub-assistant already has an assistant-wide selection of its own. The section's
  // single checkbox governs sub-assistant saves too, so its default must consider all of them.
  hasAssistantScopeSelection: boolean
}

export const UserMapping: React.FC<UserMappingProps> = ({
  assistant,
  onNewIntegrationRequest,
  onSectionVisibilityChange,
  workflowId,
}) => {
  const { getAssistantToolkits } = useSnapshot(assistantsStore)
  const [userMappingSettings, setUserMappingSettings] = useState<UserMappingSettings>({})
  const [settingsOptions, setSettingsOptions] = useState<Record<string, UserSetting[]>>({})
  const [toolsDescriptions, setToolsDescriptions] = useState<
    Record<string, Record<string, string | undefined>>
  >({})
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [subAssistantsData, setSubAssistantsData] = useState<SubAssistantData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Governs the whole section (sub-assistants included): off saves for this workflow only, on
  // saves for the assistant everywhere.
  const [applyToAssistant, setApplyToAssistant] = useState(false)
  // Slots the user actually touched. In workflow scope only these are sent, so inherited values
  // are never written into the workflow row — otherwise later assistant-page changes would stop
  // reaching this workflow.
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set())

  const displayableToolkits = useMemo(() => getDisplayableToolkits(assistant), [assistant])
  const hasOrchestratorMapping = displayableToolkits.length > 0
  const hasAnySubAssistantMapping = subAssistantsData.some((data) => data.hasMapping)
  const shouldShowSection = hasOrchestratorMapping || hasAnySubAssistantMapping

  const isMarketplace = Boolean(assistant.is_global)

  const loadIntegrations = useCallback(async () => {
    // Marketplace assistants offer cross-project PROJECT integrations, which the default
    // candidate endpoint does not return; request the marketplace scope so they are available.
    await userSettingsStore.indexSettings(isMarketplace)
    const fetchedSettings = userSettingsStore.getSettings()

    // Project-shared: personal integrations of this project (or global) plus PROJECT
    // integrations of this project. Marketplace: any USER (own) or PROJECT integration.
    setSettingsOptions(
      getScopedMappingIntegrationOptions(fetchedSettings, assistant.project, isMarketplace)
    )
  }, [assistant.project, isMarketplace])

  const fetchUserMappingSettings = useCallback(async () => {
    try {
      // Ask about the credential types of the displayed slots as well, so the backend reports what
      // auto lookup would resolve for the ones without an explicit choice. MCP slots are left out:
      // without a selection they run on the author's base config, there is nothing to resolve.
      const credentialTypes = collectAutoLookupCredentialTypes(assistant)

      // Inside a workflow the backend answers with the effective selection: the assistant-wide
      // one, overridden per slot by anything saved for this workflow.
      const userMapping = await assistantsStore.getUserMapping(
        assistant.id,
        workflowId,
        credentialTypes
      )
      const initialSettings = initializeUserMappingSettings(assistant, userMapping)
      // Pre-select what a run would pick for slots the user never chose. Marking them as changed
      // makes the next save store them explicitly, which is the intended behaviour: from then on
      // the slot is pinned to that integration instead of following auto lookup.
      const autoResolvedKeys = applyAutoResolvedIntegrations(
        initialSettings,
        userMapping?.auto_resolved
      )
      setUserMappingSettings(initialSettings)
      if (autoResolvedKeys.length) {
        setChangedKeys((prev) => new Set([...prev, ...autoResolvedKeys]))
      }
      return !!userMapping?.has_assistant_scope_selection
    } catch (error) {
      console.error('Error fetching user mapping settings:', error)
      const initialSettings = initializeUserMappingSettings(assistant)
      setUserMappingSettings(initialSettings)
      return false
    }
  }, [assistant, workflowId])

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
            hasAssistantScopeSelection: false,
          }
        }

        try {
          const userMapping = await assistantsStore.getUserMapping(
            subAssistant.id,
            workflowId,
            collectAutoLookupCredentialTypes(subAssistant)
          )
          const initialSettings = initializeUserMappingSettings(subAssistant, userMapping)
          applyAutoResolvedIntegrations(initialSettings, userMapping?.auto_resolved)

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
            hasAssistantScopeSelection: !!userMapping?.has_assistant_scope_selection,
          }
        } catch (error) {
          console.error('Error fetching mapping for sub-assistant:', subAssistant.id, error)
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
            hasAssistantScopeSelection: false,
          }
        }
      } catch (error) {
        console.error('Error processing sub-assistant:', subAssistant.id, error)
        return {
          assistant: subAssistant,
          displayableToolkits: [],
          userMappingSettings: {},
          hasMapping: false,
          hasAssistantScopeSelection: false,
        }
      }
    })

    return Promise.all(subAssistantsDataPromises)
  }, [assistant.nested_assistants, workflowId])

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true)
      try {
        const [, , orchestratorHasSelection, subAssistants] = await Promise.all([
          loadIntegrations(),
          fetchToolsDescriptions(),
          // Load the orchestrator mapping whenever it has slots; inside a workflow also load it
          // when it has none, because the checkbox default needs its selection flag.
          hasOrchestratorMapping || workflowId ? fetchUserMappingSettings() : false,
          fetchSubAssistantsData(),
        ])
        setSubAssistantsData(subAssistants)
        // Pre-tick only when the user has no assistant-wide selection anywhere in this section —
        // the checkbox saves the orchestrator and every sub-assistant together, so a single
        // existing selection must keep it off rather than silently widening that one.
        const hasAnyAssistantScopeSelection =
          !!orchestratorHasSelection ||
          subAssistants.some((data) => data.hasAssistantScopeSelection)
        setApplyToAssistant(!!workflowId && !hasAnyAssistantScopeSelection)
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

  const handleUpdateSetting = (
    itemKey: string,
    settingId: string | null,
    setting: UserSetting | null
  ) => {
    setUserMappingSettings((prev) => {
      if (prev[itemKey]) {
        return {
          ...prev,
          [itemKey]: {
            ...prev[itemKey],
            settingId,
            setting,
          },
        }
      }
      return prev
    })
    setChangedKeys((prev) => new Set(prev).add(itemKey))
    setIsDirty(true)
  }

  // Changing the scope is a change in its own right: promoting the current selection to the whole
  // assistant must not require re-picking a slot just to reveal the save button.
  const handleApplyToAssistantChange = (checked: boolean) => {
    setApplyToAssistant(checked)
    setIsDirty(true)
  }

  const handleSaveChanges = async () => {
    if (!assistant?.id) {
      toaster.error('Assistant not available')
      return
    }

    setIsSaving(true)

    try {
      // Assistant scope keeps sending every displayed slot (unchanged behaviour). Workflow scope
      // sends only what the user changed, so untouched slots keep following the assistant scope.
      const settingsToSave =
        workflowId && !applyToAssistant
          ? Object.fromEntries(
              Object.entries(userMappingSettings).filter(([key]) => changedKeys.has(key))
            )
          : userMappingSettings

      await assistantsStore.saveUserMappingSettings(
        assistant.id,
        settingsToSave,
        workflowId ? { workflowId, applyToAssistant } : undefined
      )
      // Name the scope the save actually landed in, so the user is never left guessing
      // whether the change applies to this workflow only or to the assistant everywhere.
      toaster.info(
        workflowId && !applyToAssistant
          ? 'Your integration settings have been successfully saved for this workflow.'
          : 'Your integration settings have been successfully saved for this assistant.'
      )
      await fetchUserMappingSettings()
    } catch (error) {
      console.error('Error saving user mapping settings:', error)
      const errorMessage =
        (error as Error).message || 'An unexpected error occurred while saving your settings.'
      toaster.error(errorMessage)
    } finally {
      setIsSaving(false)
      setIsDirty(false)
      setChangedKeys(new Set())
    }
  }

  const handleCancelChanges = () => {
    fetchUserMappingSettings()
    setIsDirty(false)
    setChangedKeys(new Set())
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
      handleUpdateSetting(itemKey, latestSetting.id, latestSetting)
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
        {workflowId && (
          <Checkbox
            id="user-mapping-apply-to-assistant"
            checked={applyToAssistant}
            onChange={handleApplyToAssistantChange}
            label="Apply to the whole assistant, not just this workflow"
            hint="Off: these integrations are used only when the assistant runs in this workflow. On: they are used everywhere this assistant runs, including chat."
          />
        )}

        {hasOrchestratorMapping && (
          <div>
            {showOrchestratorHeader && (
              <h4 className="text-base font-semibold text-text-primary mb-4">
                Orchestrator Settings
              </h4>
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
                  workflowId={workflowId}
                  applyToAssistant={applyToAssistant}
                />
              ))}
          </div>
        )}
      </div>
    </DetailsSidebarSection>
  )
}
