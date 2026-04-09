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

import { ReactNode } from 'react'

import CrossSvg from '@/assets/icons/cross.svg?react'
import SearchSvg from '@/assets/icons/search.svg?react'
import Input from '@/components/form/Input'
import { AssistantToolkit } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

interface ToolkitsPanelLayoutProps {
  filteredToolkits: AssistantToolkit[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  search: string
  onSearchChange: (value: string) => void
  renderHeader: (tk: AssistantToolkit) => ReactNode
  renderContent: (tk: AssistantToolkit) => ReactNode
  compact?: boolean
}

const ToolkitsPanelLayout = ({
  filteredToolkits,
  selectedIndex,
  onSelectIndex,
  search,
  onSearchChange,
  renderHeader,
  renderContent,
  compact = false,
}: ToolkitsPanelLayoutProps) => {
  const clearButton = search ? (
    <button onClick={() => onSearchChange('')}>
      <CrossSvg className="w-[14px] h-[14px] text-icon-primary" />
    </button>
  ) : undefined

  const searchInput = (rootClass: string) => (
    <Input
      placeholder="Search"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      leftIcon={<SearchSvg className="w-[18px] h-[18px] text-text-quaternary" />}
      rightIcon={clearButton}
      containerClass="h-8 bg-surface-base-secondary border-border-primary rounded-lg"
      inputClass="font-geist-mono text-sm text-icon-primary placeholder:text-text-quaternary"
      rootClass={rootClass}
    />
  )

  if (compact) {
    return (
      <div className="relative -mt-4">
        {/* Search */}
        <div className="h-16 flex items-center p-4 border-b border-border-structural">
          {searchInput('w-full')}
        </div>

        {filteredToolkits.length > 0 ? (
          <div className="border-b border-border-structural pb-1">
            <div className="overflow-y-auto show-scroll pt-6 pr-2 pb-2 pl-4">
              <div className="flex flex-col gap-2">
                {filteredToolkits.map((toolkit, index) => (
                  <div
                    key={toolkit.toolkit}
                    onClick={() => onSelectIndex(index)}
                    className={cn(
                      'flex items-center min-w-0 overflow-hidden p-3 gap-4 rounded-lg cursor-pointer transition-all focus:outline-none border',
                      selectedIndex === index
                        ? 'bg-surface-base-float border-border-structural'
                        : 'border-transparent hover:bg-border-structural/10'
                    )}
                  >
                    {renderHeader(toolkit)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-10 text-text-quaternary text-sm border-b border-border-structural">
            No results found
          </div>
        )}

        {/* Content below */}
        <div className="bg-surface-base-primary">
          {filteredToolkits[selectedIndex] ? (
            renderContent(filteredToolkits[selectedIndex])
          ) : (
            <div className="flex items-center justify-center py-10 text-text-quaternary text-sm">
              No available data for display
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[662px] bg-surface-base-secondary rounded-lg overflow-hidden p-4">
      <div className="relative grid grid-cols-[320px_1fr] h-full border border-border-primary rounded-2xl overflow-hidden">
        <div className="absolute top-0 bottom-0 left-[320px] border-l border-border-structural z-10" />

        {/* Left: Toolkit list */}
        <div className="relative flex flex-col h-full bg-surface-base-primary overflow-hidden">
          {/* Search */}
          <div className="h-[85px] flex items-center p-4 bg-surface-base-primary">
            {searchInput('w-full')}
          </div>

          {/* List */}
          {filteredToolkits.length > 0 ? (
            <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto pt-6 pb-6 pl-4 pr-2 show-scroll border-t border-border-structural bg-surface-base-primary">
              {filteredToolkits.map((toolkit, index) => (
                <div
                  key={toolkit.toolkit}
                  onClick={() => onSelectIndex(index)}
                  className={cn(
                    'flex items-center p-3 gap-4 rounded-lg cursor-pointer transition-all focus:outline-none border',
                    selectedIndex === index
                      ? 'bg-surface-base-float border-border-structural'
                      : 'border-transparent hover:bg-border-structural/10'
                  )}
                >
                  {renderHeader(toolkit)}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 text-text-quaternary text-sm border-t border-border-structural bg-surface-base-primary">
              No results found
            </div>
          )}
        </div>

        {/* Right: Selected toolkit content */}
        <div className="bg-surface-base-primary h-full overflow-y-auto show-scroll">
          {filteredToolkits[selectedIndex] ? (
            renderContent(filteredToolkits[selectedIndex])
          ) : (
            <div className="flex items-center justify-center h-full text-text-quaternary text-sm">
              No available data for display
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ToolkitsPanelLayout
