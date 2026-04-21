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

import { Panel, Group } from 'react-resizable-panels'

import ResizableSeparator from '@/components/ResizableSeparator/ResizableSeparator'

import WorkflowStateInput from './WorkflowStateInput'
import WorkflowStateOutput from './WorkflowStateOutput'
import useExecutionsContext from '../../hooks/useExecutionsContext'

interface WorkflowDrawerStateProps {
  stateName?: string
  stateId?: string
  input: string
  showOutput: boolean
  stateUpdatedDate: string
  stateCompletedDate: string
  refreshKey: number
}

const WorkflowDrawerState = ({
  stateId,
  stateName,
  input,
  showOutput,
  stateUpdatedDate,
  stateCompletedDate,
  refreshKey,
}: WorkflowDrawerStateProps) => {
  const { executionId } = useExecutionsContext()

  if (!executionId) return null

  return (
    <div className="gap-4 pl-2 w-full flex overflow-hidden min-w-0">
      {!showOutput && <WorkflowStateInput text={input} className="py-4" />}
      {showOutput && (
        <Group orientation="horizontal" className="shrink min-w-0">
          <Panel defaultSize={50} minSize={250} className="pr-2 py-4">
            <WorkflowStateInput text={input} />
          </Panel>

          <ResizableSeparator orientation="horizontal" />

          <Panel defaultSize={50} minSize={250} className="px-2 py-4">
            {showOutput && stateId && (
              <WorkflowStateOutput
                stateId={stateId}
                stateName={stateName}
                stateUpdatedDate={stateUpdatedDate}
                stateCompletedDate={stateCompletedDate}
                refreshKey={refreshKey}
              />
            )}
          </Panel>
        </Group>
      )}
    </div>
  )
}

export default WorkflowDrawerState
