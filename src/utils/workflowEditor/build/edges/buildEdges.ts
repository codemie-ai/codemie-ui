/**
 * Edge Builders Module
 *
 * Provides functions to build different types of workflow edges based on state configuration.
 * Handles direct edges, conditional branches, switch cases, and multi-target transitions.
 *
 * Architecture:
 * - States with decision logic connect through intermediate decision nodes
 * - Direct states connect directly to their targets
 * - All edges have consistent styling and animation
 */

import { WorkflowEdge } from '@/types/workflowEditor/base'
import { StateConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { EDGE_TYPES, DEFAULT_EDGE_STYLE, HANDLES, EDGE_Z_INDEX } from '@/utils/workflowEditor/constants'
import { findConnectedEntryState } from '@/utils/workflowEditor/helpers/connections'
import { getStateNext, isMetaState, hasDecisionLogic, getDecisionNodeId } from '@/utils/workflowEditor/helpers/states'

/**
 * Creates a base edge with default styling
 */
const createEdge = (
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  edgeType: 'default' | 'smoothstep' | 'backwards' = EDGE_TYPES.DEFAULT
): WorkflowEdge => ({
  id,
  source,
  target,
  sourceHandle,
  ...DEFAULT_EDGE_STYLE,
  type: edgeType,
  zIndex: EDGE_Z_INDEX,
})

// ============================================================================
// Decision Logic Utilities
// ============================================================================

/**
 * Creates source handle ID for a switch case
 */
const getCaseSourceHandle = (index: number): string => {
  return `${HANDLES.SWITCH_CASE_PREFIX}${index}`
}

// ============================================================================
// Special Edge Builders
// ============================================================================

/**
 * Builds edge from start node to the entry point state
 * Uses findConnectedEntryState to identify entry point (marked as is_connected with no incoming edges)
 */
export const buildStartEdge = (
  config: WorkflowConfiguration
): WorkflowEdge | null => {
  const startState = findConnectedEntryState(config.states)
  if (!startState) return null

  return createEdge(`start-${startState.id}`, 'start', startState.id)
}

// ============================================================================
// State to Decision Node Edge
// ============================================================================

/**
 * Builds edge from a state to its decision node
 * Finds the meta node (CONDITION/SWITCH) by looking for one with matching parentID
 */
const buildStateToDecisionEdge = (state: StateConfiguration, config: WorkflowConfiguration): WorkflowEdge | null => {
  const decisionNodeId = getDecisionNodeId(state, config)
  if (!decisionNodeId) return null

  return createEdge(
    `${state.id}-to-decision`,
    state.id,
    decisionNodeId
  )
}

// ============================================================================
// Decision Node to Target Edges
// ============================================================================

/**
 * Builds edges from condition meta node to then/otherwise targets
 */
const buildConditionEdges = (state: StateConfiguration): WorkflowEdge[] => {
  const next = getStateNext(state)
  const condition = next?.condition
  if (!condition) return []

  const edges: WorkflowEdge[] = []

  if (condition.then && condition.then !== '') {
    edges.push(createEdge(
      `${state.id}-then-${condition.then}`,
      state.id,
      condition.then,
      HANDLES.THEN,
    ))
  }

  if (condition.otherwise && condition.otherwise !== '') {
    edges.push(createEdge(
      `${state.id}-otherwise-${condition.otherwise}`,
      state.id,
      condition.otherwise,
      HANDLES.OTHERWISE
    ))
  }

  return edges
}

/**
 * Builds edges from switch meta node to case targets and default
 */
const buildSwitchEdges = (state: StateConfiguration): WorkflowEdge[] => {
  const next = getStateNext(state)
  const switchLogic = next?.switch
  if (!switchLogic) return []

  const { cases, default: defaultStateId } = switchLogic
  const edges: WorkflowEdge[] = []

  for (const [index, caseItem] of cases.entries()) {
    if (caseItem.state_id && caseItem.state_id !== '') {
      edges.push(createEdge(
        `${state.id}-case${index}-${caseItem.state_id}`,
        state.id,
        caseItem.state_id,
        getCaseSourceHandle(index)
      ))
    }
  }

  if (defaultStateId && defaultStateId !== '') {
    edges.push(createEdge(
      `${state.id}-default-${defaultStateId}`,
      state.id,
      defaultStateId,
      HANDLES.SWITCH_DEFAULT
    ))
  }

  return edges
}

/**
 * Builds edges from decision meta node to target states
 * Routes to condition or switch builder based on decision type
 */
const buildDecisionEdgesToTargets = (state: StateConfiguration): WorkflowEdge[] => {
  const next = getStateNext(state)

  if (next?.condition) {
    return buildConditionEdges(state)
  }

  if (next?.switch) {
    return buildSwitchEdges(state)
  }

  return []
}

// ============================================================================
// Direct State Edges (No Decision Node)
// ============================================================================

/**
 * Builds a single direct edge (state_id transition)
 */
const buildDirectEdge = (state: StateConfiguration): WorkflowEdge | null => {
  const next = getStateNext(state)
  if (!next?.state_id || next.state_id === '') return null

  return createEdge(
    `${state.id}-${next.state_id}`,
    state.id,
    next.state_id
  )
}

/**
 * Builds multiple direct edges to parallel targets (state_ids array)
 * Used for parallel execution or fan-out patterns
 */
const buildParallelEdges = (state: StateConfiguration): WorkflowEdge[] => {
  const next = getStateNext(state)
  if (!next?.state_ids) return []

  return next.state_ids
    .filter(targetStateId => targetStateId && targetStateId !== '')
    .map(targetStateId =>
      createEdge(
        `${state.id}-${targetStateId}`,
        state.id,
        targetStateId
      )
    )
}

// ============================================================================
// Main Edge Builder
// ============================================================================

/**
 * Builds all edges for a given state
 *
 * Logic flow:
 * - Non-meta state with decision: state → decision node only
 * - Meta state with decision: decision node → target states
 * - Direct transitions: state → target state(s)
 *
 * @param state - State configuration to build edges from
 * @param config - Workflow configuration (needed to find decision nodes)
 * @returns Array of edges for the state
 */
const buildEdgesForState = (state: StateConfiguration, config: WorkflowConfiguration): WorkflowEdge[] => {
  const next = getStateNext(state)
  if (!next) return []

  const isMeta = isMetaState(state)
  const hasDecision = hasDecisionLogic(state)

  if (!isMeta && hasDecision) {
    const edge = buildStateToDecisionEdge(state, config)
    return edge ? [edge] : []
  }

  if (isMeta && hasDecision) {
    return buildDecisionEdgesToTargets(state)
  }

  if (next.state_ids) return buildParallelEdges(state)
  if (next.state_id) {
    const edge = buildDirectEdge(state)
    return edge ? [edge] : []
  }

  return []
}

export const buildEdges = (configuration: WorkflowConfiguration): WorkflowEdge[] => {
  const edges: WorkflowEdge[] = []

  if (!configuration.states?.length) return edges

  // Build edges from state transitions
  for (const state of configuration.states) {
    const stateEdges = buildEdgesForState(state, configuration)
    edges.push(...stateEdges)
  }

  // Build start edge (from start node to first state)
  const startEdge = buildStartEdge(configuration)
  if (startEdge) edges.push(startEdge)

  return edges
}
