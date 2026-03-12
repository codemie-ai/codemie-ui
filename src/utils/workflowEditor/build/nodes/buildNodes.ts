/**
 * Node Builders Module
 *
 * Provides functions to build different types of workflow nodes.
 * Handles node type detection, positioning, and data mapping.
 * Uses recursive traversal to build nodes in logical flow order,
 * with standalone nodes added last.
 */

import { WorkflowNode } from '@/types/workflowEditor/base'
import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'
import { START_NODE_ID, END_NODE_ID } from '@/utils/workflowEditor/constants'
import { findConnectedEntryState } from '@/utils/workflowEditor/helpers/connections'
import {
  findChildren,
  isConnected,
  getStateNext,
  hasConditionLogic,
  hasSwitchLogic,
  hasMultipleNextStates,
  isIterator,
  isMetaState
} from '@/utils/workflowEditor/helpers/states'

import { buildOrAdjustIteratorNode } from './buildIteratorNode'
import { LAYOUT } from '../constants'

/**
 * Build context passed through recursive node building
 */
interface BuildContext {
  statesMap: Map<string, StateConfiguration>
  visited: Set<string>
  nodes: WorkflowNode[]
  config: WorkflowConfiguration
}

/**
 * Finds a meta state (condition/switch node) by ID
 * Returns null if not found and logs warning
 */
const findMetaState = (
  metaStateId: string | undefined,
  config: WorkflowConfiguration
): StateConfiguration | null => {
  if (!metaStateId) return null

  const state = config.states?.find(s => s.id === metaStateId)

  if (!state) {
    console.warn(`Meta state not found: ${metaStateId}`)
    return null
  }

  return state
}

/**
 * Recursively builds child nodes that haven't been visited yet
 */
const buildChildNodes = (
  childIds: string[],
  context: BuildContext
): void => {
  for (const childId of childIds) {
    if (!context.visited.has(childId)) {
      buildNodeRecursively(childId, context)
    }
  }
}

/**
 * Separates states into connected and orphaned categories
 */
const categorizeStates = (
  states: StateConfiguration[]
): { connected: StateConfiguration[], orphaned: StateConfiguration[] } => {
  const connected = states.filter(isConnected)
  const orphaned = states.filter(state => !isConnected(state) && !isIterator(state))

  return { connected, orphaned }
}

/**
 * Builds a single WorkflowNode from state configuration
 * Uses saved position from _meta or default position
 */
const buildNode = (
  state: StateConfiguration,
  nodes: WorkflowNode[],
  config: WorkflowConfiguration
): WorkflowNode => {
  const node: WorkflowNode = {
    id: state.id,
    type: state._meta?.type,
    data: {}, // Empty because required by ReactFlow
    position: state._meta?.position || { x: LAYOUT.DEFAULT_NODE_POSITION.X, y: LAYOUT.DEFAULT_NODE_POSITION.Y },
    selected: state._meta?.selected,
    measured: state._meta?.measured,
    deletable: state.id !== START_NODE_ID && state.id !== END_NODE_ID,
  } as WorkflowNode

  if (state._meta?.measured) {
    node.width = state._meta.measured.width
    node.height = state._meta.measured.height
  }

  if (!isMetaState(state) && state.next?.meta_iter_state_id ) {
    node.parentId = state.next.meta_iter_state_id

    buildOrAdjustIteratorNode(
      state.next.meta_iter_state_id,
      config,
      nodes,
      node
    )
  }

  return node
}


const buildConditionNode = (
  parentState: StateConfiguration,
  context: BuildContext
): void => {
  const state = findMetaState(
    parentState.next?.meta_next_state_id,
    context.config
  )
  if (!state) return

  const next = getStateNext(state)
  if (!next?.condition) return

  const { then, otherwise } = next.condition

  context.nodes.push(buildNode(state, context.nodes, context.config))

  buildChildNodes([then, otherwise].filter(Boolean), context)
}

const buildMultipleNextStates = (
  parentState: StateConfiguration,
  context: BuildContext
): void => {
  const next = getStateNext(parentState)
  if (!next?.state_ids) return

  buildChildNodes(next.state_ids, context)
}

