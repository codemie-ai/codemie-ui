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
      textAreaRef.current.focus()
      document.execCommand('insertText', false, `{{${variable}}}`)
    }

    return (
      <div className="flex flex-col h-full">
        <div
          className={cn(
            'flex justify-between items-end min-h-8 max-h-8 mb-4',
            isChatConfig && !isExpanded && 'flex-col items-end gap-4'
          )}
        >
          {showLabel && <p className="text-sm font-semibold">System Instructions</p>}
          <div className="ml-auto flex gap-4">
            <Button type="magical" onClick={onShowGenAIPopup}>
              <AIGenerateSVG />
              {value ? 'Refine with AI' : 'Generate with AI'}
            </Button>

            {!isExpanded && (
              <Button type="secondary" onClick={onExpand}>
                <ExpandSvg /> Expand
              </Button>
            )}
          </div>
        </div>

        <div
          className={cn(
            'flex flex-wrap px-3 py-1.5 gap-2 items-center bg-border-primary rounded-t-lg',
            { 'bg-border-primary/10 border-1 border-b-0 border-border-primary': !isDark }
          )}
        >
          {SYSTEM_PROMPT_VARIABLES.map((variable: string) => (
            <button
              type="button"
              key={variable}
              onClick={() => handleVariableClick(variable)}
              className="
                cursor-pointer font-semibold text-xs bg-surface-base-secondary py-1.5 px-2 !rounded-lg
                hover:bg-surface-base-secondary/50 transition border border-border-primary
                select-none 
              "
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
                className="
                cursor-pointer font-semibold text-xs py-1.5 px-2 !rounded-lg
                transition border border-border-primary
                select-none text-in-progress-primary bg-in-progress-tertiary hover:bg-in-progress-tertiary/70
              "
              >
                {humanize(variable.key)}
              </button>
            ))}

          <div className="ml-auto">
            <Button type="primary" onClick={onManagePromptVariables}>
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
          className="resize-none min-h-full rounded-t-none"
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
    )
  }
)

export default SystemPromptCurrentTab
