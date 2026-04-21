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

import { useMemo } from 'react'

import { GroupedWorkflowExecutionState } from '@/types/entity'
import { NodeTypes } from '@/types/workflowEditor'
import { buildIterationSummariesMap } from '@/utils/workflowEditor/helpers/executions/buildIterationMaps'

import WorkflowDrawerListItem from './WorkflowDrawerListItem'

interface WorkflowDrawerListProps {
  states: GroupedWorkflowExecutionState[]
  stateId: string | null
  onSelectedStateIdChange: (stateId: string) => void
}

const WorkflowDrawerList = ({
  states,
  stateId,
  onSelectedStateIdChange,
}: WorkflowDrawerListProps) => {
  const iteratorSummaries = useMemo(() => {
    return states ? buildIterationSummariesMap(states) : null
  }, [states])

  // Track iterator name occurrences to match indexed keys from buildIterationSummariesMap
  const iteratorOccurrences = useMemo(() => {
    const counts = new Map<string, number>()
    states.forEach((state) => {
      if (state.items && state.items.length > 0) {
        const count = counts.get(state.name) || 0
        counts.set(state.name, count + 1)
      }
    })
    return counts
  }, [states])

  return (
    <div className="flex flex-col gap-1 py-4 pr-4 max-w-sm w-full overflow-y-scroll hide-scrollbar shrink-0">
      <WorkflowDrawerListItem
        id="start"
        name="Starting Prompt"
        type={NodeTypes.START}
        stateId={stateId}
        onClick={onSelectedStateIdChange}
      />

      {(() => {
        const iteratorIndexes = new Map<string, number>()
        return states.map((state) => {
          let iteratorSummary: number | undefined

          if (state.items && state.items.length > 0) {
            const totalOccurrences = iteratorOccurrences.get(state.name) || 0
            if (totalOccurrences > 1) {
              const currentIndex = iteratorIndexes.get(state.name) || 0
              iteratorIndexes.set(state.name, currentIndex + 1)
              iteratorSummary = iteratorSummaries?.get(`${state.name}_${currentIndex}`)
            } else {
              iteratorSummary = iteratorSummaries?.get(state.name)
            }
          }

          return (
            <WorkflowDrawerListItem
              key={state.id}
              id={state.id}
              name={`${state.name}${
                state.type === NodeTypes.ITERATOR && iteratorSummary
                  ? ` (${iteratorSummary} item${iteratorSummary > 1 ? 's' : ''})`
                  : ''
              }`}
              type={state.type ?? NodeTypes.ASSISTANT}
              status={state.status}
              startedAt={state.started_at}
              completedAt={state.completed_at}
              stateId={stateId}
              onClick={onSelectedStateIdChange}
              items={state.items}
            />
          )
        })
      })()}
    </div>
  )
}

export default WorkflowDrawerList
