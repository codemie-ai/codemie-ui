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

import {
  ExtendedWorkflowExecutionState,
  GroupedWorkflowExecutionState,
  WorkflowExecutionStatus,
} from '@/types/entity'
import { NodeTypes } from '@/types/workflowEditor'

import { extractStateName } from './extractStateName'

type StateConfig = { id: string; next?: { meta_iter_state_id?: string } }
type IterParentMap = Map<string, string>

interface GroupingOptions {
  extractIterationCount?: boolean
}

/**
 * Creates a map of state IDs to their iteration parent IDs
 */
const createIterParentMap = (configStates: StateConfig[]): IterParentMap => {
  const map = new Map<string, string>()
  configStates.forEach((config) => {
    if (config.next?.meta_iter_state_id) {
      map.set(config.id, config.next.meta_iter_state_id)
    }
  })
  return map
}

/**
 * Gets the base name of a state, optionally extracting iteration count
 */
const getBaseName = (stateName: string, shouldExtract: boolean): string => {
  return shouldExtract ? extractStateName(stateName) : stateName
}

/**
 * Collects all consecutive iteration child states that belong to the same iterator parent.
 * Child states keep their original names (with "X of Y" pattern).
 * The pattern is only stripped for config map lookup.
 *
 * @param states - Full array of execution states
 * @param startIndex - Index to start collecting from
 * @param iterParentId - Parent iterator ID to match against
 * @param iterParentMap - Map of state names to their parent iterator IDs
 * @param shouldExtractCount - Whether to strip "X of Y" pattern for lookup
 * @returns Collected items and the next index to process
 */
const collectIterationItems = (
  states: ExtendedWorkflowExecutionState[],
  startIndex: number,
  iterParentId: string,
  iterParentMap: IterParentMap,
  shouldExtractCount: boolean
): { items: ExtendedWorkflowExecutionState[]; nextIndex: number } => {
  const items: ExtendedWorkflowExecutionState[] = []
  let index = startIndex

  while (index < states.length) {
    const currentState = states[index]

    // Strip "X of Y" only for config lookup (e.g., "state_name 1 of 3" -> "state_name")
    const baseName = getBaseName(currentState.name, shouldExtractCount)
    const parentId = iterParentMap.get(baseName)

    // Stop when we reach a state that doesn't belong to this iterator
    if (parentId !== iterParentId) {
      break
    }

    // Keep original state name with iteration count
    items.push(currentState)
    index += 1
  }

  return { items, nextIndex: index }
}

/**
 * Calculates the status of an iterator based on its children's statuses.
 * Uses priority order: Failed > Aborted > Interrupted > In Progress > Succeeded > Not Started
 *
 * @param items - Array of child states from an iteration
 * @returns The calculated status for the iterator parent
 */
const calculateIteratorStatus = (
  items: ExtendedWorkflowExecutionState[]
): WorkflowExecutionStatus => {
  if (items.length === 0) {
    return 'Not Started'
  }

  const statuses = items.map((item) => item.status)

  // Check for failure states first (highest priority)
  if (statuses.includes('Failed')) {
    return 'Failed'
  }

  if (statuses.includes('Aborted')) {
    return 'Aborted'
  }

  if (statuses.includes('Interrupted')) {
    return 'Interrupted'
  }

  // Check for in-progress state
  if (statuses.includes('In Progress')) {
    return 'In Progress'
  }

  // If all succeeded, then succeeded
  if (statuses.every((status) => status === 'Succeeded')) {
    return 'Succeeded'
  }

  // Default to Not Started
  return 'Not Started'
}

/**
 * Creates timing info from iteration items.
 * started_at: Earliest started_at from all children
 * completed_at: completed_at of the child that started latest
 *
 * @param items - Array of child states from an iteration
 * @returns Timing object with started_at and completed_at timestamps
 */
const createTiming = (items: ExtendedWorkflowExecutionState[]) => {
  if (items.length === 0) {
    return {
      started_at: null,
      completed_at: null,
    }
  }

  // Find earliest started_at
  const earliestStartedAt = items.reduce<string | null>((earliest, item) => {
    if (!item.started_at) return earliest
    if (!earliest) return item.started_at
    return item.started_at < earliest ? item.started_at : earliest
  }, null)

  // Find child with latest started_at
  const childWithLatestStart = items.reduce<ExtendedWorkflowExecutionState | null>(
    (latest, item) => {
      if (!item.started_at) return latest
      if (!latest?.started_at) return item
      return item.started_at > latest.started_at ? item : latest
    },
    null
  )

  return {
    started_at: earliestStartedAt,
    completed_at: childWithLatestStart?.completed_at ?? null,
  }
}

/**
 * Creates a parent iteration state with children items.
 * If the parent state doesn't exist in the states array, creates a synthetic one.
 *
 * @param iterParentId - ID of the iterator parent
 * @param items - Array of child states belonging to this iterator
 * @param states - Full array of execution states
 * @param fallbackState - State to use as template if parent doesn't exist
 * @returns Parent state with calculated status, timing, and child items
 */
function createParentIterState(
  iterParentId: string,
  items: ExtendedWorkflowExecutionState[],
  states: ExtendedWorkflowExecutionState[],
  fallbackState: ExtendedWorkflowExecutionState
): GroupedWorkflowExecutionState {
  // Find existing parent state or create a synthetic one
  const parentState = states.find((s) => s.name === iterParentId) || {
    ...fallbackState,
    name: iterParentId,
    id: iterParentId,
    task: null,
    output: null,
    error: null,
    type: NodeTypes.ITERATOR,
    state_id: null,
  }

  // Calculate aggregated timing and status from children
  const timing = createTiming(items)
  const status = calculateIteratorStatus(items)

  const resolvedId = parentState.state_id ?? extractStateName(iterParentId)

  return {
    ...parentState,
    name: iterParentId,
    status,
    started_at: timing.started_at,
    completed_at: timing.completed_at,
    items,
    resolvedId,
  }
}

/**
 * Checks if a state name is used as an iteration parent
 */
const isUsedAsIterParent = (stateName: string, iterParentMap: IterParentMap): boolean => {
  return Array.from(iterParentMap.values()).includes(stateName)
}

/**
 * Groups iteration states under their parent state
 *
 * @param states - Array of extended workflow execution states
 * @param configStates - Array of state configurations with iteration metadata
 * @param options - Configuration options
 * @param options.extractIterationCount - If true, extracts base name from child state names with "state_name X of Y" pattern (default: true)
 * @returns Array of grouped states with iteration states grouped under parent
 */
export const groupIterationStates = (
  states: ExtendedWorkflowExecutionState[],
  configStates: StateConfig[],
  options: GroupingOptions = {}
): GroupedWorkflowExecutionState[] => {
  const { extractIterationCount = true } = options
  const iterParentMap = createIterParentMap(configStates)
  const result: GroupedWorkflowExecutionState[] = []
  let i = 0

  while (i < states.length) {
    const state = states[i]
    const baseStateName = getBaseName(state.name, extractIterationCount)
    const iterParentId = iterParentMap.get(baseStateName)

    if (iterParentId) {
      const { items, nextIndex } = collectIterationItems(
        states,
        i,
        iterParentId,
        iterParentMap,
        extractIterationCount
      )

      const parentState = createParentIterState(iterParentId, items, states, state)
      result.push(parentState)
      i = nextIndex
    } else if (!isUsedAsIterParent(state.name, iterParentMap)) {
      result.push(state)
      i += 1
    } else {
      i += 1
    }
  }

  return result
}
