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

import { ComponentProps, useCallback, useMemo, useState } from 'react'

import ToolSvg from '@/assets/icons/tool.svg?react'
import Accordion from '@/components/Accordion'
import Button from '@/components/Button'
import { TOOLKITS } from '@/constants/assistants'
import { AssistantToolkit, Tool } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'

import PluginToolkit from './PluginToolkit'
import Toolkit from './Toolkit'
import ToolkitDetailModal from './ToolkitDetailModal'
import ToolkitHeader from './ToolkitHeader'
import ToolkitsPanelLayout from './ToolkitsPanelLayout'

export const DEFAULT_AVAILABLE_TOOLS_DESCRIPTION =
  'Important note: Please choose only the tools that are relevant to your needs. Selecting all available tools can negatively affect the results, slow down response times, and increase costs.'

export interface ToolkitRenderProps {
  settings: Record<string, Setting[]>
  selectedToolkits: AssistantToolkit[]
  toggleTool: (toolkit: AssistantToolkit, tool: Tool) => void
  toggleAllTools: (toolkit: AssistantToolkit, allToolsSelected: boolean) => void
  updateToolSetting: (toolkit: AssistantToolkit, tool: Tool, setting?: Setting) => void
  updateToolkitSetting: (toolkit: AssistantToolkit, setting?: Setting) => void
  singleToolSelection: boolean
  onAddSettingClick: (credentialType: string) => void
  isChatConfig?: boolean
  onToolkitsChange: (toolkits: AssistantToolkit[]) => void
}

interface AvailableToolsSectionProps {
  internalToolkits: AssistantToolkit[]
  toolkitRenderProps: ToolkitRenderProps
  singleToolSelection: boolean
  defaultOpen: boolean
  isCompactView?: boolean
  customToolkitRenderer?: {
    [toolkitType: string]: React.ComponentType<ComponentProps<typeof Toolkit>>
  }
  availableToolsDescription?: string
}

const AvailableToolsSection = ({
  internalToolkits,
  toolkitRenderProps,
  singleToolSelection,
  defaultOpen,
  isCompactView = false,
  customToolkitRenderer,
  availableToolsDescription = DEFAULT_AVAILABLE_TOOLS_DESCRIPTION,
}: AvailableToolsSectionProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [isModalVisible, setIsModalVisible] = useState(false)

  const filteredToolkits = useMemo(() => {
    const query = search.toLowerCase()
    return internalToolkits.filter(
      (tk) =>
        (tk.label || tk.toolkit).toLowerCase().includes(query) ||
        tk.tools.some((tool) => (tool.label || tool.name).toLowerCase().includes(query))
    )
  }, [internalToolkits, search])

  const renderHeader = useCallback(
    (tk: AssistantToolkit) => (
      <ToolkitHeader
        toolkit={tk}
        selectedToolkits={toolkitRenderProps.selectedToolkits}
        singleToolSelection={singleToolSelection}
      />
    ),
    [toolkitRenderProps.selectedToolkits, singleToolSelection]
  )

  const renderContent = useCallback(
    (tk: AssistantToolkit) => {
      const props = { ...toolkitRenderProps, toolkit: tk, searchQuery: search }
      const CustomComponent = customToolkitRenderer?.[tk.toolkit]
      if (CustomComponent) return <CustomComponent {...props} />
      if (tk.toolkit === TOOLKITS.Plugin) return <PluginToolkit {...props} />
      return <Toolkit {...props} />
    },
    [toolkitRenderProps, search, customToolkitRenderer]
  )

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setSelectedIndex(0)
  }, [])

  const handleModalHide = useCallback(() => {
    setIsModalVisible(false)
    setSearch('')
  }, [])

  return (
    <>
      <Accordion
        title={
          <span className="flex items-center gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg border border-border-structural bg-border-structural/10">
              <ToolSvg className="w-[18px] h-[18px]" />
            </div>
            Available Tools
          </span>
        }
        description={
          singleToolSelection ? undefined : (
            <div className="ml-12">
              <p className="font-geist-mono text-xs leading-normal text-text-tertiary">
                {availableToolsDescription}
              </p>
            </div>
          )
        }
        defaultOpen={defaultOpen}
      >
        {isCompactView ? (
          <div className="flex flex-col gap-4 px-4 pb-4">
            {/* Vertical scrollable list of toolkits */}
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto show-scroll pr-2">
              {internalToolkits.map((toolkit) => (
                <div
                  key={toolkit.toolkit}
                  className="flex items-center p-3 gap-4 rounded-lg border border-transparent bg-surface-base-float"
                >
                  {renderHeader(toolkit)}
                </div>
              ))}
            </div>

            {/* Configure button - outside scroll */}
            <Button
              variant="secondary"
              onClick={() => setIsModalVisible(true)}
              className="self-center w-[212px] h-7 px-4 py-1"
            >
              <span className="font-geist-mono font-semibold text-xs leading-4">
                Configure Available Tools
              </span>
            </Button>
          </div>
        ) : (
          <ToolkitsPanelLayout
            filteredToolkits={filteredToolkits}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            search={search}
            onSearchChange={handleSearchChange}
            renderHeader={renderHeader}
            renderContent={renderContent}
            compact={false}
          />
        )}
      </Accordion>

      {/* Modal for compact view */}
      {isCompactView && (
        <ToolkitDetailModal
          visible={isModalVisible}
          onHide={handleModalHide}
          title="Available Tools"
          filteredToolkits={filteredToolkits}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          search={search}
          onSearchChange={handleSearchChange}
          renderHeader={renderHeader}
          renderContent={renderContent}
        />
      )}
    </>
  )
}

export default AvailableToolsSection
