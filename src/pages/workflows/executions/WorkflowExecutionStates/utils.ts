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

import yaml from 'js-yaml'

import { WorkflowExecutionState } from '@/types/entity/workflow'
import { NextState } from '@/types/workflowEditor/configuration'
import { SerializedWorkflowConfig } from '@/utils/workflowEditor/serialization/types'

const getNextStateIds = (next: NextState | undefined): string[] => {
  if (!next) return []

  const ids: string[] = []

  if (next.state_id) ids.push(next.state_id)
  if (next.state_ids) ids.push(...next.state_ids)
  if (next.condition) {
    if (next.condition.then) ids.push(next.condition.then)
    if (next.condition.otherwise) ids.push(next.condition.otherwise)
  }
  if (next.switch) {
    next.switch.cases.forEach((c) => ids.push(c.state_id))
    if (next.switch.default) ids.push(next.switch.default)
  }

  return ids
}

/**
 * Returns the ID of the last interruptible execution state, determined by:
 * 1. Parsing the workflow YAML config to find states with interrupt_before: true
 * 2. Finding predecessor states whose next child has interrupt_before: true
 * 3. Sorting the provided execution states by completed_at date descending
 * 4. Returning the ID of the most recent state matching a predecessor
 */
export const getLastInterruptibleStateId = (
  states: WorkflowExecutionState[],
  yamlConfig: string | undefined
): string | undefined => {
  let result: string | undefined

  if (yamlConfig && states.length) {
    try {
      const parsed = yaml.load(yamlConfig) as SerializedWorkflowConfig
      const configStates = parsed.states ?? []

      const interruptedStateIds = new Set(
        configStates.filter((s) => s.interrupt_before).map((s) => s.id)
      )

      const predecessorStateIds = new Set(
        configStates
          .filter((s) => getNextStateIds(s.next).some((id) => interruptedStateIds.has(id)))
          .map((s) => s.id)
      )

      result = [...states]
        .sort((a, b) => {
          const aDate = a.completed_at ? new Date(a.completed_at).getTime() : 0
          const bDate = b.completed_at ? new Date(b.completed_at).getTime() : 0
          return bDate - aDate
        })
        .find((s) => predecessorStateIds.has(s.name))?.id
    } catch {
      // result remains undefined on parse error
    }
  }

  return result
}
