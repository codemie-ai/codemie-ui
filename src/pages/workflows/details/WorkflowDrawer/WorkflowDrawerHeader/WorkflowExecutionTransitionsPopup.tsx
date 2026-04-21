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

import { FC, useEffect, useState } from 'react'

import CodeBlock from '@/components/CodeBlock'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import Tabs from '@/components/Tabs'
import { Tab } from '@/components/Tabs/Tabs'
import TextDiffView from '@/components/TextDiffView'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { WorkflowTransition } from '@/types/entity/workflow'

interface WorkflowExecutionTransitionsPopupProps {
  visible: boolean
  workflowId: string
  executionId: string
  stateId: string
  stateName: string
  onHide: () => void
}

const WorkflowExecutionTransitionsPopup: FC<WorkflowExecutionTransitionsPopupProps> = ({
  visible,
  workflowId,
  executionId,
  stateId,
  stateName,
  onHide,
}) => {
  const [transitionFrom, setTransitionFrom] = useState<WorkflowTransition | null>(null)
  const [transitionTo, setTransitionTo] = useState<WorkflowTransition | null>(null)
  const [activeTab, setActiveTab] = useState<'diff' | 'json'>('diff')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) {
      setTransitionFrom(null)
      setTransitionTo(null)
      setError(null)
      setActiveTab('diff')
      return
    }

    const fetchTransitions = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [fromResult, toResult] = await Promise.all([
          workflowExecutionsStore
            .getExecutionTransitionsFromState(workflowId, executionId, stateId, {
              skipErrors: true,
            })
            .catch(() => null),
          workflowExecutionsStore
            .getExecutionTransitionsToState(workflowId, executionId, stateId, { skipErrors: true })
            .catch(() => null),
        ])

        setTransitionFrom(fromResult)
        setTransitionTo(toResult)

        if (!fromResult && !toResult) {
          setError('No transition data available for this state.')
        }
      } catch (err) {
        console.error('Error fetching transitions:', err)
        setError('Unable to load transition data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransitions()
  }, [visible, workflowId, executionId, stateId])

  const header = `State transition for ${stateName}`

  const formatContext = (context: Record<string, unknown> | null): string => {
    if (!context) return '{}'
    return JSON.stringify(context, null, 2)
  }

  const beforeContext = formatContext(transitionTo?.workflow_context ?? null)
  const afterContext = formatContext(transitionFrom?.workflow_context ?? null)

  const InfoMessage = ({ message }: { message: string }) => (
    <div className="flex gap-2 mb-4 py-3 px-4 bg-surface-base-chat rounded-lg border border-border-structural">
      <p className="text-xs text-text-secondary">{message}</p>
    </div>
  )

  const renderDiffTab = () => {
    if (!transitionTo && !transitionFrom) {
      return (
        <div className="text-center py-8 text-text-quaternary">
          No transition data available for this state.
        </div>
      )
    }

    if (!transitionTo) {
      return (
        <>
          <InfoMessage message="This is the first state in the execution. No previous context available." />
          <TextDiffView
            oldText="{}"
            newText={afterContext}
            oldLabel="Before State (Empty)"
            newLabel="After State"
          />
        </>
      )
    }

    if (!transitionFrom) {
      return (
        <>
          <InfoMessage message="This is a terminal state. No outgoing transition available." />
          <TextDiffView
            oldText={beforeContext}
            newText="{}"
            oldLabel="Before State"
            newLabel="After State (Terminal)"
          />
        </>
      )
    }

    return (
      <TextDiffView
        oldText={beforeContext}
        newText={afterContext}
        oldLabel="Before State"
        newLabel="After State"
      />
    )
  }

  const renderJsonTab = () => {
    if (!transitionTo && !transitionFrom) {
      return (
        <div className="text-center py-8 text-text-quaternary">
          No transition data available for this state.
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2 text-text-secondary">
            {!transitionTo ? 'Before Context (Empty)' : 'Before Context'}
          </h3>
          <CodeBlock language="json" text={beforeContext} />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2 text-text-secondary">
            {!transitionFrom ? 'After Context (Terminal)' : 'After Context'}
          </h3>
          <CodeBlock language="json" text={afterContext} />
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Spinner inline />
        </div>
      )
    }

    if (error) {
      return <div className="text-center py-8 text-text-quaternary">{error}</div>
    }

    const tabs: Tab<'diff' | 'json'>[] = [
      {
        id: 'diff',
        label: 'Diff',
        element: renderDiffTab(),
      },
      {
        id: 'json',
        label: 'JSON',
        element: renderJsonTab(),
      },
    ]

    return <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} alwaysShowTabs />
  }

  return (
    <Popup
      className="h-full"
      bodyClassName="min-w-[60rem] max-w-6xl"
      visible={visible}
      header={header}
      onHide={onHide}
      hideFooter
    >
      <div className="flex flex-col gap-4 pb-6">{renderContent()}</div>
    </Popup>
  )
}

export default WorkflowExecutionTransitionsPopup
