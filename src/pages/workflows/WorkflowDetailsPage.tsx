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

import { useCallback, useMemo, useState } from 'react'
import { Panel, Group } from 'react-resizable-panels'
import { useSnapshot } from 'valtio'

import PageLayout from '@/components/Layouts/Layout'
import ResizableSeparator from '@/components/ResizableSeparator/ResizableSeparator'
import { useAuthCallbackListener } from '@/hooks/useAuthCallbackListener'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useVueRouter } from '@/hooks/useVueRouter'
import { goBackFromWorkflowExecutions } from '@/pages/workflows/utils/goBackWorkflows'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { AssistantStateConfiguration } from '@/types/workflowEditor/configuration'

import AssistantNodePanel from './details/AssistantNodePanel'
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
  const trackedAuthConfigIds = useMemo(() => {
    if (execution?.overall_status !== 'AUTHENTICATION_REQUIRED' || !execution.output) return []

    try {
      const parsedOutput = JSON.parse(execution.output) as { auth_config_id?: string }
      return parsedOutput.auth_config_id ? [parsedOutput.auth_config_id] : []
    } catch {
      return []
    }
  }, [execution?.overall_status, execution?.output])

  useAuthCallbackListener({ trackedAuthConfigIds })
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

  // Keyed by node id — not assistant id — so two nodes backed by the same assistant
  // toggle independently.
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const getNodeAssistantId = useCallback(
    (nodeId: string): string | null => {
      const stateCfg = editor.config.states?.find((s) => s.id === nodeId) as
        | AssistantStateConfiguration
        | undefined
      // Only assistant nodes resolve to an actor with a persisted assistant_id; tool/custom
      // nodes and inline assistants (no standalone id) are out of scope and open nothing.
      const actor = editor.config.assistants?.find((a) => a.id === stateCfg?.assistant_id)
      return actor?.assistant_id ?? null
    },
    [editor.config]
  )

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!getNodeAssistantId(nodeId)) return

      // Separate from the bottom drawer's stateId selection, so the two don't conflict.
      setSelectedNodeId((current) => (current === nodeId ? null : nodeId))
    },
    [getNodeAssistantId]
  )

  const selectedAssistantId = selectedNodeId ? getNodeAssistantId(selectedNodeId) : null

  const highlightedNodeIds = useMemo(() => {
    if (!selectedAssistantId) return []
    return (editor.config.states ?? [])
      .filter((s) => getNodeAssistantId(s.id) === selectedAssistantId)
      .map((s) => s.id)
  }, [selectedAssistantId, editor.config.states, getNodeAssistantId])

  useEscapeKey(() => setSelectedNodeId(null), !!selectedNodeId)

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

  const { isResuming, resume, resumeWithMessage, refreshOutputKey, refreshOutput } =
    useExecutionResume({
      workflowId,
      executionId,
    })

  const ctx: ExecutionContextValue = useMemo(
    () => ({
      isResuming,
      resume,
      resumeWithMessage,
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
      resumeWithMessage,
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
                      onNodeClick={handleNodeClick}
                      highlightedNodeIds={highlightedNodeIds}
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

          {selectedAssistantId && (
            <AssistantNodePanel
              // Remount per node so switching nodes never flashes the previous node's
              // (stale) assistant while the new one loads.
              key={selectedNodeId}
              assistantId={selectedAssistantId}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </div>
      </PageLayout>
    </ExecutionContext.Provider>
  )
}

export default WorkflowDetailsPage
