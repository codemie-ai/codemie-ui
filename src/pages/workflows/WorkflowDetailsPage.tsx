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

import { useMemo, useState } from 'react'
import { Panel, Group } from 'react-resizable-panels'
import { useSnapshot } from 'valtio'

import PageLayout from '@/components/Layouts/Layout'
import ResizableSeparator from '@/components/ResizableSeparator/ResizableSeparator'
import { useVueRouter } from '@/hooks/useVueRouter'
import { goBackFromWorkflowExecutions } from '@/pages/workflows/utils/goBackWorkflows'
import { workflowExecutionsStore } from '@/store/workflowExecutions'

import WorkflowExecutionConfiguration from './details/configuration/WorkflowExecutionConfiguration'
import useExecutionResume from './details/hooks/useExecutionResume'
import { ExecutionContext, ExecutionContextValue } from './details/hooks/useExecutionsContext'
import { useExecutionSelection } from './details/hooks/useExecutionSelection'
import { useExecutionStates } from './details/hooks/useExecutionStates'
import { useWorkflowData } from './details/hooks/useWorkflowData'
import useWorkflowExecutionEditor from './details/hooks/useWorkflowExecutionEditor'
import WorkflowDetailsHeader from './details/WorkflowDetailsHeader'
import { MIN_COLLAPSED_SIZE, useWorkflowDrawer } from './details/WorkflowDrawer/useWorkflowDrawer'
import WorkflowDrawer from './details/WorkflowDrawer/WorkflowDrawer'
import WorkflowExecutionEditor from './details/WorkflowExecutionEditor'
import WorkflowExecutionHeader from './details/WorkflowExecutionHeader'
import WorkflowExecutions from './details/WorkflowExecutions/WorkflowExecutions'
import { extendExecutionStates } from '../../utils/workflowEditor/helpers/executions/extendExecutionStates'
import { groupIterationStates } from '../../utils/workflowEditor/helpers/executions/groupIterationStates'

const WorkflowDetailsPage = () => {
  const route = useVueRouter()
  const workflowId = route.params.workflowId as string
  const executionId = (route.params.executionId ?? null) as string | null

  const [isConfigExpanded, setIsConfigExpanded] = useState(false)
  const { execution, executionStates } = useSnapshot(workflowExecutionsStore)
  const {
    panelRef,
    isDrawerExpanded,
    defaultLayout,
    onLayoutChanged,
    handleResize,
    handleDrawerExpandChange,
  } = useWorkflowDrawer()

  useExecutionSelection(workflowId, executionId)
  const { workflow, isLoading: isWorkflowLoading } = useWorkflowData(workflowId, executionId)

  const { state, stateId, setStateId, isExecutionLoading, isExecutionStatesLoading } =
    useExecutionStates({
      workflowId,
      executionId,
      isWorkflowLoading,
    })

  const { editor } = useWorkflowExecutionEditor({ workflow })

  const extendedStates = useMemo(() => {
    return extendExecutionStates(executionStates, editor.config.states)
  }, [executionStates, editor.config.states])

  const groupedStates = useMemo(
    () => groupIterationStates(extendedStates, editor.config.states),
    [extendedStates, editor.config.states]
  )

  const interruptedState = useMemo(() => {
    return execution?.overall_status === 'In Progress' ||
      execution?.overall_status === 'Interrupted'
      ? extendedStates.find((state) => state.status === 'Interrupted')
      : null
  }, [extendedStates, execution])

  const { isResuming, resume, refreshOutputKey, refreshOutput } = useExecutionResume({
    workflowId,
    executionId,
  })

  const ctx: ExecutionContextValue = useMemo(
    () => ({
      isResuming,
      resume,
      refreshOutput,
      workflowId,
      executionId,
      executionStatus: execution?.overall_status ?? null,
      interruptedStateId: interruptedState?.id ?? null,
    }),
    [
      execution?.overall_status,
      isResuming,
      resume,
      refreshOutput,
      workflowId,
      executionId,
      interruptedState?.id,
    ]
  )

  return (
    <ExecutionContext.Provider value={ctx}>
      <PageLayout
        onBack={() => goBackFromWorkflowExecutions({ route, executionId, workflowId })}
        title={workflow?.name}
        isLoading={isWorkflowLoading}
        childrenClassName="px-0"
        rightContent={
          <WorkflowDetailsHeader
            workflow={workflow}
            isConfigExpanded={isConfigExpanded}
            onToggleConfig={() => setIsConfigExpanded((prev) => !prev)}
          />
        }
      >
        <div className="flex h-full">
          <WorkflowExecutions />

          <div className="flex flex-col grow justify-between overflow-hidden">
            <Group
              orientation="vertical"
              defaultLayout={defaultLayout}
              onLayoutChanged={onLayoutChanged}
            >
              <Panel id="workflow-editor" defaultSize={75} minSize={53}>
                <div className="flex flex-col min-h-[53px] h-full">
                  <WorkflowExecutionHeader workflow={workflow} execution={execution} />
                  {workflow && workflow.yaml_config && !isExecutionLoading && (
                    <WorkflowExecutionEditor
                      state={state}
                      workflow={workflow}
                      execution={execution}
                      states={extendedStates}
                    />
                  )}
                </div>
              </Panel>

              <ResizableSeparator orientation="vertical" />

              <Panel
                id="workflow-drawer"
                panelRef={panelRef}
                defaultSize={25}
                minSize={MIN_COLLAPSED_SIZE}
                collapsible={true}
                collapsedSize={MIN_COLLAPSED_SIZE}
                onResize={handleResize}
              >
                <WorkflowDrawer
                  states={groupedStates}
                  expanded={isDrawerExpanded}
                  onExpandedChange={handleDrawerExpandChange}
                  refreshOutputKey={refreshOutputKey}
                  isLoading={isExecutionStatesLoading || isExecutionLoading}
                  state={state}
                  stateId={stateId}
                  executionPrompt={execution?.prompt}
                  onSelectedStateIdChange={setStateId}
                />
              </Panel>
            </Group>
          </div>

          <WorkflowExecutionConfiguration
            isExpanded={isConfigExpanded}
            execution={execution}
            workflow={workflow}
          />
        </div>
      </PageLayout>
    </ExecutionContext.Provider>
  )
}

export default WorkflowDetailsPage
