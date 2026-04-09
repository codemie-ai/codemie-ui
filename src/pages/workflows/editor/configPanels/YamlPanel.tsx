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
import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import { useSnapshot } from 'valtio'

import ExternalSvg from '@/assets/icons/external.svg?react'
import AceEditor, { AceEditorRef } from '@/components/AceEditor/AceEditor'
import Button from '@/components/Button'
import Autocomplete from '@/components/form/Autocomplete'
import Tabs from '@/components/Tabs/Tabs'
import { ButtonType } from '@/constants'
import { appInfoStore } from '@/store/appInfo'
import { CreatedBy } from '@/types/common'
import { createdBy, formatDate, SHORT_DATE_FORMAT } from '@/utils/helpers'
import { isConfigItemEnabled, getConfigItemSettings } from '@/utils/settings'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import { useWorkflowContext } from '../hooks/useWorkflowContext'
import TabFooter from './components/TabFooter'

interface YamlHistoryItem {
  date: string
  yaml_config: string
  created_by: CreatedBy
}

interface YamlPanelProps {
  yaml: string
  history?: YamlHistoryItem[]
  onUpdate?: (yaml: string) => void
  onClose: (forceCloseAll?: boolean) => void
}

export interface YamlPanelRef {
  isDirty: () => boolean
  reset: () => void
  save: () => Promise<boolean>
  jumpToLine: (line: number, column?: number) => void
}

const YamlPanel = forwardRef<YamlPanelRef, YamlPanelProps>(
  ({ yaml, history = [], onUpdate, onClose }, ref) => {
    const { configs } = useSnapshot(appInfoStore)
    const { activeIssue } = useWorkflowContext()
    const aceEditorRef = useRef<AceEditorRef>(null)
    const [value, setValue] = useState(yaml)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current')
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

    const jumpToLine = (line: number, column?: number) => {
      if (aceEditorRef.current) {
        aceEditorRef.current.jumpToLine(line, column)
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
        jumpToLine,
      }),
      [value, yaml, onUpdate]
    )

    useEffect(() => {
      if (!activeIssue?.configLine || !aceEditorRef.current) return
      jumpToLine(activeIssue.configLine!)
    }, [activeIssue?.configLine])

    useEffect(() => {
      setValue(yaml)
      validateYaml(yaml)
    }, [yaml])

    const handleYamlChange = (newValue: string) => {
      setValue(newValue)
      validateYaml(newValue)
    }

    const historyOptions = history.map((item, index) => {
      const versionNumber = history.length - index
      const label = `[${String(versionNumber).padStart(2, '0')}] - ${formatDate(
        item.date,
        SHORT_DATE_FORMAT
      )} - ${createdBy(item.created_by)}`
      return { label, value: item.yaml_config }
    })

    const handleRestore = () => {
      if (selectedHistoryOption) {
        setValue(selectedHistoryOption)
        setActiveTab('current')
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

    const documentationButton =
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

    const currentTabContent = (
      <div className="flex flex-col gap-2">
        {validationError && (
          <div className="text-failed-secondary text-xs sticky top-0">
            YAML Error: {validationError}
          </div>
        )}
        <div
          className={cn('h-[500px] rounded-lg border border-transparent', {
            'border-failed-secondary': validationError,
          })}
        >
          <AceEditor
            ref={aceEditorRef}
            value={value}
            onChange={handleYamlChange}
            lang="yaml"
            name="yaml_config"
          />
        </div>
      </div>
    )

    const historyTabContent = (
      <div className="flex flex-col gap-2 h-full">
        {historyOptions.length > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <Autocomplete
                placeholder="Select a version"
                options={historyOptions}
                value={selectedHistoryOption ?? ''}
                onChange={(value) => setSelectedHistoryOption(value)}
                className="flex-1 h-[34px]"
              />
              <Button onClick={handleRestore} className="w-[66px] h-7 shrink-0">
                Restore
              </Button>
            </div>
            {selectedHistoryOption && (
              <div className="h-[500px]">
                <AceEditor
                  value={selectedHistoryOption}
                  onChange={() => {}}
                  lang="yaml"
                  readonly
                  name="yaml_config_history"
                />
              </div>
            )}
          </>
        ) : (
          <h1 className="text-md text-center">Value was not yet modified</h1>
        )}
      </div>
    )

    return (
      <>
        <div className="flex flex-col gap-4">
          <div className="flex items-center">
            <label className="text-sm text-text-quaternary">YAML Configuration</label>
            <div className="ml-auto">{documentationButton}</div>
          </div>
          <Tabs
            tabs={[
              { id: 'current', label: 'Edit mode', element: currentTabContent },
              { id: 'history', label: 'Version History', element: historyTabContent },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="h-full"
          />
        </div>

        <TabFooter onCancel={handleCancel} onSave={handleSave} saveDisabled={!!validationError} />
      </>
    )
  }
)

YamlPanel.displayName = 'YamlPanel'

export default YamlPanel
