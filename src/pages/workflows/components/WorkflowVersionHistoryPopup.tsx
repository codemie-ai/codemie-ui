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

import VersionHistoryDiffView from '@/components/form/VersionedField/VersionHistoryDiffView'
import { WorkflowConfigHistoryItem } from '@/types/entity/workflow'
import { createdBy, formatDateTime } from '@/utils/helpers'

import { useWorkflowVersionHistorySelection } from './useWorkflowVersionHistorySelection'
import WorkflowHistoryPopupShell from './WorkflowHistoryPopupShell'

export interface WorkflowVersionHistoryPopupProps {
  visible: boolean
  canWrite: boolean
  currentEditorYaml: string
  history: WorkflowConfigHistoryItem[]
  onHide: () => void
  onRestore: (yamlConfig: string) => void
}

const WorkflowVersionHistoryPopup: React.FC<WorkflowVersionHistoryPopupProps> = ({
  visible,
  canWrite,
  currentEditorYaml,
  history,
  onHide,
  onRestore,
}) => {
  const {
    options,
    selectedValue,
    setSelectedValue,
    selectedIndex,
    selectedEntry,
    previousEntry,
    optionValue,
  } = useWorkflowVersionHistorySelection(visible, history)

  const title = selectedEntry
    ? `${formatDateTime(selectedEntry.date, 'short')} — ${createdBy(selectedEntry.created_by)}`
    : ''

  let diffContent: ReactNode = null
  if (selectedEntry) {
    diffContent = (
      <VersionHistoryDiffView
        key={optionValue(selectedEntry, selectedIndex)}
        historyText={selectedEntry.yaml_config ?? ''}
        currentText={currentEditorYaml}
        previousHistoryText={previousEntry?.yaml_config}
        title={title}
      />
    )
  }

  return (
    <WorkflowHistoryPopupShell
      visible={visible}
      onHide={onHide}
      options={options}
      selectedOption={selectedValue}
      onOptionChange={(value) => setSelectedValue(value)}
      canRestore={canWrite && selectedEntry?.yaml_config != null}
      onRestore={() => {
        if (selectedEntry?.yaml_config != null) onRestore(selectedEntry.yaml_config)
      }}
    >
      {diffContent}
    </WorkflowHistoryPopupShell>
  )
}

export default WorkflowVersionHistoryPopup
