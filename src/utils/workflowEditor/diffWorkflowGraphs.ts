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

import { StateConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import {
  classifyStateNodes,
  propagateActorChanges,
  propagateIteratorKeyChanges,
} from './diffWorkflowGraphClassify'

export type DiffStatus = 'added' | 'removed' | 'modified'

export interface NodeDiffEntry {
  id: string
  status: DiffStatus
  canvasNode?: StateConfiguration
  baselineNode?: StateConfiguration
}

export interface DiffResult {
  nodes: NodeDiffEntry[]
}

export function diffWorkflowGraphs(
  canvas: WorkflowConfiguration,
  baseline: WorkflowConfiguration
): DiffResult {
  const canvasMap = new Map<string, StateConfiguration>((canvas.states ?? []).map((s) => [s.id, s]))
  const baselineMap = new Map<string, StateConfiguration>(
    (baseline.states ?? []).map((s) => [s.id, s])
  )

  const nodes = classifyStateNodes(canvasMap, baselineMap)
  propagateIteratorKeyChanges(canvasMap, baselineMap, nodes)
  propagateActorChanges(canvas, baseline, canvasMap, baselineMap, nodes)

  return { nodes }
}
