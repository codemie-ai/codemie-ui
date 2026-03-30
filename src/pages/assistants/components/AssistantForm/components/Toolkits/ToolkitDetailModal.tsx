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

import Popup from '@/components/Popup'
import { AssistantToolkit } from '@/types/entity/assistant'

import ToolkitsPanelLayout from './ToolkitsPanelLayout'

interface ToolkitDetailModalProps {
  visible: boolean
  onHide: () => void
  title: string
  filteredToolkits: AssistantToolkit[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  search: string
  onSearchChange: (value: string) => void
  renderHeader: (tk: AssistantToolkit) => ReactNode
  renderContent: (tk: AssistantToolkit) => ReactNode
}

const ToolkitDetailModal = ({
  visible,
  onHide,
  title,
  filteredToolkits,
  selectedIndex,
  onSelectIndex,
  search,
  onSearchChange,
  renderHeader,
  renderContent,
}: ToolkitDetailModalProps) => {
  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header={title}
      hideFooter
      isFullWidth
      bodyClassName="p-0"
    >
      <ToolkitsPanelLayout
        filteredToolkits={filteredToolkits}
        selectedIndex={selectedIndex}
        onSelectIndex={onSelectIndex}
        search={search}
        onSearchChange={onSearchChange}
        renderHeader={renderHeader}
        renderContent={renderContent}
        compact={false}
      />
    </Popup>
  )
}

export default ToolkitDetailModal
