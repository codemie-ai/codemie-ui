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

import { useEffect, useMemo, useState } from 'react'

import ExpandSvg from '@/assets/icons/expand.svg?react'
import Button from '@/components/Button'
import CodeBlock from '@/components/CodeBlock'
import Markdown from '@/components/markdown/Markdown'
import TextBlock from '@/components/markdown/TextBlock'
import Popup from '@/components/Popup'
import Tabs from '@/components/Tabs'
import { Tab } from '@/components/Tabs/Tabs'
import { workflowExecutionsStore } from '@/store/workflowExecutions'

import useExecutionsContext from '../../hooks/useExecutionsContext'

interface WorkflowStateOutputProps {
  stateId: string
  stateName?: string
  stateUpdatedDate: string
  stateCompletedDate: string
  refreshKey: number
}

const WorkflowStateOutput = ({
  stateId,
  stateName,
  stateUpdatedDate,
  stateCompletedDate,
  refreshKey,
}: WorkflowStateOutputProps) => {
  const { workflowId, executionId } = useExecutionsContext()
  const [output, setOutput] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const getStateOutput = async () => {
      if (!workflowId || !executionId) return
      const result = await workflowExecutionsStore.getWorkflowExecutionStateOutput(
        workflowId,
        executionId,
        stateId
      )
      setOutput(result ?? '')
    }

    getStateOutput()
  }, [stateId, workflowId, executionId, stateUpdatedDate, stateCompletedDate, refreshKey])

  const handleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const expandButton = (
    <Button
      variant="secondary"
      className="!px-2"
      data-tooltip-id="react-tooltip"
      data-tooltip-content="Expand"
      onClick={handleExpand}
    >
      <ExpandSvg className="size-4" />
    </Button>
  )

  const tabs = useMemo<Tab<'raw' | 'preview'>[]>(
    () => [
      {
        id: 'raw',
        label: 'Raw',
        element: (
          <div className="bg-surface-base-secondary p-4 rounded-lg border border-border-structural w-full">
            <TextBlock text={output} />
          </div>
        ),
      },
      {
        id: 'preview',
        label: 'Markdown',
        element: (
          <div className="bg-surface-base-secondary w-full">
            <Markdown content={output} />
          </div>
        ),
      },
    ],
    [output]
  )

  const header = `Execution State Output${stateName ? ` for ${stateName}` : ''}`

  return (
    <div className="overflow-y-auto min-h-0 hide-scrollbar">
      <CodeBlock
        headerActionsLast
        title="Result"
        language="txt"
        downloadFilename="output"
        text={output}
        headerActionsTemplate={expandButton}
      />

      <Popup
        hideFooter
        header={header}
        visible={isExpanded}
        onHide={handleExpand}
        cancelText="Close"
        withBorder={false}
        className="max-w-4xl w-full"
        bodyClassName="pt-1 pb-4"
      >
        <Tabs tabs={tabs} />
      </Popup>
    </div>
  )
}

export default WorkflowStateOutput
