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

import { OverlayPanel } from 'primereact/overlaypanel'
import { ChangeEvent, FC, useRef } from 'react'

import SlidersSvg from '@/assets/icons/sliders.svg?react'
import Switch from '@/components/form/Switch'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { cn } from '@/utils/utils'

import { useChatContext } from '../../hooks/useChatContext'

interface DynamicToolsSettingsProps {
  disabled?: boolean
}

const WEB_SEARCH_DESCRIPTION =
  'Enable web search capabilities including Google Search, Tavily Search, and Web Scraper'
const CODE_INTERPRETER_DESCRIPTION = 'Enable Python code execution and data analysis capabilities'

const DynamicToolsSettings: FC<DynamicToolsSettingsProps> = ({ disabled = false }) => {
  const overlayRef = useRef<OverlayPanel>(null)
  const [isWebSearchEnabled] = useFeatureFlag('features:webSearch')
  const [isCodeInterpreterEnabled] = useFeatureFlag('features:dynamicCodeInterpreter')
  const { dynamicToolsConfig, setDynamicToolsConfig } = useChatContext()

  // Hide if both features are disabled
  if (!isWebSearchEnabled && !isCodeInterpreterEnabled) {
    return null
  }

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    overlayRef.current?.toggle(e)
  }

  const handleWebSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDynamicToolsConfig({
      ...dynamicToolsConfig,
      enableWebSearch: e.target.checked,
    })
  }

  const handleCodeInterpreterChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDynamicToolsConfig({
      ...dynamicToolsConfig,
      enableCodeInterpreter: e.target.checked,
    })
  }

  // Count active tools for badge display
  const activeCount = [
    dynamicToolsConfig.enableWebSearch,
    dynamicToolsConfig.enableCodeInterpreter,
  ].filter(Boolean).length

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        data-tooltip-id="react-tooltip"
        data-tooltip-content="Configure dynamic tools for this conversation"
        data-onboarding="chat-tools-settings"
        className={cn(
          'relative flex items-center justify-center p-1 rounded-lg transition-colors',
          'text-text-quaternary hover:text-text-primary hover:bg-surface-elevated',
          disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
        )}
      >
        <SlidersSvg className="w-4 h-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-medium rounded-full bg-action-primary-solid text-text-on-primary">
            {activeCount}
          </span>
        )}
      </button>

      <OverlayPanel
        ref={overlayRef}
        className="bg-surface-base-secondary p-4 rounded-lg border border-border-structural shadow-xl"
      >
        <div className="flex flex-col gap-4 min-w-64">
          <div className="font-semibold text-sm text-text-primary">Tools Settings</div>

          {isWebSearchEnabled && (
            <Switch
              label="Web Search"
              value={dynamicToolsConfig.enableWebSearch ?? false}
              onChange={handleWebSearchChange}
              hint={WEB_SEARCH_DESCRIPTION}
            />
          )}

          {isCodeInterpreterEnabled && (
            <Switch
              label="Code Interpreter"
              value={dynamicToolsConfig.enableCodeInterpreter ?? false}
              onChange={handleCodeInterpreterChange}
              hint={CODE_INTERPRETER_DESCRIPTION}
            />
          )}
        </div>
      </OverlayPanel>
    </>
  )
}

DynamicToolsSettings.displayName = 'DynamicToolsSettings'

export default DynamicToolsSettings
