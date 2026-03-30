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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import ExternalToolkitSvg from '@/assets/icons/external-toolkit.svg?react'
import Accordion from '@/components/Accordion'
import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { useToolkitSelection } from '@/hooks/useToolkitSelection'
import { assistantsStore } from '@/store'
import { settingsStore } from '@/store/settings'
import { AssistantToolkit } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'

import Toolkit from './Toolkit'
import ToolkitDetailModal from './ToolkitDetailModal'
import ToolkitHeader from './ToolkitHeader'
import ToolkitsPanelLayout from './ToolkitsPanelLayout'

interface ExternalToolsSectionProps {
  toolkits: AssistantToolkit[]
  onToolkitsChange: (toolkits: AssistantToolkit[]) => void
  project: string
  singleToolSelection?: boolean
  showNewIntegrationPopup: (project: string, credentialType: string) => void
  isCompactView?: boolean
}

const ExternalToolsSection = ({
  toolkits: selectedToolkits,
  onToolkitsChange,
  project,
  singleToolSelection = false,
  showNewIntegrationPopup,
  isCompactView,
}: ExternalToolsSectionProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const { settings } = useSnapshot(settingsStore)
  const { availableToolkits, getAssistantToolkits } = useSnapshot(assistantsStore)

  const externalToolkits = useMemo(
    () => availableToolkits.filter((tk) => tk.is_external),
    [availableToolkits]
  ) as AssistantToolkit[]

  const filteredToolkits = useMemo(() => {
    const query = search.toLowerCase()
    return externalToolkits.filter(
      (tk) =>
        tk.label.toLowerCase().includes(query) ||
        tk.tools.some((tool) => tool.label.toLowerCase().includes(query))
    )
  }, [externalToolkits, search])

  const filteredSettings = useMemo(() => {
    return Object.fromEntries(
      Object.entries(settings).map(([key, options]) => [
        key,
        (options as Setting[]).filter(
          (setting) => setting.project_name === project || setting.is_global
        ),
      ])
    )
  }, [settings, project]) as Record<string, Setting[]>

  const {
    toggleSingleTool,
    toggleMultiTool,
    toggleAllTools,
    updateToolkitSetting,
    updateToolSetting,
  } = useToolkitSelection({
    selectedToolkits,
    onToolkitsChange,
  })

  useEffect(() => {
    const fetchToolkits = async () => {
      setIsLoading(true)
      try {
        await getAssistantToolkits()
      } finally {
        setIsLoading(false)
      }
    }

    fetchToolkits()
  }, [])

  const toolkitProps = useMemo(
    () => ({
      settings: filteredSettings,
      selectedToolkits,
      toggleTool: singleToolSelection ? toggleSingleTool : toggleMultiTool,
      toggleAllTools,
      updateToolSetting,
      updateToolkitSetting,
      singleToolSelection,
      onAddSettingClick: (credentialType: string) => {
        showNewIntegrationPopup(project, credentialType)
      },
      isCompactView,
      onToolkitsChange,
    }),
    [
      filteredSettings,
      selectedToolkits,
      singleToolSelection,
      toggleSingleTool,
      toggleMultiTool,
      toggleAllTools,
      updateToolSetting,
      updateToolkitSetting,
      showNewIntegrationPopup,
      project,
      isCompactView,
      onToolkitsChange,
    ]
  )

  const renderHeader = useCallback(
    (tk: AssistantToolkit) => (
      <ToolkitHeader
        toolkit={tk}
        selectedToolkits={selectedToolkits}
        singleToolSelection={singleToolSelection}
      />
    ),
    [selectedToolkits, singleToolSelection]
  )

  const renderContent = useCallback(
    (tk: AssistantToolkit) => <Toolkit toolkit={tk} {...toolkitProps} searchQuery={search} />,
    [toolkitProps, search]
  )

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setSelectedIndex(0)
  }, [])

  const handleModalHide = useCallback(() => {
    setIsModalVisible(false)
    setSearch('')
  }, [])

  if (isLoading) return <Spinner inline />

  if (externalToolkits.length === 0) return null

  return (
    <>
      <Accordion
        title={
          <span className="flex items-center gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg border border-border-structural bg-border-structural/10">
              <ExternalToolkitSvg className="w-[18px] h-[18px]" />
            </div>
            External Tools
          </span>
        }
        description={
          <div className="ml-12">
            <p className="font-geist-mono text-xs leading-normal text-text-tertiary">
              These toolkits are provided by third-party vendors.
            </p>
          </div>
        }
        defaultOpen={false}
      >
        {isCompactView ? (
          <div className="flex flex-col gap-4 px-4 pb-4">
            {/* Vertical scrollable list of toolkits */}
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto show-scroll pr-2">
              {externalToolkits.map((toolkit) => (
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
                Configure External Tools
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
          title="External Tools"
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

export default ExternalToolsSection
