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

import React, { type ReactNode } from 'react'

import VersionedFieldHistoryTab, {
  VersionedFieldOption,
} from '@/components/form/VersionedField/VersionedFieldHistoryTab'
import Popup from '@/components/Popup'

import {
  VERSION_HISTORY_EMPTY_PLACEHOLDER,
  VERSION_HISTORY_HEADER,
} from './useWorkflowVersionHistorySelection'

export interface WorkflowHistoryPopupShellProps {
  visible: boolean
  onHide: () => void
  options: VersionedFieldOption[]
  selectedOption?: string | null
  onOptionChange: (value: string) => void
  canRestore: boolean
  onRestore: () => void
  banner?: ReactNode
  children: ReactNode
}

const WorkflowHistoryPopupShell: React.FC<WorkflowHistoryPopupShellProps> = ({
  visible,
  onHide,
  options,
  selectedOption,
  onOptionChange,
  canRestore,
  onRestore,
  banner,
  children,
}) => (
  <Popup
    hideFooter
    hideClose={false}
    isFullWidth
    visible={visible}
    onHide={onHide}
    className="h-[90vh] pb-6 flex flex-col overflow-hidden"
    bodyClassName="overflow-hidden flex flex-col min-h-0 h-full"
    header={VERSION_HISTORY_HEADER}
  >
    <div className="flex flex-col gap-3 h-full min-h-0 overflow-hidden pt-2">
      <VersionedFieldHistoryTab
        options={options}
        selectedOption={selectedOption}
        emptyPlaceholder={VERSION_HISTORY_EMPTY_PLACEHOLDER}
        canRestore={canRestore}
        banner={banner}
        onRestore={onRestore}
        onOptionChange={onOptionChange}
      >
        {children}
      </VersionedFieldHistoryTab>
    </div>
  </Popup>
)

export default WorkflowHistoryPopupShell
