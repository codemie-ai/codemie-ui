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

import { describe, it, expect, vi } from 'vitest'

import { NodeTypes } from '@/types/workflowEditor/base'
import {
  WorkflowConfiguration,
  StateConfiguration,
  AssistantConfiguration,
  ToolConfiguration,
  CustomNodeConfiguration,
} from '@/types/workflowEditor/configuration'

import { diffWorkflowGraphs } from '../diffWorkflowGraphs'

const makeState = (overrides: Partial<StateConfiguration> & { id: string }): StateConfiguration =>
  ({
    _meta: { type: NodeTypes.ASSISTANT },
    ...overrides,
  } as StateConfiguration)

const makeConfig = (
  states: StateConfiguration[],
  extra: Partial<WorkflowConfiguration> = {}
): WorkflowConfiguration => ({
  states,
  ...extra,
})

describe('diffWorkflowGraphs', () => {
  it('(1) canvas-only state is classified as added', () => {
    const canvas = makeConfig([makeState({ id: 'state-a', task: 'do something' })])
    const baseline = makeConfig([])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]).toMatchObject({ id: 'state-a', status: 'added' })
    expect(result.nodes[0].canvasNode).toBeDefined()
    expect(result.nodes[0].baselineNode).toBeUndefined()
  })

  it('(2) baseline-only state is classified as removed with baselineNode preserved', () => {
    const position = { x: 100, y: 200 }
    const canvas = makeConfig([])
    const baseline = makeConfig([
      makeState({ id: 'state-b', task: 'old task', _meta: { type: NodeTypes.TOOL, position } }),
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]).toMatchObject({ id: 'state-b', status: 'removed' })
    expect(result.nodes[0].baselineNode).toBeDefined()
    expect((result.nodes[0].baselineNode as StateConfiguration)._meta?.position).toEqual(position)
    expect(result.nodes[0].canvasNode).toBeUndefined()
  })

  it('(3) same id with different field value is classified as modified', () => {
    const canvas = makeConfig([makeState({ id: 'state-c', task: 'v2' })])
    const baseline = makeConfig([makeState({ id: 'state-c', task: 'v1' })])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]).toMatchObject({ id: 'state-c', status: 'modified' })
    expect(result.nodes[0].canvasNode).toBeDefined()
    expect(result.nodes[0].baselineNode).toBeDefined()
  })

  it('(4) same id with identical content produces no diff entry', () => {
    const state = makeState({ id: 'state-d', task: 'same' })
    const canvas = makeConfig([state])
    const baseline = makeConfig([makeState({ id: 'state-d', task: 'same' })])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(0)
  })

  it('(4b) same id with only a canvas position change produces no diff entry', () => {
    const canvas = makeConfig([
      makeState({
        id: 'state-d',
        task: 'same',
        _meta: { type: NodeTypes.ASSISTANT, position: { x: 10, y: 20 } },
      }),
    ])
    const baseline = makeConfig([
      makeState({
        id: 'state-d',
        task: 'same',
        _meta: { type: NodeTypes.ASSISTANT, position: { x: 100, y: 200 } },
      }),
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(0)
  })

  it('(4c) measured/selected-only _meta changes do not produce a diff entry', () => {
    const canvas = makeConfig([
      makeState({
        id: 'state-d',
        task: 'same',
        _meta: {
          type: NodeTypes.ASSISTANT,
          position: { x: 10, y: 20 },
          measured: { width: 200, height: 80 },
          selected: true,
        },
      }),
    ])
    const baseline = makeConfig([
      makeState({
        id: 'state-d',
        task: 'same',
        _meta: {
          type: NodeTypes.ASSISTANT,
          position: { x: 10, y: 20 },
          measured: { width: 180, height: 72 },
          selected: false,
        },
      }),
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(0)
  })

  it('(4d) same id with only _meta.type changed is classified as modified', () => {
    const canvas = makeConfig([
      makeState({
        id: 'state-d',
        task: 'same',
        _meta: { type: NodeTypes.ASSISTANT },
      }),
    ])
    const baseline = makeConfig([
      makeState({
        id: 'state-d',
        task: 'same',
        _meta: { type: NodeTypes.TOOL },
      }),
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]).toMatchObject({ id: 'state-d', status: 'modified' })
  })

  it('(5) actor changed in assistants[] marks referencing state as modified', () => {
    const canvasAssistant: AssistantConfiguration = { id: 'asst-1', system_prompt: 'v2' }
    const baselineAssistant: AssistantConfiguration = { id: 'asst-1', system_prompt: 'v1' }
    const canvas = makeConfig(
      [makeState({ id: 'state-e', assistant_id: 'asst-1' } as unknown as StateConfiguration)],
      {
        assistants: [canvasAssistant],
      }
    )
    const baseline = makeConfig(
      [makeState({ id: 'state-e', assistant_id: 'asst-1' } as unknown as StateConfiguration)],
      {
        assistants: [baselineAssistant],
      }
    )
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]).toMatchObject({ id: 'state-e', status: 'modified' })
  })

  it('(5b) actor changed in tools[] marks referencing state as modified', () => {
    const canvasTool: ToolConfiguration = { id: 'tool-1', tool: 'http', tool_args: { url: 'v2' } }
    const baselineTool: ToolConfiguration = { id: 'tool-1', tool: 'http', tool_args: { url: 'v1' } }
    const canvas = makeConfig(
      [makeState({ id: 'state-e', tool_id: 'tool-1' } as unknown as StateConfiguration)],
      {
        tools: [canvasTool],
      }
    )
    const baseline = makeConfig(
      [makeState({ id: 'state-e', tool_id: 'tool-1' } as unknown as StateConfiguration)],
      {
        tools: [baselineTool],
      }
    )
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]).toMatchObject({ id: 'state-e', status: 'modified' })
  })

  it('(5c) actor changed in custom_nodes[] marks referencing state as modified', () => {
    const canvasCustomNode: CustomNodeConfiguration = { id: 'cn-1', name: 'v2' }
    const baselineCustomNode: CustomNodeConfiguration = { id: 'cn-1', name: 'v1' }
    const canvas = makeConfig(
      [makeState({ id: 'state-e', custom_node_id: 'cn-1' } as unknown as StateConfiguration)],
      {
        custom_nodes: [canvasCustomNode],
      }
    )
    const baseline = makeConfig(
      [makeState({ id: 'state-e', custom_node_id: 'cn-1' } as unknown as StateConfiguration)],
      {
        custom_nodes: [baselineCustomNode],
      }
    )
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]).toMatchObject({ id: 'state-e', status: 'modified' })
  })

  it('(6) child state change within an iterator is classified on its own; parent iterator is absent from nodes', () => {
    const canvasChild = makeState({ id: 'child-state', task: 'v2' })
    const baselineChild = makeState({ id: 'child-state', task: 'v1' })
    const iteratorState = makeState({
      id: 'iter-state',
      _meta: { type: NodeTypes.ITERATOR },
    })
    const canvas = makeConfig([iteratorState, canvasChild])
    const baseline = makeConfig([
      makeState({ id: 'iter-state', _meta: { type: NodeTypes.ITERATOR } }),
      baselineChild,
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes.some((n) => n.id === 'iter-state')).toBe(false)
    expect(result.nodes.some((n) => n.id === 'child-state')).toBe(true)
    expect(result.nodes.find((n) => n.id === 'child-state')?.status).toBe('modified')
  })

  it('(5d) assistant id colliding with a tool id does not mark the tool state', () => {
    const canvas = makeConfig(
      [
        makeState({ id: 'asst-state', assistant_id: 'shared-id' } as unknown as StateConfiguration),
        makeState({ id: 'tool-state', tool_id: 'shared-id' } as unknown as StateConfiguration),
      ],
      {
        assistants: [{ id: 'shared-id', system_prompt: 'v2' }],
        tools: [{ id: 'shared-id', tool: 'http', tool_args: {} }],
      }
    )
    const baseline = makeConfig(
      [
        makeState({ id: 'asst-state', assistant_id: 'shared-id' } as unknown as StateConfiguration),
        makeState({ id: 'tool-state', tool_id: 'shared-id' } as unknown as StateConfiguration),
      ],
      {
        assistants: [{ id: 'shared-id', system_prompt: 'v1' }],
        tools: [{ id: 'shared-id', tool: 'http', tool_args: {} }],
      }
    )
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes.find((n) => n.id === 'asst-state')).toMatchObject({ status: 'modified' })
    expect(result.nodes.find((n) => n.id === 'tool-state')).toBeUndefined()
  })

  it('(5e) canvas-only state that references a new or changed actor stays added', () => {
    const canvas = makeConfig(
      [makeState({ id: 'state-new', assistant_id: 'asst-new' } as unknown as StateConfiguration)],
      {
        assistants: [{ id: 'asst-new', system_prompt: 'hello' }],
      }
    )
    const baseline = makeConfig([])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes.find((n) => n.id === 'state-new')).toMatchObject({ status: 'added' })
  })

  it('(7) empty baseline means all canvas states are added', () => {
    const canvas = makeConfig([
      makeState({ id: 'state-x' }),
      makeState({ id: 'state-y' }),
      makeState({ id: 'state-z' }),
    ])
    const baseline = makeConfig([])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes).toHaveLength(3)
    expect(result.nodes.every((n) => n.status === 'added')).toBe(true)
  })

  const condition = (otherwise: string) => ({
    expression: 'result.status == success',
    then: 'Assistant_2',
    otherwise,
  })

  const assistantWithCondition = (otherwise: string, extra: Partial<StateConfiguration> = {}) =>
    makeState({
      id: 'Assistant_1',
      task: 'unchanged',
      next: {
        meta_next_state_id: 'conditional_1',
        condition: condition(otherwise),
      },
      ...extra,
    })

  const conditionalNode = (otherwise: string) =>
    makeState({
      id: 'conditional_1',
      _meta: {
        type: NodeTypes.CONDITIONAL,
        data: { next: { condition: condition(otherwise) } },
      },
    })

  it('(8) condition.otherwise-only change does not mark the conditional or the parent', () => {
    const canvas = makeConfig([
      assistantWithCondition('Assistant_4'),
      conditionalNode('Assistant_4'),
    ])
    const baseline = makeConfig([
      assistantWithCondition('Assistant_3'),
      conditionalNode('Assistant_3'),
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes.find((n) => n.id === 'Assistant_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'conditional_1')).toBeUndefined()
  })

  it('(8aa) condition.expression change marks the conditional, not the parent', () => {
    const condition = (expression: string) => ({
      expression,
      then: 'Assistant_2',
      otherwise: 'Assistant_3',
    })
    const graph = (expression: string) =>
      makeConfig([
        makeState({
          id: 'Assistant_1',
          task: 'unchanged',
          next: { meta_next_state_id: 'conditional_1', condition: condition(expression) },
        }),
        makeState({
          id: 'conditional_1',
          _meta: {
            type: NodeTypes.CONDITIONAL,
            data: { next: { condition: condition(expression) } },
          },
        }),
      ])
    const result = diffWorkflowGraphs(graph('is_complete == true'), graph('is_complete == false'))

    expect(result.nodes.find((n) => n.id === 'Assistant_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'conditional_1')).toMatchObject({ status: 'modified' })
  })

  it('(8b) parent task change still marks the assistant when condition is unchanged', () => {
    const canvas = makeConfig([
      assistantWithCondition('Assistant_3', { task: 'v2' }),
      conditionalNode('Assistant_3'),
    ])
    const baseline = makeConfig([
      assistantWithCondition('Assistant_3', { task: 'v1' }),
      conditionalNode('Assistant_3'),
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes.find((n) => n.id === 'Assistant_1')).toMatchObject({ status: 'modified' })
    expect(result.nodes.find((n) => n.id === 'conditional_1')).toBeUndefined()
  })

  it('(8c) next.state_id change without a condition does not mark the parent', () => {
    const canvas = makeConfig([makeState({ id: 'Assistant_1', next: { state_id: 'End' } })])
    const baseline = makeConfig([makeState({ id: 'Assistant_1', next: { state_id: 'Other' } })])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes.find((n) => n.id === 'Assistant_1')).toBeUndefined()
  })

  it('(8d) switch.default-only change does not mark the switch node or the parent', () => {
    const switchNext = (defaultId: string) => ({
      switch: {
        cases: [{ condition: 'x == 1', state_id: 'Assistant_2' }],
        default: defaultId,
      },
    })
    const canvas = makeConfig([
      makeState({
        id: 'Assistant_1',
        next: { meta_next_state_id: 'switch_1', ...switchNext('Assistant_4') },
      }),
      makeState({
        id: 'switch_1',
        _meta: { type: NodeTypes.SWITCH, data: { next: switchNext('Assistant_4') } },
      }),
    ])
    const baseline = makeConfig([
      makeState({
        id: 'Assistant_1',
        next: { meta_next_state_id: 'switch_1', ...switchNext('Assistant_3') },
      }),
      makeState({
        id: 'switch_1',
        _meta: { type: NodeTypes.SWITCH, data: { next: switchNext('Assistant_3') } },
      }),
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes.find((n) => n.id === 'Assistant_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'switch_1')).toBeUndefined()
  })

  it('(8e) introducing a conditional after an assistant does not mark the assistant modified', () => {
    const canvas = makeConfig([
      makeState({ id: 'Assistant_1', task: 'same', next: { state_id: 'end' } }),
    ])
    const baseline = makeConfig([
      assistantWithCondition('Assistant_3', { task: 'same' }),
      conditionalNode('Assistant_3'),
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes.find((n) => n.id === 'Assistant_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'conditional_1')?.status).toBe('removed')
  })

  it('(8f) next.output_key change still marks the node', () => {
    const canvas = makeConfig([
      makeState({ id: 'Assistant_1', next: { state_id: 'End', output_key: 'v2' } }),
    ])
    const baseline = makeConfig([
      makeState({ id: 'Assistant_1', next: { state_id: 'End', output_key: 'v1' } }),
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes.find((n) => n.id === 'Assistant_1')).toMatchObject({ status: 'modified' })
  })

  const switchNext = (caseTarget: string, caseCondition = 'x == 1') => ({
    switch: {
      cases: [{ condition: caseCondition, state_id: caseTarget }],
      default: 'Assistant_4',
    },
  })

  const switchGraph = (caseTarget: string, caseCondition = 'x == 1') =>
    makeConfig([
      makeState({
        id: 'Assistant_1',
        next: { meta_next_state_id: 'switch_1', ...switchNext(caseTarget, caseCondition) },
      }),
      makeState({
        id: 'switch_1',
        _meta: { type: NodeTypes.SWITCH, data: { next: switchNext(caseTarget, caseCondition) } },
      }),
    ])

  it('(8g) switch case target-only change does not mark the switch', () => {
    const result = diffWorkflowGraphs(switchGraph('Assistant_3'), switchGraph('Assistant_2'))

    expect(result.nodes.find((n) => n.id === 'Assistant_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'switch_1')).toBeUndefined()
  })

  it('(8h) switch case expression change marks the switch', () => {
    const result = diffWorkflowGraphs(
      switchGraph('Assistant_2', 'x == 2'),
      switchGraph('Assistant_2', 'x == 1')
    )

    expect(result.nodes.find((n) => n.id === 'Assistant_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'switch_1')).toMatchObject({ status: 'modified' })
  })

  it('(8i) adding a switch case marks the switch', () => {
    const withNewCase = makeConfig([
      makeState({
        id: 'Assistant_1',
        next: {
          meta_next_state_id: 'switch_1',
          switch: {
            cases: [
              { condition: 'x == 1', state_id: 'Assistant_2' },
              { condition: "category == 'delta'", state_id: 'Assistant_5' },
            ],
            default: 'Assistant_4',
          },
        },
      }),
      makeState({
        id: 'switch_1',
        _meta: {
          type: NodeTypes.SWITCH,
          data: {
            next: {
              switch: {
                cases: [
                  { condition: 'x == 1', state_id: 'Assistant_2' },
                  { condition: "category == 'delta'", state_id: 'Assistant_5' },
                ],
                default: 'Assistant_4',
              },
            },
          },
        },
      }),
    ])
    const result = diffWorkflowGraphs(withNewCase, switchGraph('Assistant_2'))

    expect(result.nodes.find((n) => n.id === 'switch_1')).toMatchObject({ status: 'modified' })
  })

  const iteratorGraph = (iterKey: string, iteratorMetaKey = iterKey) =>
    makeConfig([
      makeState({
        id: 'Process_item_1',
        task: 'process',
        next: { state_id: 'Enrich_item', iter_key: iterKey },
      }),
      makeState({
        id: 'Enrich_item',
        task: 'enrich',
        next: { state_id: 'End', meta_iter_state_id: 'iterator_1' },
      }),
      makeState({
        id: 'iterator_1',
        _meta: { type: NodeTypes.ITERATOR, data: { next: { iter_key: iteratorMetaKey } } },
      }),
    ])

  it('(9) iter_key change marks the iterator, not the preceding node', () => {
    const result = diffWorkflowGraphs(iteratorGraph('item2'), iteratorGraph('item1'))

    expect(result.nodes.find((n) => n.id === 'Process_item_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'Enrich_item')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'iterator_1')).toMatchObject({ status: 'modified' })
  })

  it('(9b) parent-only iter_key YAML change still marks the iterator', () => {
    const result = diffWorkflowGraphs(
      iteratorGraph('item2', 'item1'),
      iteratorGraph('item1', 'item1')
    )

    expect(result.nodes.find((n) => n.id === 'Process_item_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'iterator_1')).toMatchObject({ status: 'modified' })
  })

  it('(9c) parent task change still marks the preceding node when iter_key is unchanged', () => {
    const withTask = (task: string) =>
      makeConfig([
        makeState({
          id: 'Process_item_1',
          task,
          next: { state_id: 'Enrich_item', iter_key: 'item1' },
        }),
        makeState({
          id: 'Enrich_item',
          task: 'enrich',
          next: { state_id: 'End', meta_iter_state_id: 'iterator_1' },
        }),
        makeState({
          id: 'iterator_1',
          _meta: { type: NodeTypes.ITERATOR, data: { next: { iter_key: 'item1' } } },
        }),
      ])
    const result = diffWorkflowGraphs(withTask('v2'), withTask('process'))

    expect(result.nodes.find((n) => n.id === 'Process_item_1')).toMatchObject({
      status: 'modified',
    })
    expect(result.nodes.find((n) => n.id === 'iterator_1')).toBeUndefined()
  })

  it('(9e) iter_key change via switch.default still marks the iterator', () => {
    const switchNext = (iterKey: string) => ({
      meta_next_state_id: 'switch_1',
      iter_key: iterKey,
      switch: {
        cases: [{ condition: 'x == 1', state_id: 'Assistant_2' }],
        default: 'Enrich_item',
      },
    })
    const graph = (iterKey: string) =>
      makeConfig([
        makeState({
          id: 'Process_item_1',
          task: 'process',
          next: switchNext(iterKey),
        }),
        makeState({
          id: 'switch_1',
          _meta: { type: NodeTypes.SWITCH, data: { next: switchNext(iterKey) } },
        }),
        makeState({
          id: 'Enrich_item',
          task: 'enrich',
          next: { state_id: 'End', meta_iter_state_id: 'iterator_1' },
        }),
        makeState({
          id: 'iterator_1',
          _meta: { type: NodeTypes.ITERATOR, data: { next: { iter_key: 'item1' } } },
        }),
      ])
    const result = diffWorkflowGraphs(graph('item2'), graph('item1'))

    expect(result.nodes.find((n) => n.id === 'Process_item_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'iterator_1')).toMatchObject({ status: 'modified' })
  })

  it('(9f) iter_key change on a switch meta next still marks the iterator', () => {
    const switchMetaNext = (iterKey: string) => ({
      iter_key: iterKey,
      switch: {
        cases: [{ condition: 'x == 1', state_id: 'Assistant_2' }],
        default: 'conditional_1',
      },
    })
    const graph = (iterKey: string) =>
      makeConfig([
        makeState({
          id: 'switch_1',
          _meta: { type: NodeTypes.SWITCH, data: { next: switchMetaNext(iterKey) } },
        }),
        makeState({
          id: 'conditional_1',
          _meta: {
            type: NodeTypes.CONDITIONAL,
            data: {
              next: {
                condition: {
                  expression: 'result.status == success',
                  then: 'End',
                  otherwise: 'End',
                },
                meta_iter_state_id: 'iterator_1',
              },
            },
          },
        }),
        makeState({
          id: 'iterator_1',
          _meta: { type: NodeTypes.ITERATOR, data: { next: { iter_key: 'item1' } } },
        }),
      ])
    const result = diffWorkflowGraphs(graph('item2'), graph('item1'))

    expect(result.nodes.find((n) => n.id === 'switch_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'conditional_1')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'iterator_1')).toMatchObject({ status: 'modified' })
  })

  it('(9g) iter_key change with two iterator-linked children marks both iterators', () => {
    const graph = (iterKey: string) =>
      makeConfig([
        makeState({
          id: 'parent',
          task: 'process',
          next: {
            condition: { then: 'child_a', otherwise: 'child_b' },
            iter_key: iterKey,
          },
        }),
        makeState({
          id: 'child_a',
          next: { meta_iter_state_id: 'iterator_a' },
        }),
        makeState({
          id: 'child_b',
          next: { meta_iter_state_id: 'iterator_b' },
        }),
        makeState({
          id: 'iterator_a',
          _meta: { type: NodeTypes.ITERATOR, data: { next: { iter_key: 'ka' } } },
        }),
        makeState({
          id: 'iterator_b',
          _meta: { type: NodeTypes.ITERATOR, data: { next: { iter_key: 'kb' } } },
        }),
      ])
    const result = diffWorkflowGraphs(graph('item2'), graph('item1'))

    expect(result.nodes.find((n) => n.id === 'parent')).toBeUndefined()
    expect(result.nodes.find((n) => n.id === 'iterator_a')).toMatchObject({ status: 'modified' })
    expect(result.nodes.find((n) => n.id === 'iterator_b')).toMatchObject({ status: 'modified' })
  })

  it('(9d) note text change marks the note node', () => {
    const canvas = makeConfig([
      makeState({ id: 'note_1', _meta: { type: NodeTypes.NOTE, data: { note: 'v2' } } }),
    ])
    const baseline = makeConfig([
      makeState({ id: 'note_1', _meta: { type: NodeTypes.NOTE, data: { note: 'v1' } } }),
    ])
    const result = diffWorkflowGraphs(canvas, baseline)

    expect(result.nodes.find((n) => n.id === 'note_1')).toMatchObject({ status: 'modified' })
  })

  it('does not emit console.warn on duplicate state ids and classifies the last write', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const canvas = makeConfig([
      makeState({ id: 'dup-state', task: 'ignored' }),
      makeState({ id: 'dup-state', task: 'v2' }),
    ])
    const baseline = makeConfig([makeState({ id: 'dup-state', task: 'v1' })])

    try {
      const result = diffWorkflowGraphs(canvas, baseline)

      expect(warnSpy).not.toHaveBeenCalled()
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0]).toMatchObject({ id: 'dup-state', status: 'modified' })
      expect(result.nodes[0].canvasNode).toMatchObject({ id: 'dup-state', task: 'v2' })
    } finally {
      warnSpy.mockRestore()
    }
  })
})
