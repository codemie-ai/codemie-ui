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

import * as jsYaml from 'js-yaml'
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useSnapshot } from 'valtio'

import ExternalSvg from '@/assets/icons/external.svg?react'
import AceEditor from '@/components/AceEditor/AceEditor'
import Button from '@/components/Button'
import VersionedField, {
  VERSIONED_FIELD_TAB_ID,
  VersionedFieldTabId,
} from '@/components/form/VersionedField/VersionedField'
import { VersionedFieldOption } from '@/components/form/VersionedField/VersionedFieldHistoryTab'
import { ButtonType } from '@/constants'
import { appInfoStore } from '@/store/appInfo'
import { createdBy, formatDate, SHORT_DATE_FORMAT } from '@/utils/helpers'
import { isConfigItemEnabled, getConfigItemSettings } from '@/utils/settings'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import TabFooter from './components/TabFooter'

interface YamlPanelProps {
  yaml: string
  history?: any[]
  onUpdate?: (yaml: string) => void
  onClose: (forceCloseAll?: boolean) => void
}

export interface YamlPanelRef {
  isDirty: () => boolean
  reset: () => void
  save: () => Promise<boolean>
}

const YamlPanel = forwardRef<YamlPanelRef, YamlPanelProps>(
  ({ yaml, history = [], onUpdate, onClose }, ref) => {
    const { configs } = useSnapshot(appInfoStore)
    const [value, setValue] = useState(yaml)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<VersionedFieldTabId>(VERSIONED_FIELD_TAB_ID.current)
    const [selectedHistoryOption, setSelectedHistoryOption] = useState<string | null>(null)

    const isDocumentationEnabled = isConfigItemEnabled(configs, 'workflowYamlDocumentation')
    const documentationUrl = getConfigItemSettings(configs, 'workflowYamlDocumentation')?.url

    const validateYaml = (yamlText: string) => {
      if (!yamlText.trim()) {
        setValidationError(null)
        return true
      }

      try {
        const parsed = jsYaml.load(yamlText) as any

        const stateArrays: any[][] = [parsed?.states, parsed?.orphaned_states].filter(Boolean)
        for (const stateArray of stateArrays) {
          const hasMissingId = stateArray.some((s: any) => s != null && !s.id)
          if (hasMissingId) {
            setValidationError('Each state must have an "id" field')
            return false
          }
        }

        setValidationError(null)
        return true
      } catch (error: any) {
        setValidationError(error.message)
        return false
      }
    }

    const saveData = async (): Promise<boolean> => {
      if (!validateYaml(value)) {
        return false
      }

      try {
        onUpdate?.(value)
        return true
      } catch (error: any) {
        console.error('YAML update error:', error)
        return false
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => value !== yaml,
        reset: () => {
          setValue(yaml)
          setValidationError(null)
        },
        save: saveData,
      }),
      [value, yaml, onUpdate]
    )

    useEffect(() => {
      setValue(yaml)
      validateYaml(yaml)
    }, [yaml])

    const handleYamlChange = (newValue: string) => {
      setValue(newValue)
      validateYaml(newValue)
    }

    const historyOptions: VersionedFieldOption[] = history.map((item) => {
      let label = formatDate(item.date, SHORT_DATE_FORMAT)
      label += ` - ${createdBy(item.created_by)}`
      return { label, value: item.yaml_config }
    })

    const handleRestore = () => {
      if (selectedHistoryOption) {
        setValue(selectedHistoryOption)
        setActiveTab(VERSIONED_FIELD_TAB_ID.current)
      }
    }

    const handleSave = async () => {
      const success = await saveData()
      if (success) {
        toaster.info('YAML configuration updated successfully')
        onClose(true)
      } else {
        toaster.error('Cannot save: YAML syntax is invalid')
      }
    }

    const handleCancel = () => {
      setValue(yaml)
      onClose(true)
    }

    const headerContent =
      isDocumentationEnabled && documentationUrl ? (
        <a
          href={documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:no-underline"
        >
          <Button variant={ButtonType.SECONDARY} size="medium" className="!text-sm !font-bold">
            <ExternalSvg />
            Documentation
          </Button>
        </a>
      ) : null

    const currentTab = (
      <div className="flex flex-col gap-2">
        {validationError && (
          <div className="text-failed-secondary text-xs sticky top-0">
            YAML Error: {validationError}
          </div>
        )}

        <div
          className={cn('h-[500px] rounded-lg border-1 border-transparent', {
            'border-failed-secondary': validationError,
          })}
        >
          <AceEditor value={value} onChange={handleYamlChange} lang="yaml" name="yaml_config" />
        </div>
      </div>
    )

    const historyTab = selectedHistoryOption ? (
      <div className="h-[500px]">
        <AceEditor
          value={selectedHistoryOption}
          onChange={() => {}}
          lang="yaml"
          readonly
          name="yaml_config_history"
        />
      </div>
    ) : null

    return (
      <>
        <div className="flex flex-col gap-4">
          <VersionedField
            activeTab={activeTab}
            onTabChange={setActiveTab}
            historyOptions={historyOptions}
            selectedHistoryOption={selectedHistoryOption}
            onHistoryOptionChange={setSelectedHistoryOption}
            headerContent={headerContent}
            currentTab={currentTab}
            historyTab={historyTab}
            label="YAML Configuration"
            isLoading={false}
            isEditing={true}
            onRestore={handleRestore}
          />
        </div>

        <TabFooter onCancel={handleCancel} onSave={handleSave} saveDisabled={!!validationError} />
      </>
    )
  }
)

YamlPanel.displayName = 'YamlPanel'

export default YamlPanel
