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

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, render } from '@testing-library/react'
import yaml from 'js-yaml'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WorkflowNode } from '@/types/workflowEditor/base'
import { deserialize } from '@/utils/workflowEditor/serialization/deserializer/deserializer'

import WorkflowEditor from '../WorkflowEditor'

const { reactFlowProps } = vi.hoisted(() => ({
  reactFlowProps: { nodes: [] as { id: string }[] },
}))

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, nodes }: { children?: unknown; nodes: WorkflowNode[] }) => {
    reactFlowProps.nodes = nodes
    return createElement('div', { 'data-testid': 'react-flow' }, children as never)
  },
  ReactFlowProvider: ({ children }: { children?: unknown }) => children,
  useReactFlow: () => ({
    getIntersectingNodes: () => [],
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    getNodes: () => [],
  }),
}))

vi.mock('@/hooks/useReactFlowDnD', () => ({
  DnDProvider: ({ children }: { children?: unknown }) => children,
}))

vi.mock('../ConfigPanel', () => ({ default: () => null }))
vi.mock('../Sidebar', () => ({ default: () => null }))
vi.mock('../EditorBackground', () => ({ default: () => null }))
vi.mock('../EditorControls', () => ({ default: () => null }))
vi.mock('../nodes', () => ({ nodeTypeComponents: {} }))
vi.mock('../edges/BackwardsEdge', () => ({ default: () => null }))
vi.mock('@/utils/workflowEditor/helpers/export/downloadWorkflowImage', () => ({
  downloadWorkflowImage: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { configs: [] },
}))

vi.mock('@/utils/settings', () => ({
  isConfigItemEnabled: () => false,
  getConfigItemSettings: () => null,
}))

interface RawState {
  id: string
  next?: { condition?: unknown; switch?: unknown }
}

const source = readFileSync(
  join(__dirname, '../../../../utils/workflowEditor/build/__tests__/fixtures/large-workflow.yaml'),
  'utf-8'
)
const raw = yaml.load(source) as { states: RawState[] }
const config = deserialize(source)

// Branch node id of each decision parent, as assigned by the deserializer
const branchIds = raw.states
  .filter((s) => s.next?.condition || s.next?.switch)
  .map((s) => config.states.find((state) => state.id === s.id)!.next!.meta_next_state_id!)
const iteratorIds = config.states.filter((s) => s._meta?.type === 'iterator').map((s) => s.id)

afterEach(() => {
  cleanup()
  reactFlowProps.nodes = []
})

describe('WorkflowEditor - large workflow', () => {
  it('hands ReactFlow a node for every state of a 50-state workflow, read-only', () => {
    render(
      <WorkflowEditor
        yamlConfig={source}
        onConfigurationUpdate={() => {}}
        isFullscreen={false}
        withDocs={false}
        executionEnabled={false}
        executionStates={[]}
        executionActiveStateId="start"
      />
    )

    const expectedIds = [
      ...raw.states.map((s) => s.id),
      'start',
      'end',
      ...branchIds,
      ...iteratorIds,
    ].sort((a, b) => a.localeCompare(b))

    expect(branchIds).toHaveLength(6)
    expect(iteratorIds).toHaveLength(1)
    expect(reactFlowProps.nodes.map((n) => n.id).sort((a, b) => a.localeCompare(b))).toEqual(
      expectedIds
    )
    expect(reactFlowProps.nodes).toHaveLength(59)
  })
})
