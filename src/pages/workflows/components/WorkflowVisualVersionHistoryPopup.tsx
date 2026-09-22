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

import React, { type ReactNode, useMemo } from 'react'

import { WorkflowConfigHistoryItem } from '@/types/entity/workflow'
import {
  type VisualDiffCanvasFailureReason,
  prepareVisualDiffCanvas,
} from '@/utils/workflowEditor/prepareVisualDiffCanvas'

import { useWorkflowVersionHistorySelection } from './useWorkflowVersionHistorySelection'
import WorkflowHistoryPopupShell from './WorkflowHistoryPopupShell'
import WorkflowVisualDiffView from './WorkflowVisualDiffView'
import DiffLegend from '../editor/nodes/DiffLegend'

export interface WorkflowVisualVersionHistoryPopupProps {
  visible: boolean
  canWrite: boolean
  currentEditorYaml: string
  history: WorkflowConfigHistoryItem[]
  onHide: () => void
  onRestore: (yamlConfig: string) => void
}

const VISUAL_DIFF_FAILURE_COPY: Record<VisualDiffCanvasFailureReason, string> = {
  'selected-parse': 'Could not parse the selected version YAML',
  'selected-empty': 'Selected version YAML is empty',
  'editor-parse': 'Could not parse the current editor YAML',
  'editor-empty': 'Current editor YAML is empty',
  graph: 'Could not build the visual graph',
}

const WorkflowVisualVersionHistoryPopup: React.FC<WorkflowVisualVersionHistoryPopupProps> = ({
  visible,
  canWrite,
  currentEditorYaml,
  history,
  onHide,
  onRestore,
}) => {
  const { options, selectedValue, setSelectedValue, selectedEntry } =
    useWorkflowVersionHistorySelection(visible, history)

  const prepared = useMemo(() => {
    if (!selectedEntry) return null
    return prepareVisualDiffCanvas(selectedEntry.yaml_config ?? '', currentEditorYaml)
  }, [selectedEntry, currentEditorYaml])

  let diffContent: ReactNode = null
  let banner: ReactNode = null

  if (prepared?.ok) {
    banner = <DiffLegend />
    diffContent = (
      <div className="relative min-h-0 flex-1">
        <WorkflowVisualDiffView
          key={`visual-${selectedValue}`}
          nodes={prepared.nodes}
          edges={prepared.edges}
          statusById={prepared.statusById}
          isActive={visible}
        />
      </div>
    )
  } else if (prepared) {
    diffContent = (
      <div className="flex items-center justify-center grow min-h-0 px-8 py-6">
        <p className="text-sm text-text-quaternary text-center">
          {VISUAL_DIFF_FAILURE_COPY[prepared.failure]}
        </p>
      </div>
    )
  }

  return (
    <WorkflowHistoryPopupShell
      visible={visible}
      onHide={onHide}
      options={options}
      selectedOption={selectedValue}
      onOptionChange={(value) => {
        if (!value || value === selectedValue) return
        setSelectedValue(value)
      }}
      canRestore={canWrite && selectedEntry?.yaml_config != null}
      banner={banner}
      onRestore={() => {
        if (selectedEntry?.yaml_config != null) {
          onRestore(selectedEntry.yaml_config)
        }
      }}
    >
      {diffContent}
    </WorkflowHistoryPopupShell>
  )
}

export default WorkflowVisualVersionHistoryPopup
