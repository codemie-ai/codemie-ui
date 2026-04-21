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

import WorkflowNodeEditor from '@/pages/workflows/editor/WorkflowEditor'
import {
  ExtendedWorkflowExecutionState,
  Workflow,
  WorkflowExecution,
  WorkflowExecutionState,
} from '@/types/entity'
import { START_NODE_ID } from '@/utils/workflowEditor/constants'
import { extractStateName } from '@/utils/workflowEditor/helpers/executions/extractStateName'

interface WorkflowExecutionEditorProps {
  workflow: Workflow
  execution: WorkflowExecution | null
  state?: WorkflowExecutionState
  states: ExtendedWorkflowExecutionState[]
}

const WorkflowExecutionEditor = ({
  workflow,
  execution,
  state,
  states,
}: WorkflowExecutionEditorProps) => {
  let activeStateId: string | null = START_NODE_ID

  if (state) {
    if (state.state_id !== undefined) {
      activeStateId = state.state_id
    } else {
      activeStateId = extractStateName(state.name) ?? START_NODE_ID
    }
  }

  if (!workflow || !workflow.yaml_config) return null

  const executionEnabled = !!execution && (!states?.[0] || states[0].state_id !== null)

  return (
    <WorkflowNodeEditor
      className="h-auto grow border-none rounded-none"
      workflow={workflow}
      yamlConfig={workflow.yaml_config}
      isFullscreen={false}
      onConfigurationUpdate={() => {}}
      withDocs={false}
      executionEnabled={executionEnabled}
      executionStates={states}
      executionActiveStateId={activeStateId}
      executionOverallStatus={execution?.overall_status}
    />
  )
}

export default WorkflowExecutionEditor
