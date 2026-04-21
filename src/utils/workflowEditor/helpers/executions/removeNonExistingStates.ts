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

import type { ExtendedWorkflowExecutionState } from '@/types/entity/workflow'
import type { StateConfiguration } from '@/types/workflowEditor/configuration'

import { END_NODE_ID, START_NODE_ID } from '../../constants'

export const removeNonExistingStates = (
  executionStates: ExtendedWorkflowExecutionState[],
  configStates: StateConfiguration[]
): ExtendedWorkflowExecutionState[] => {
  // Step 1: Set of valid state_ids from the configuration
  // Include special nodes ('start' and 'end') that are not in config but exist in the workflow
  const validStateIds = new Set([...configStates.map((s) => s.id), START_NODE_ID, END_NODE_ID])

  // Step 2: Map execution states by resolvedId to easily traverse the chain
  const executionStateMap = new Map<string, ExtendedWorkflowExecutionState[]>()
  for (const state of executionStates) {
    const existing = executionStateMap.get(state.resolvedId) || []
    existing.push(state)
    executionStateMap.set(state.resolvedId, existing)
  }

  // Step 3: Helper function to traverse up until a valid state is found (for a single ID)
  const getValidPreceding = (
    precedingId: string | null,
    visited = new Set<string>()
    // eslint-disable-next-line sonarjs/cognitive-complexity
  ): string | null => {
    if (!precedingId) return null
    if (validStateIds.has(precedingId)) return precedingId
    if (visited.has(precedingId)) return null

    // Mark as visited to prevent infinite loops
    visited.add(precedingId)

    // Look up the execution states to find what it was pointing to
    // Try all instances of this state ID (handles duplicates)
    const stateObjs = executionStateMap.get(precedingId)

    // If the invalid state isn't even in our execution logs, the chain is broken
    if (!stateObjs || stateObjs.length === 0) return null

    for (const stateObj of stateObjs) {
      const nextPreceding = stateObj.preceding_state_ids

      if (!nextPreceding || nextPreceding.length === 0) continue

      // Try each predecessor to find a valid path
      for (const nextId of nextPreceding) {
        if (nextId === precedingId) continue // Skip self-references

        // Try this path
        const result = getValidPreceding(nextId, new Set(visited))
        if (result) return result
      }
    }

    // No valid path found through any instance of this state
    return null
  }

  // Step 4: Helper function to process preceding_state_ids
  const processPreceding = (precedingStateIds: string[] | null): string[] | null => {
    if (!precedingStateIds || precedingStateIds.length === 0) return null

    const validIds = precedingStateIds
      .map((id) => getValidPreceding(id))
      .filter((id): id is string => id !== null)

    const uniqueIds = [...new Set(validIds)]

    return uniqueIds.length > 0 ? uniqueIds : null
  }

  // Step 5: Filter out invalid execution states and update the preceding IDs
  return executionStates
    .filter((s) => validStateIds.has(s.resolvedId))
    .map((s) => ({
      ...s,
      preceding_state_ids: processPreceding(s.preceding_state_ids),
    }))
}
