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

import { describe, expect, it, vi } from 'vitest'

import { NodeTypes, WorkflowNode } from '@/types/workflowEditor/base'
import { StateConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import {
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  END_NODE_ID,
  START_NODE_ID,
} from '@/utils/workflowEditor/constants'
import { getAbsolutePosition } from '@/utils/workflowEditor/helpers/nodes'

import {
  buildVisualDiffGraph,
  hasWorkflowEdgeDiff,
  resolveVisualDiffEdgeStatus,
} from '../buildVisualDiffGraph'
import { diffWorkflowGraphs } from '../diffWorkflowGraphs'

type DiffGraphNodeData = {
  diffStatus?: string
  findState: (id: string) => StateConfiguration | undefined
  getConfig: () => WorkflowConfiguration
}

const diffNodeData = (node: WorkflowNode | undefined): DiffGraphNodeData =>
  node?.data as DiffGraphNodeData

const makeConfig = (withIterator: boolean): WorkflowConfiguration => {
  const processNext = withIterator
    ? { state_id: END_NODE_ID, meta_iter_state_id: 'iterator_1' }
    : { state_id: END_NODE_ID }

  const states: StateConfiguration[] = [
    {
      id: START_NODE_ID,
      next: { state_id: 'Process_item_1' },
      _meta: { type: NodeTypes.START, is_connected: true },
    },
    {
      id: 'Process_item_1',
      task: 'process item',
      next: processNext,
      _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
    },
    {
      id: END_NODE_ID,
      _meta: { type: NodeTypes.END, is_connected: true },
    },
  ]

  if (withIterator) {
    states.push({
      id: 'iterator_1',
      _meta: {
        type: NodeTypes.ITERATOR,
        data: { next: { iter_key: 'items' } },
      },
    })
  }

  return { states }
}

describe('buildVisualDiffGraph', () => {
  it('sizes an added iterator so it visually contains its child step', () => {
    const canvas = makeConfig(true)
    const baseline = makeConfig(false)
    const diff = diffWorkflowGraphs(canvas, baseline)
    const { nodes } = buildVisualDiffGraph(canvas, baseline, diff)

    const iterator = nodes.find((node) => node.id === 'iterator_1')
    const child = nodes.find((node) => node.id === 'Process_item_1')

    expect(iterator?.data.diffStatus).toBe('added')
    expect(child?.parentId).toBe('iterator_1')

    expect(iterator?.width).toBeGreaterThan(0)
    expect(iterator?.height).toBeGreaterThan(0)
    expect(iterator?.style).toMatchObject({
      width: iterator?.width,
      height: iterator?.height,
    })

    const childRight = (child?.position.x ?? 0) + (child?.width ?? 0)
    const childBottom = (child?.position.y ?? 0) + (child?.height ?? 0)

    expect(childRight).toBeLessThanOrEqual(iterator?.width ?? 0)
    expect(childBottom).toBeLessThanOrEqual(iterator?.height ?? 0)
  })

  it('positions a removed iterator around the child that still exists in the restore graph', () => {
    const canvas: WorkflowConfiguration = {
      states: [
        {
          id: START_NODE_ID,
          next: { state_id: 'Process_item_1' },
          _meta: { type: NodeTypes.START, is_connected: true },
        },
        {
          id: 'Process_item_1',
          task: 'process item',
          next: { state_id: 'Enrich_item', meta_iter_state_id: 'iterator_items' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'Enrich_item',
          task: 'enrich v2',
          next: { state_id: END_NODE_ID },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: END_NODE_ID,
          _meta: { type: NodeTypes.END, is_connected: true },
        },
        {
          id: 'iterator_items',
          _meta: { type: NodeTypes.ITERATOR, data: { next: { iter_key: 'items' } } },
        },
      ],
    }

    const baseline: WorkflowConfiguration = {
      states: [
        {
          id: START_NODE_ID,
          next: { state_id: 'Process_item_1' },
          _meta: { type: NodeTypes.START, is_connected: true },
        },
        {
          id: 'Process_item_1',
          task: 'process item',
          next: { state_id: 'Enrich_item' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'Enrich_item',
          task: 'enrich v1',
          next: { state_id: END_NODE_ID, meta_iter_state_id: 'iterator_item5' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: END_NODE_ID,
          _meta: { type: NodeTypes.END, is_connected: true },
        },
        {
          id: 'iterator_item5',
          _meta: { type: NodeTypes.ITERATOR, data: { next: { iter_key: 'item5' } } },
        },
      ],
    }

    const diff = diffWorkflowGraphs(canvas, baseline)
    const { nodes } = buildVisualDiffGraph(canvas, baseline, diff)

    const removedIterator = nodes.find((node) => node.id === 'iterator_item5')
    const child = nodes.find((node) => node.id === 'Enrich_item')

    expect(removedIterator?.data.diffStatus).toBe('removed')
    expect(child).toBeDefined()

    const childPos = getAbsolutePosition(child!, nodes)
    const childRight = childPos.x + (child?.width ?? 0)
    const childBottom = childPos.y + (child?.height ?? 0)
    const iteratorRight = (removedIterator?.position.x ?? 0) + (removedIterator?.width ?? 0)
    const iteratorBottom = (removedIterator?.position.y ?? 0) + (removedIterator?.height ?? 0)

    expect(childPos.x).toBeGreaterThanOrEqual(removedIterator?.position.x ?? Infinity)
    expect(childPos.y).toBeGreaterThanOrEqual(removedIterator?.position.y ?? Infinity)
    expect(childRight).toBeLessThanOrEqual(iteratorRight)
    expect(childBottom).toBeLessThanOrEqual(iteratorBottom)
  })

  it('wraps a removed iterator around a meta child whose iterator link lives on _meta.data.next', () => {
    const condition = {
      expression: 'result.status == success',
      then: END_NODE_ID,
      otherwise: END_NODE_ID,
    }

    const canvas: WorkflowConfiguration = {
      states: [
        {
          id: START_NODE_ID,
          next: { state_id: 'Process_item_1' },
          _meta: { type: NodeTypes.START, is_connected: true },
        },
        {
          id: 'Process_item_1',
          task: 'process item',
          next: { meta_next_state_id: 'Router', condition },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'Router',
          _meta: {
            type: NodeTypes.CONDITIONAL,
            is_connected: true,
            data: { next: { condition } },
          },
        },
        {
          id: END_NODE_ID,
          _meta: { type: NodeTypes.END, is_connected: true },
        },
      ],
    }

    const baseline: WorkflowConfiguration = {
      states: [
        {
          id: START_NODE_ID,
          next: { state_id: 'Process_item_1' },
          _meta: { type: NodeTypes.START, is_connected: true },
        },
        {
          id: 'Process_item_1',
          task: 'process item',
          next: { meta_next_state_id: 'Router', condition },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'Router',
          _meta: {
            type: NodeTypes.CONDITIONAL,
            is_connected: true,
            data: { next: { condition, meta_iter_state_id: 'iterator_item5' } },
          },
        },
        {
          id: END_NODE_ID,
          _meta: { type: NodeTypes.END, is_connected: true },
        },
        {
          id: 'iterator_item5',
          _meta: { type: NodeTypes.ITERATOR, data: { next: { iter_key: 'item5' } } },
        },
      ],
    }

    const diff = diffWorkflowGraphs(canvas, baseline)
    const { nodes } = buildVisualDiffGraph(canvas, baseline, diff)

    const removedIterator = nodes.find((node) => node.id === 'iterator_item5')
    const child = nodes.find((node) => node.id === 'Router')

    expect(removedIterator?.data.diffStatus).toBe('removed')
    expect(child).toBeDefined()

    const childPos = getAbsolutePosition(child!, nodes)
    const childRight = childPos.x + (child?.width ?? 0)
    const childBottom = childPos.y + (child?.height ?? 0)
    const iteratorRight = (removedIterator?.position.x ?? 0) + (removedIterator?.width ?? 0)
    const iteratorBottom = (removedIterator?.position.y ?? 0) + (removedIterator?.height ?? 0)

    expect(childPos.x).toBeGreaterThanOrEqual(removedIterator?.position.x ?? Infinity)
    expect(childPos.y).toBeGreaterThanOrEqual(removedIterator?.position.y ?? Infinity)
    expect(childRight).toBeLessThanOrEqual(iteratorRight)
    expect(childBottom).toBeLessThanOrEqual(iteratorBottom)
  })

  it('treats a next.state_id rewire as an edge diff even when no node is modified', () => {
    const makeLinear = (target: string): WorkflowConfiguration => ({
      states: [
        {
          id: START_NODE_ID,
          next: { state_id: 'Logger' },
          _meta: { type: NodeTypes.START, is_connected: true },
        },
        {
          id: 'Logger',
          task: 'log',
          next: { state_id: target },
          _meta: { type: NodeTypes.TOOL, is_connected: true },
        },
        {
          id: 'Transformer',
          task: 'transform',
          next: { state_id: END_NODE_ID },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'Summarizer',
          task: 'summarize',
          next: { state_id: END_NODE_ID },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: END_NODE_ID,
          _meta: { type: NodeTypes.END, is_connected: true },
        },
      ],
    })

    const canvas = makeLinear('Summarizer')
    const baseline = makeLinear('Transformer')
    const diff = diffWorkflowGraphs(canvas, baseline)
    const { edges } = buildVisualDiffGraph(canvas, baseline, diff)

    expect(diff.nodes).toHaveLength(0)
    expect(hasWorkflowEdgeDiff(canvas, baseline)).toBe(true)
    expect(edges.some((edge) => edge.id.startsWith('added-edge-'))).toBe(true)
    expect(edges.some((edge) => edge.id.startsWith('removed-edge-'))).toBe(true)

    const emptyNodeStatus = new Map()
    const added = edges.find((edge) => edge.id.startsWith('added-edge-'))
    const removed = edges.find((edge) => edge.id.startsWith('removed-edge-'))
    expect(resolveVisualDiffEdgeStatus(added!, emptyNodeStatus)).toBe('added')
    expect(resolveVisualDiffEdgeStatus(removed!, emptyNodeStatus)).toBe('removed')
    expect(
      resolveVisualDiffEdgeStatus(
        edges.find(
          (edge) => !edge.id.startsWith('added-edge-') && !edge.id.startsWith('removed-edge-')
        )!,
        emptyNodeStatus
      )
    ).toBeUndefined()
  })

  it('treats a switch case rewire as added and removed edges without modifying the switch', () => {
    const switchNext = (caseTarget: string) => ({
      switch: {
        cases: [
          { condition: "category == 'alpha'", state_id: 'Branch_alpha' },
          { condition: "category == 'beta'", state_id: caseTarget },
        ],
        default: 'Defaulter',
      },
    })

    const makeSwitchGraph = (caseTarget: string): WorkflowConfiguration => ({
      states: [
        {
          id: START_NODE_ID,
          next: { state_id: 'Router' },
          _meta: { type: NodeTypes.START, is_connected: true },
        },
        {
          id: 'Router',
          task: 'route',
          next: { meta_next_state_id: 'switch_1', ...switchNext(caseTarget) },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'switch_1',
          _meta: {
            type: NodeTypes.SWITCH,
            is_connected: true,
            data: { next: switchNext(caseTarget) },
          },
        },
        {
          id: 'Branch_alpha',
          task: 'alpha',
          next: { state_id: END_NODE_ID },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'Branch_beta',
          task: 'beta',
          next: { state_id: END_NODE_ID },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'Branch_gamma',
          task: 'gamma',
          next: { state_id: END_NODE_ID },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'Defaulter',
          task: 'default',
          next: { state_id: END_NODE_ID },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: END_NODE_ID,
          _meta: { type: NodeTypes.END, is_connected: true },
        },
      ],
    })

    const canvas = makeSwitchGraph('Branch_gamma')
    const baseline = makeSwitchGraph('Branch_beta')
    const diff = diffWorkflowGraphs(canvas, baseline)
    const { edges } = buildVisualDiffGraph(canvas, baseline, diff)
    const emptyNodeStatus = new Map()

    expect(diff.nodes).toHaveLength(0)
    expect(hasWorkflowEdgeDiff(canvas, baseline)).toBe(true)

    const added = edges.filter((edge) => edge.id.startsWith('added-edge-'))
    const removed = edges.filter((edge) => edge.id.startsWith('removed-edge-'))
    expect(added).toHaveLength(1)
    expect(removed).toHaveLength(1)
    expect(added[0].target).toBe('Branch_gamma')
    expect(removed[0].target).toBe('Branch_beta')
    expect(resolveVisualDiffEdgeStatus(added[0], emptyNodeStatus)).toBe('added')
    expect(resolveVisualDiffEdgeStatus(removed[0], emptyNodeStatus)).toBe('removed')
  })

  it('prefers edge identity over endpoint node status when coloring', () => {
    const statusById = new Map([
      ['Logger', 'modified' as const],
      ['Summarizer', 'modified' as const],
    ])

    expect(
      resolveVisualDiffEdgeStatus(
        { id: 'added-edge-Logger-Summarizer', source: 'Logger', target: 'Summarizer' },
        statusById
      )
    ).toBe('added')
    expect(
      resolveVisualDiffEdgeStatus(
        { id: 'removed-edge-Logger-Transformer', source: 'Logger', target: 'Transformer' },
        statusById
      )
    ).toBe('removed')
    expect(
      resolveVisualDiffEdgeStatus({ id: 'Logger-End', source: 'Logger', target: 'end' }, statusById)
    ).toBe('modified')
  })

  it('reports no edge diff when the graphs are identical', () => {
    const config = makeConfig(false)
    expect(hasWorkflowEdgeDiff(config, config)).toBe(false)
  })

  it('binds findState to the last state when canvas and baseline share a duplicate id', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const canvas: WorkflowConfiguration = {
      states: [
        ...makeConfig(false).states,
        { id: 'note_dup', _meta: { type: NodeTypes.NOTE, data: { note: 'canvas-first' } } },
        { id: 'note_dup', _meta: { type: NodeTypes.NOTE, data: { note: 'canvas-last' } } },
      ],
    }
    const baseline: WorkflowConfiguration = {
      states: [
        ...makeConfig(false).states,
        { id: 'note_dup', _meta: { type: NodeTypes.NOTE, data: { note: 'baseline-first' } } },
        { id: 'note_dup', _meta: { type: NodeTypes.NOTE, data: { note: 'baseline-last' } } },
      ],
    }

    try {
      const diff = diffWorkflowGraphs(canvas, baseline)
      const { nodes } = buildVisualDiffGraph(canvas, baseline, diff)
      const noteNode = nodes.find((node) => node.id === 'note_dup')

      expect(noteNode).toBeDefined()
      expect(diffNodeData(noteNode).findState('note_dup')?._meta?.data?.note).toBe('canvas-last')
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('binds a removed iterator ghost findState and getConfig to the baseline iterator', () => {
    const canvas = makeConfig(false)
    const baseline = makeConfig(true)
    const diff = diffWorkflowGraphs(canvas, baseline)
    const { nodes } = buildVisualDiffGraph(canvas, baseline, diff)

    const removedIterator = nodes.find((node) => node.id === 'iterator_1')

    const iteratorData = diffNodeData(removedIterator)
    expect(iteratorData.diffStatus).toBe('removed')
    expect(iteratorData.findState('iterator_1')?._meta?.data?.next?.iter_key).toBe('items')
    expect(iteratorData.getConfig()).toBe(baseline)
    expect(iteratorData.getConfig().states.find((s) => s.id === 'iterator_1')).toEqual(
      baseline.states.find((s) => s.id === 'iterator_1')
    )
  })

  it('binds a removed note ghost findState to the baseline note text', () => {
    const canvas = makeConfig(false)
    const baseline: WorkflowConfiguration = {
      states: [
        ...makeConfig(false).states,
        {
          id: 'note_removed',
          _meta: { type: NodeTypes.NOTE, data: { note: 'baseline memo' } },
        },
      ],
    }
    const diff = diffWorkflowGraphs(canvas, baseline)
    const { nodes } = buildVisualDiffGraph(canvas, baseline, diff)

    const removedNote = nodes.find((node) => node.id === 'note_removed')

    const noteData = diffNodeData(removedNote)
    expect(noteData.diffStatus).toBe('removed')
    expect(noteData.findState('note_removed')?._meta?.data?.note).toBe('baseline memo')
    expect(noteData.getConfig()).toBe(baseline)
  })

  it('emits a synthetic removed ghost when both buildNodes paths omit the baseline state', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const danglingId = 'dangling_conditional'
    const danglingPosition = { x: 12, y: 34 }
    const danglingState: StateConfiguration = {
      id: danglingId,
      _meta: {
        type: NodeTypes.CONDITIONAL,
        is_connected: true,
        position: danglingPosition,
        data: {
          next: {
            condition: { expression: 'true', then: END_NODE_ID, otherwise: END_NODE_ID },
          },
        },
      },
    }

    const canvas = makeConfig(false)
    const baseline: WorkflowConfiguration = {
      states: [...makeConfig(false).states, danglingState],
    }

    try {
      const diff = diffWorkflowGraphs(canvas, baseline)
      const { nodes } = buildVisualDiffGraph(canvas, baseline, diff)
      const ghost = nodes.find((node) => node.id === danglingId)

      expect(diff.nodes.find((entry) => entry.id === danglingId)?.status).toBe('removed')
      expect(ghost).toBeDefined()
      expect(ghost?.type).toBe(NodeTypes.CONDITIONAL)
      expect(ghost?.data.diffStatus).toBe('removed')
      expect(ghost?.width).toBe(DEFAULT_NODE_WIDTH)
      expect(ghost?.height).toBe(DEFAULT_NODE_HEIGHT)
      expect(diffNodeData(ghost).findState(danglingId)).toEqual(danglingState)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`removed node "${danglingId}"`))
    } finally {
      warnSpy.mockRestore()
    }
  })
})
