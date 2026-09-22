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

import { isPlainObject } from '@/utils/jsonHelpers'
import { buildVisualDiffGraph } from '@/utils/workflowEditor/buildVisualDiffGraph'
import { DiffStatus, diffWorkflowGraphs } from '@/utils/workflowEditor/diffWorkflowGraphs'
import { deserialize } from '@/utils/workflowEditor/serialization'

export type VisualDiffCanvasFailureReason =
  | 'selected-parse'
  | 'selected-empty'
  | 'editor-parse'
  | 'editor-empty'
  | 'graph'

export type VisualDiffCanvasGraph = {
  nodes: ReturnType<typeof buildVisualDiffGraph>['nodes']
  edges: ReturnType<typeof buildVisualDiffGraph>['edges']
  statusById: Map<string, DiffStatus>
}

export type PreparedVisualDiffCanvas =
  | ({ ok: true } & VisualDiffCanvasGraph)
  | { ok: false; failure: VisualDiffCanvasFailureReason }

type YamlSide = 'selected' | 'editor'

const YAML_LOAD_OPTIONS = {
  json: true,
  schema: yaml.CORE_SCHEMA,
} as const

const classifyYaml = (yamlString: string, side: YamlSide): VisualDiffCanvasFailureReason | null => {
  if (!yamlString.trim()) {
    return side === 'selected' ? 'selected-empty' : 'editor-empty'
  }

  try {
    const parsed = yaml.load(yamlString, YAML_LOAD_OPTIONS)
    if (!isPlainObject(parsed)) {
      return side === 'selected' ? 'selected-parse' : 'editor-parse'
    }
  } catch {
    return side === 'selected' ? 'selected-parse' : 'editor-parse'
  }

  return null
}

export function prepareVisualDiffCanvas(
  canvasYaml: string,
  baselineYaml: string
): PreparedVisualDiffCanvas {
  const selectedFailure = classifyYaml(canvasYaml, 'selected')
  if (selectedFailure) {
    return { ok: false, failure: selectedFailure }
  }

  const editorFailure = classifyYaml(baselineYaml, 'editor')
  if (editorFailure) {
    return { ok: false, failure: editorFailure }
  }

  try {
    const canvasConfig = deserialize(canvasYaml)
    const baselineConfig = deserialize(baselineYaml)
    const diff = diffWorkflowGraphs(canvasConfig, baselineConfig)
    const { nodes, edges } = buildVisualDiffGraph(canvasConfig, baselineConfig, diff)
    return {
      ok: true,
      nodes,
      edges,
      statusById: new Map(diff.nodes.map((entry) => [entry.id, entry.status])),
    }
  } catch {
    return { ok: false, failure: 'graph' }
  }
}