const buildSwitchNode = (
  parentState: StateConfiguration,
  context: BuildContext
): void => {
  const state = findMetaState(
    parentState.next?.meta_next_state_id,
    context.config
  )
  if (!state) return

  const next = getStateNext(state)
  if (!next?.switch) return

  const { cases, default: defaultStateID } = next.switch

  context.nodes.push(buildNode(state, context.nodes, context.config))

  const childIds = [
    ...cases.map(c => c.state_id),
    defaultStateID
  ].filter(Boolean)

  buildChildNodes(childIds, context)
}

/**
 * Recursively builds nodes by following the graph structure
 */
const buildNodeRecursively = (
  stateId: string,
  context: BuildContext
): void => {
  if (stateId === END_NODE_ID) {
    const endNodeExists = context.nodes.find(node => node.id === END_NODE_ID)
    if (!endNodeExists) {
      buildEndNode(context.nodes, context.config)
    }
    return
  }

  if (context.visited.has(stateId) || !context.statesMap.has(stateId)) {
    return
  }

  const state = context.statesMap.get(stateId)!
  context.visited.add(stateId)

  context.nodes.push(buildNode(state, context.nodes, context.config))

  if (hasConditionLogic(state)) {
    buildConditionNode(state, context)
    return
  }

  if (hasSwitchLogic(state)) {
    buildSwitchNode(state, context)
    return
  }

  if (hasMultipleNextStates(state)) {
    buildMultipleNextStates(state, context)
    return
  }

  const nextStateIds = findChildren(state)
  buildChildNodes(nextStateIds, context)
}


/**
 * Builds all state nodes using recursive traversal from connected entry state
 */
const buildStateNodes = (
  states: StateConfiguration[],
  config: WorkflowConfiguration
): WorkflowNode[] => {
  if (!states.length) return []

  const nodes: WorkflowNode[] = []
  const context: BuildContext = {
    statesMap: new Map(states.map(state => [state.id, state])),
    visited: new Set<string>(),
    nodes,
    config
  }

  const entryState = findConnectedEntryState(states)

  if (entryState) {
    buildNodeRecursively(entryState.id, context)
  }

  return nodes
}

// Builds the start node (workflow entry point)
const buildStartNode = (nodes: WorkflowNode[], config: WorkflowConfiguration): void => {
  const state = config.states?.find(state => state.id === START_NODE_ID)

  if (!state) {
    console.warn('Start node state not found')
    return
  }

  nodes.push(buildNode(state, nodes, config))
}

// Builds the end node (workflow exit point)
const buildEndNode = (nodes: WorkflowNode[], config: WorkflowConfiguration): void => {
  const endNodeExists = nodes.find(node => node.id === END_NODE_ID)
  if (endNodeExists) return

  const state = config.states?.find(state => state.id === END_NODE_ID)

  if (!state) {
    console.warn('End node state not found')
    return
  }

  nodes.push(buildNode(state, nodes, config))
}

/* Builds orphaned iterators (iterators with no children) */
const buildOrphanedIterators = (
  nodes: WorkflowNode[],
  config: WorkflowConfiguration
): void => {
  const allIterators = config.states?.filter(state => isIterator(state)) || []

  const orphanedIterators = allIterators.filter(iterator => {
    const hasChildren = config.states?.some(s => s.next?.meta_iter_state_id === iterator.id)
    return !hasChildren
  })

  for (const iteratorState of orphanedIterators) {
    buildOrAdjustIteratorNode(iteratorState.id, config, nodes)
  }
}

export const buildNodes = (
  configuration: WorkflowConfiguration
): WorkflowNode[] => {
  const nodes: WorkflowNode[] = []

  if (!configuration.states?.length) return nodes

  buildStartNode(nodes, configuration)

  const { connected, orphaned } = categorizeStates(configuration.states)

  if (connected.length) {
    nodes.push(...buildStateNodes(connected, configuration))
  }

  if (orphaned.length) {
    for (const state of orphaned) {
      nodes.push(buildNode(state, nodes, configuration))
    }
  }

  buildOrphanedIterators(nodes, configuration)

  const hasEndNode = nodes.some(node => node.id === END_NODE_ID)
  if (!hasEndNode) buildEndNode(nodes, configuration)

  return nodes
}
