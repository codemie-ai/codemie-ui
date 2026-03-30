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

import { forwardRef, useContext, useRef } from 'react'

import AIFieldSVG from '@/assets/icons/ai-field.svg?react'
import AIGenerateSVG from '@/assets/icons/ai-generate.svg?react'
import ConfigureSVG from '@/assets/icons/configure.svg?react'
import ExpandSvg from '@/assets/icons/expand.svg?react'
import HistorySVG from '@/assets/icons/history.svg?react'
import Button from '@/components/Button'
import Textarea, { TextareaRef } from '@/components/form/Textarea'
import { SYSTEM_PROMPT_VARIABLES } from '@/constants'
import { useTheme } from '@/hooks/useTheme'
import { AssistantPromptVariable } from '@/types/entity/assistant'
import { humanize } from '@/utils/helpers'
import { cn } from '@/utils/utils'

import { AssistantFormContext } from '../../AssistantForm'

interface SystemPromptCurrentTabProps {
  customPromptVariables: AssistantPromptVariable[]
  isExpanded?: boolean
  isAIGenerated?: boolean
  showLabel?: boolean
  value: string
  error?: string
  onBlur: () => void
  onExpand?: () => void
  onShowVersionHistory?: () => void
  onManagePromptVariables?: () => void
  onPromptChange: (value: string) => void
  onShowGenAIPopup: () => void
}

const SystemPromptCurrentTab = forwardRef<TextareaRef, SystemPromptCurrentTabProps>(
  (
    {
      customPromptVariables,
      isExpanded,
      isAIGenerated,
      showLabel,
      value,
      error,
      onBlur,
      onExpand,
      onShowVersionHistory,
      onPromptChange,
      onShowGenAIPopup,
      onManagePromptVariables,
    },
    _ref
  ) => {
    const { isChatConfig } = useContext(AssistantFormContext)
    const { isDark } = useTheme()
    const textAreaRef = useRef<TextareaRef>(null)

    const handleVariableClick = (variable: string) => {
      if (!textAreaRef.current) return

      const cursorPosition = textAreaRef.current.getCursor() ?? value.length
      const textToInsert = `{{${variable}}}`
      const newValue = value.slice(0, cursorPosition) + textToInsert + value.slice(cursorPosition)

      onPromptChange(newValue)
      textAreaRef.current.focus()
      textAreaRef.current.setCursor(cursorPosition + textToInsert.length)
    }

    return (
      <div className="flex flex-col h-full">
        <div
          className={cn(
            'flex justify-between items-center gap-2 mb-2.5',
            isChatConfig && !isExpanded && 'flex-col items-end'
          )}
        >
          {showLabel && (
            <p className="text-sm font-mono text-text-quaternary">System Instructions</p>
          )}
          <div className={cn('flex gap-2', isChatConfig && !isExpanded ? 'flex-wrap' : 'ml-auto')}>
            <Button type="magical" size="medium" className="py-1 gap-2" onClick={onShowGenAIPopup}>
              <AIGenerateSVG />
              {value ? 'Refine with AI' : 'Generate with AI'}
            </Button>

            {onShowVersionHistory && (
              <Button
                type="secondary"
                size="medium"
                className="py-1 gap-2"
                onClick={onShowVersionHistory}
              >
                <HistorySVG />
                Version History
              </Button>
            )}

            {!isExpanded && (
              <Button type="secondary" onClick={onExpand}>
                <ExpandSvg /> Expand
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col border border-border-primary rounded-lg overflow-hidden flex-1">
          <div
            className={cn('flex px-4 py-2 items-center bg-surface-base-quateary', {
              'bg-border-primary/10 border-b border-border-primary': !isDark,
            })}
          >
            <div
              className={cn(
                'flex gap-4 flex-1',
                isChatConfig ? 'flex-col items-stretch' : 'items-center'
              )}
            >
              <div className="flex flex-wrap items-center gap-0.5 flex-1">
                {SYSTEM_PROMPT_VARIABLES.map((variable: string) => (
                  <button
                    type="button"
                    key={variable}
                    onClick={() => handleVariableClick(variable)}
                    className="cursor-pointer font-mono font-semibold text-xs text-text-primary bg-surface-base-secondary py-0.5 px-2 h-7 rounded-lg hover:bg-surface-base-secondary/50 transition border border-border-primary select-none"
                  >
                    {humanize(variable)}
                  </button>
                ))}

                {!!customPromptVariables?.length &&
                  customPromptVariables.map((variable: AssistantPromptVariable) => (
                    <button
                      type="button"
                      key={variable.key}
                      onClick={() => handleVariableClick(variable.key)}
                      className="cursor-pointer font-mono font-semibold text-xs py-0.5 px-2 h-7 rounded-lg transition border border-border-primary select-none text-in-progress-primary bg-in-progress-tertiary hover:bg-in-progress-tertiary/70"
                    >
                      {humanize(variable.key)}
                    </button>
                  ))}
              </div>

              <Button
                type="primary"
                onClick={onManagePromptVariables}
                className={cn(isChatConfig && 'ml-auto')}
              >
                <ConfigureSVG />
                Manage Prompt Vars
              </Button>
            </div>
          </div>
          <Textarea
            ref={textAreaRef}
            rows={15}
            value={value}
            error={error}
            rootClass="h-full"
            className="resize-none min-h-full rounded-none leading-5 !border-0 !p-2"
            placeholder="System Instructions*"
            onBlur={onBlur}
            onChange={(e) => onPromptChange(e.target.value)}
          >
            {isAIGenerated && (
              <div className="absolute top-3 right-6">
                <AIFieldSVG />
              </div>
            )}
          </Textarea>
        </div>
      </div>
    )
  }
)

export default SystemPromptCurrentTab
