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
import type { WorkflowNode } from '@/types/workflowEditor'
import { NodeTypes } from '@/types/workflowEditor/base'
import type { StateConfiguration } from '@/types/workflowEditor/configuration'

import type { Edge } from '@xyflow/react'

// Test-specific handle type
export type TestHandle = {
  id: string
  state_id: string
  type: 'source' | 'target'
}

export const configState = (
  overrides: Partial<StateConfiguration> & {
    next?: string | unknown
    type?: 'Action' | 'Decision'
  }
): StateConfiguration => {
  const { next, type, ...rest } = overrides

  // Handle legacy format where type is 'Action' or 'Decision'
  const nodeType = type === 'Decision' ? NodeTypes.CONDITIONAL : NodeTypes.ASSISTANT

  // Handle legacy format where next is a string
  const nextConfig = next && typeof next === 'string' ? { state_id: next } : next

  return {
    id: 'config-state',
    _meta: {
      type: nodeType,
      ...overrides._meta,
    },
    ...rest,
    ...(nextConfig && { next: nextConfig }),
  }
}

export const configHandle = (overrides: Partial<TestHandle>): TestHandle => {
  return {
    id: 'handle',
    state_id: 'config-state',
    type: 'source',
    ...overrides,
  }
}

export const execState = (
  overrides: Partial<ExtendedWorkflowExecutionState> & { resolvedId: string }
): ExtendedWorkflowExecutionState => {
  const { resolvedId } = overrides
  return {
    id: crypto.randomUUID(),
    name: resolvedId,
    status: 'Succeeded',
    preceding_state_ids: null,
    state_id: resolvedId,
    date: null,
    update_date: null,
    execution_id: 'test-execution-id',
    task: null,
    started_at: null,
    completed_at: null,
    output: null,
    error: null,
    thoughts: [],
    ...overrides,
    resolvedId, // Set after overrides to ensure it's not overwritten
  }
}

/**
 * A test-specific Edge type where sourceHandle and targetHandle are guaranteed strings.
 * Assignable to Edge[] (string ⊆ string | null | undefined) so it works with all utilities.
 */
export type TestEdge = Omit<Edge, 'sourceHandle' | 'targetHandle'> & {
  sourceHandle: string
  targetHandle: string
}

type EdgeOverrides = Omit<Partial<Edge>, 'sourceHandle' | 'targetHandle'> & {
  sourceHandle?: string
  targetHandle?: string
}

/**
 * Creates a minimal XFlow Edge for use in execution-utility tests.
 *
 * Default handle ID convention (overridable):
 *   sourceHandle: `${source}-out`
 *   targetHandle: `${target}-in`
 *
 * For Decision nodes with multiple branches, override sourceHandle per branch:
 *   xyEdge('Dec', 'B', { sourceHandle: 'Dec-out-0' })
 *   xyEdge('Dec', 'C', { sourceHandle: 'Dec-out-1' })
 */
export const xyEdge = (
  source: string,
  target: string,
  overrides: EdgeOverrides = {}
): TestEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  sourceHandle: `${source}-out`,
  targetHandle: `${target}-in`,
  type: 'customEdge',
  animated: false,
  data: { status: null },
  ...overrides,
})

/**
 * Creates a minimal XFlow WorkflowNode for use in execution-utility tests.
 * Handles default to target + source handles matching the xyEdge convention.
 */
export const xyNode = (
  id: string,
  isDecision = false,
  handles: TestHandle[] = [
    configHandle({ id: `${id}-in`, state_id: id, type: 'target' }),
    configHandle({ id: `${id}-out`, state_id: id, type: 'source' }),
  ]
): WorkflowNode => ({
  id,
  type: isDecision ? 'decisionNode' : 'actionNode',
  position: { x: 0, y: 0 },
  data: {
    label: id,
    status: null,
    handles,
    handlesStatusMap: new Map(),
  },
})
