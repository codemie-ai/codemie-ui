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

import React, { useMemo, useState, useEffect } from 'react'

import Avatar from '@/components/Avatar/Avatar'
import { Checkbox } from '@/components/form/Checkbox'
import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'
import { AvatarType } from '@/constants/avatar'
import { CategorySelector } from '@/pages/assistants/components'
import { SubAssistantInfo, SubAssistantPublishSettings } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

interface SubAssistantSettingsProps {
  subAssistants: SubAssistantInfo[]
  settings: SubAssistantPublishSettings[]
  onSettingsChange: (settings: SubAssistantPublishSettings[]) => void
}

const SubAssistantSettings: React.FC<SubAssistantSettingsProps> = ({
  subAssistants,
  settings,
  onSettingsChange,
}) => {
  // Initialize with all sub-assistants that are marked for marketplace publishing expanded
  const [expandedAssistants, setExpandedAssistants] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>()
    subAssistants.forEach((sa) => {
      // Expand if sub-assistant is marked for marketplace publishing (is_global)
      const setting = settings.find((s) => s.assistant_id === sa.id)
      const isGlobal = setting?.is_global ?? sa.is_global ?? true
      if (isGlobal) {
        initialExpanded.add(sa.id)
      }
    })
    return initialExpanded
  })

  // Automatically expand/collapse based on is_global status
  useEffect(() => {
    setExpandedAssistants((prev) => {
      const newExpanded = new Set(prev)
      settings.forEach((setting) => {
        if (setting.is_global && !newExpanded.has(setting.assistant_id)) {
          // Auto-expand when marked for marketplace
          newExpanded.add(setting.assistant_id)
        } else if (!setting.is_global && newExpanded.has(setting.assistant_id)) {
          // Auto-collapse when unmarked from marketplace
          newExpanded.delete(setting.assistant_id)
        }
      })
      return newExpanded
    })
  }, [settings])

  const handleToggleGlobal = (assistantId: string, isGlobal: boolean) => {
    const existingSettingIndex = settings.findIndex((s) => s.assistant_id === assistantId)

    // Get categories from the subassistant data when enabling marketplace publishing
    const subAssistant = subAssistants.find((sa) => sa.id === assistantId)
    const categoriesToSet = isGlobal && subAssistant?.categories ? subAssistant.categories : []

    if (existingSettingIndex >= 0) {
      // Update existing setting
      const newSettings = [...settings]
      newSettings[existingSettingIndex] = {
        ...newSettings[existingSettingIndex],
        is_global: isGlobal,
        // Auto-populate categories from subassistant data when enabling marketplace
        categories: isGlobal ? categoriesToSet : newSettings[existingSettingIndex].categories,
      }
      onSettingsChange(newSettings)
    } else {
      // Add new setting with categories from subassistant data if enabling marketplace
      onSettingsChange([
        ...settings,
        {
          assistant_id: assistantId,
          is_global: isGlobal,
          categories: categoriesToSet,
        },
      ])
    }
  }

  const handleCategoriesChange = (assistantId: string, categories: string[]) => {
    const existingSettingIndex = settings.findIndex((s) => s.assistant_id === assistantId)

    if (existingSettingIndex >= 0) {
      // Update existing setting
      const newSettings = [...settings]
      newSettings[existingSettingIndex] = {
        ...newSettings[existingSettingIndex],
        categories,
      }
      onSettingsChange(newSettings)
    } else {
      // Add new setting with categories
      const isGlobal = getIsGlobal(assistantId)
      onSettingsChange([
        ...settings,
        {
          assistant_id: assistantId,
          is_global: isGlobal,
          categories,
        },
      ])
    }
  }

  const getIsGlobal = (assistantId: string): boolean => {
    const setting = settings.find((s) => s.assistant_id === assistantId)
    if (setting) {
      return setting.is_global
    }
    // Default to true (publish to marketplace) if no setting exists
    const subAssistant = subAssistants.find((sa) => sa.id === assistantId)
    return subAssistant?.is_global ?? true
  }

  const getCategories = (assistantId: string): string[] => {
    const setting = settings.find((s) => s.assistant_id === assistantId)
    if (setting?.categories) {
      return setting.categories
    }
    // If no setting exists yet, use categories from the subassistant data if available
    const subAssistant = subAssistants.find((sa) => sa.id === assistantId)
    return subAssistant?.categories || []
  }

  const allSelected = useMemo(() => {
    return subAssistants.every((sa) => getIsGlobal(sa.id))
  }, [subAssistants, settings])

  const handleSelectAll = () => {
    const shouldSelectAll = !allSelected

    const newSettings = subAssistants.map((sa) => ({
      assistant_id: sa.id,
      is_global: shouldSelectAll,
    }))

    onSettingsChange(newSettings)
  }

  if (!subAssistants || subAssistants.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <h3 className="text-base font-medium text-text-quaternary mb-1">Sub-Assistants</h3>
      </div>

      <InfoWarning
        type={InfoWarningType.INFO}
        message="Please, select sub-assistant(s) that will be published to Marketplace with assistant"
      />

      <div className="mt-1">
        <div // nosonar
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-elevated rounded-lg transition-colors"
          onClick={handleSelectAll}
        >
          <Checkbox
            id="select-all-sub-assistants"
            checked={allSelected}
            onChange={handleSelectAll}
          />
          <span className="text-sm font-medium text-text-primary">Select All</span>
        </div>

        <div className="space-y-3">
          {subAssistants.map((subAssistant) => {
            const isGlobal = getIsGlobal(subAssistant.id)
            const categories = getCategories(subAssistant.id)
            const isExpanded = expandedAssistants.has(subAssistant.id)

            const handleToggle = (e: React.MouseEvent) => {
              // Prevent toggle if clicking on checkbox
              if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
                return
              }
              handleToggleGlobal(subAssistant.id, !isGlobal)
            }

            return (
              <div
                key={subAssistant.id}
                className={cn(
                  'border border-border-structural rounded-lg',
                  'bg-surface-elevated transition-colors hover:border-specific-interactive-outline'
                )}
              >
                <div // nosonar
                  className={cn('p-4', 'cursor-pointer')}
                  onClick={handleToggle}
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      id={`sub-assistant-${subAssistant.id}`}
                      checked={isGlobal}
                      onChange={(checked) => handleToggleGlobal(subAssistant.id, checked)}
                    />
                    <Avatar
                      iconUrl={subAssistant.icon_url}
                      name={subAssistant.name}
                      type={AvatarType.SMALL}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-text-primary truncate">
                        {subAssistant.name}
                      </h4>
                      {subAssistant.description && (
                        <p className="text-xs text-text-quaternary mt-1 line-clamp-2">
                          {subAssistant.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded && isGlobal ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="px-4 pb-4 pt-2 border-t border-border-structural">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="text-sm font-medium text-text-primary">Categories</h5>
                      </div>
                      <CategorySelector
                        selectedCategories={categories}
                        onCategoriesChange={(cats) => handleCategoriesChange(subAssistant.id, cats)}
                        disabled={false}
                        hideHeader={true}
                        placeholder={
                          categories.length === 0
                            ? 'Will be inherited from parent assistant'
                            : 'Select up to 3 categories'
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SubAssistantSettings
