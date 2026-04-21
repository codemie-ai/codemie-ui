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

import { GroupedWorkflowExecutionState } from '@/types/entity'

import { extractStateName } from './extractStateName'

export type IterationStatsMap = Map<
  string,
  {
    success: number
    failures: number
  }
>

/**
 * Maps state names to their success/failure counts across all iterations.
 * Aggregates counts across all iterator instances with the same child state name.
 *
 * @param states - Array of grouped workflow execution states
 * @returns Map where keys are child state names and values are aggregated success/failure counts
 */
export const buildIterationStatsMap = (
  states: GroupedWorkflowExecutionState[]
): IterationStatsMap => {
  const map: IterationStatsMap = new Map()

  states?.forEach((state) => {
    if (state.items && state.items.length > 0) {
      // Count successes and failures for each child state
      state.items.forEach((item) => {
        // Strip "X of Y" pattern to get base name (e.g., "state_name 1 of 3" -> "state_name")
        const baseName = extractStateName(item.name)
        const current = map.get(baseName) || { success: 0, failures: 0 }

        // Increment success or failure counter
        if (item.status === 'Succeeded') {
          current.success += 1
        } else if (
          item.status === 'Failed' ||
          item.status === 'Aborted' ||
          item.status === 'Interrupted'
        ) {
          current.failures += 1
        }

        map.set(baseName, current)
      })
    }
  })

  return map
}

export type IterationSummariesMap = Map<string, number>

/**
 * Builds a map of iterator state names to their item counts.
 * Each iterator instance is mapped separately using the state name as the key.
 * When there are multiple instances of the same iterator (detected by non-iterator states between them),
 * each instance gets its own entry with an indexed name.
 *
 * @param states - Array of grouped workflow execution states
 * @returns Map where keys are state names and values are item counts for that specific instance
 *
 * @example
 * // Single instance: "iterator_1" -> 4
 * // Multiple instances: "iterator_1_0" -> 4, "iterator_1_1" -> 3
 */
export const buildIterationSummariesMap = (
  states: GroupedWorkflowExecutionState[]
): IterationSummariesMap => {
  const map: IterationSummariesMap = new Map()

  // First pass: count total occurrences of each iterator name
  const iteratorCounts = new Map<string, number>()
  states.forEach((state) => {
    if (state.items && state.items.length > 0) {
      const count = iteratorCounts.get(state.name) || 0
      iteratorCounts.set(state.name, count + 1)
    }
  })

  // Second pass: build the map with indexed keys for multiple instances
  const iteratorIndexes = new Map<string, number>()

  states.forEach((state) => {
    if (state.items && state.items.length > 0) {
      const baseName = state.name
      const itemCount = state.items.length
      const totalOccurrences = iteratorCounts.get(baseName) || 0

      // If there are multiple occurrences, use indexed names for all instances
      if (totalOccurrences > 1) {
        const currentIndex = iteratorIndexes.get(baseName) || 0
        iteratorIndexes.set(baseName, currentIndex + 1)
        map.set(`${baseName}_${currentIndex}`, itemCount)
      } else {
        // Single occurrence, use name as-is
        map.set(baseName, itemCount)
      }
    }
  })

  return map
}
