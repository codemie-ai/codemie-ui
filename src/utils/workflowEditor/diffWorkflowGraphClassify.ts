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
  AssistantConfiguration,
  CustomNodeConfiguration,
  StateConfiguration,
  ToolConfiguration,
  WorkflowConfiguration,
} from '@/types/workflowEditor/configuration'
import { getStateNext, isIterator } from '@/utils/workflowEditor/helpers/states'

import { semanticallyEqual, stableJson } from './diffWorkflowGraphSnapshot'

import type { NodeDiffEntry } from './diffWorkflowGraphs'

function iteratorIdsForParent(
  state: StateConfiguration,
  map: Map<string, StateConfiguration>
): string[] {
  const next = getStateNext(state)
  const childIds = [
    next?.state_id,
    next?.meta_next_state_id,
    ...(next?.state_ids ?? []),
    next?.condition?.then,
    next?.condition?.otherwise,
    ...(next?.switch?.cases?.map((entry) => entry.state_id) ?? []),
    next?.switch?.default,
  ].filter((id): id is string => !!id)

  const found: string[] = []
  for (const childId of childIds) {
    const child = map.get(childId)
    const iteratorId = child ? getStateNext(child)?.meta_iter_state_id : undefined
    if (iteratorId && !found.includes(iteratorId)) found.push(iteratorId)
  }
  return found
}

function changedActorIds<T extends { id: string }>(
  canvasActors: T[],
  baselineActors: T[]
): Set<string> {
  const baselineMap = new Map(baselineActors.map((actor) => [actor.id, stableJson(actor)]))
  const canvasMap = new Map(canvasActors.map((actor) => [actor.id, stableJson(actor)]))
  const changed = new Set<string>()

  for (const [id, json] of canvasMap) {
    if (baselineMap.get(id) !== json) changed.add(id)
  }
  for (const id of baselineMap.keys()) {
    if (!canvasMap.has(id)) changed.add(id)
  }

  return changed
}

type ActorKind = 'assistant' | 'tool' | 'custom_node'

function getStateActorRef(state: StateConfiguration): { kind: ActorKind; id: string } | undefined {
  const record = state as unknown as Record<string, unknown>
  let actorRef: { kind: ActorKind; id: string } | undefined
  if (typeof record.assistant_id === 'string') {
    actorRef = { kind: 'assistant', id: record.assistant_id }
  } else if (typeof record.tool_id === 'string') {
    actorRef = { kind: 'tool', id: record.tool_id }
  } else if (typeof record.custom_node_id === 'string') {
    actorRef = { kind: 'custom_node', id: record.custom_node_id }
  }
  return actorRef
}

export function classifyStateNodes(
  canvasMap: Map<string, StateConfiguration>,
  baselineMap: Map<string, StateConfiguration>
): NodeDiffEntry[] {
  const nodes: NodeDiffEntry[] = []
  const allIds = new Set([...canvasMap.keys(), ...baselineMap.keys()])

  for (const id of allIds) {
    const canvasState = canvasMap.get(id)
    const baselineState = baselineMap.get(id)

    if (canvasState && !baselineState) {
      nodes.push({ id, status: 'added', canvasNode: canvasState })
    } else if (!canvasState && baselineState) {
      nodes.push({ id, status: 'removed', baselineNode: baselineState })
    } else if (canvasState && baselineState && !semanticallyEqual(canvasState, baselineState)) {
      nodes.push({
        id,
        status: 'modified',
        canvasNode: canvasState,
        baselineNode: baselineState,
      })
    }
  }

  return nodes
}

function promoteToModified(
  id: string,
  nodes: NodeDiffEntry[],
  canvasState: StateConfiguration,
  baselineState: StateConfiguration | undefined
): void {
  const existing = nodes.find((entry) => entry.id === id)
  if (existing) {
    // Do not overwrite 'added' status: a new state that references a changed
    // actor is still 'added' (it has no baseline entry) — not 'modified'.
    if (existing.status !== 'added') {
      existing.status = 'modified'
      existing.canvasNode ??= canvasState
      existing.baselineNode ??= baselineState
    }
    return
  }

  nodes.push({ id, status: 'modified', canvasNode: canvasState, baselineNode: baselineState })
}

export function propagateActorChanges(
  canvas: WorkflowConfiguration,
  baseline: WorkflowConfiguration,
  canvasMap: Map<string, StateConfiguration>,
  baselineMap: Map<string, StateConfiguration>,
  nodes: NodeDiffEntry[]
): void {
  const changedByKind: Record<ActorKind, Set<string>> = {
    assistant: changedActorIds<AssistantConfiguration>(
      canvas.assistants ?? [],
      baseline.assistants ?? []
    ),
    tool: changedActorIds<ToolConfiguration>(canvas.tools ?? [], baseline.tools ?? []),
    custom_node: changedActorIds<CustomNodeConfiguration>(
      canvas.custom_nodes ?? [],
      baseline.custom_nodes ?? []
    ),
  }

  if (
    changedByKind.assistant.size === 0 &&
    changedByKind.tool.size === 0 &&
    changedByKind.custom_node.size === 0
  ) {
    return
  }

  for (const canvasState of canvasMap.values()) {
    const actorRef = getStateActorRef(canvasState)
    if (actorRef && changedByKind[actorRef.kind].has(actorRef.id)) {
      promoteToModified(canvasState.id, nodes, canvasState, baselineMap.get(canvasState.id))
    }
  }
}

export function propagateIteratorKeyChanges(
  canvasMap: Map<string, StateConfiguration>,
  baselineMap: Map<string, StateConfiguration>,
  nodes: NodeDiffEntry[]
): void {
  const allIds = new Set([...canvasMap.keys(), ...baselineMap.keys()])

  for (const id of allIds) {
    const canvasState = canvasMap.get(id)
    const baselineState = baselineMap.get(id)
    if (!canvasState || !baselineState) continue
    if (isIterator(canvasState) || isIterator(baselineState)) continue
    if (getStateNext(canvasState)?.iter_key === getStateNext(baselineState)?.iter_key) continue

    const iteratorIds = new Set([
      ...iteratorIdsForParent(canvasState, canvasMap),
      ...iteratorIdsForParent(baselineState, baselineMap),
    ])
    for (const iteratorId of iteratorIds) {
      if (!canvasMap.has(iteratorId) || !baselineMap.has(iteratorId)) continue
      promoteToModified(iteratorId, nodes, canvasMap.get(iteratorId)!, baselineMap.get(iteratorId))
    }
  }
}
