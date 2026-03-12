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

import { describe, it, expect } from 'vitest'

import { StateConfiguration } from '@/types/workflowEditor/configuration'

import { START_NODE_ID, END_NODE_ID } from '../../../constants'
import { findDirectParents, findParents, findDirectChildren } from '../stateRelations'

describe('findDirectParents', () => {
  it('should find parent with iter_key and state_id reference', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'child1', iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const parents = findDirectParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })

  it('should find parent with iter_key and state_ids array reference', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_ids: ['child1', 'child2'], iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const parents = findDirectParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })

  it('should find multiple parents with iter_key', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'child1', iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'parent2',
        next: { state_ids: ['child1', 'other'], iter_key: 'users' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const parents = findDirectParents('child1', states)
    expect(parents).toEqual(['parent1', 'parent2'])
  })

  it('should find parent regardless of iter_key', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'child1' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const parents = findDirectParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })

  it('should return empty array when no parents reference the state', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'other', iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const parents = findDirectParents('child1', states)
    expect(parents).toEqual([])
  })

  it('should handle states without next property', () => {
    const states: StateConfiguration[] = [
      {
        id: 'state1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'state2',
        next: { state_id: 'state3', iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const parents = findDirectParents('state1', states)
    expect(parents).toEqual([])
  })

  it('should find parents with same iter_key', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'child1', iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'parent2',
        next: { state_ids: ['child1', 'other'], iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const parents = findDirectParents('child1', states)
    expect(parents).toEqual(['parent1', 'parent2'])
  })

  it('should find parents regardless of iter_key value', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'child1', iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'parent2',
        next: { state_id: 'child1', iter_key: 'users' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'parent3',
        next: { state_id: 'child1', iter_key: 'data' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const parents = findDirectParents('child1', states)
    expect(parents).toEqual(['parent1', 'parent2', 'parent3'])
  })

  it('should handle child in state_ids array', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_ids: ['other1', 'child1', 'other2'], iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const parents = findDirectParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })

  it('should handle empty states array', () => {
    const parents = findDirectParents('child1', [])
    expect(parents).toEqual([])
  })

  it('should not find parent that has iter_key but references different child', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'child2', iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'parent2',
        next: { state_ids: ['child2', 'child3'], iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const parents = findDirectParents('child1', states)
    expect(parents).toEqual([])
  })
})

describe('findParents', () => {
  it('should find parents with direct state_id reference', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'child1' },
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
    ]

    const parents = findParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })

  it('should find parents with state_ids array reference', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_ids: ['child1', 'child2'] },
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
    ]

    const parents = findParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })

  it('should find parents with condition logic', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        _meta: {
          type: 'conditional',
          is_connected: true,
          data: {
            next: {
              condition: {
                expression: 'x > 0',
                then: 'child1', // nosonar
                otherwise: 'child2',
              },
            },
          },
        },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
    ]

    const parents = findParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })

  it('should find parents via condition otherwise branch', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        _meta: {
          type: 'conditional',
          is_connected: true,
          data: {
            next: {
              condition: {
                expression: 'x > 0',
                then: 'child2', // nosonar
                otherwise: 'child1',
              },
            },
          },
        },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
    ]

    const parents = findParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })

  it('should find parents with switch logic via cases', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        _meta: {
          type: 'switch',
          is_connected: true,
          data: {
            next: {
              switch: {
                arg: 'type',
                cases: [
                  { condition: 'a', state_id: 'child1' },
                  { condition: 'b', state_id: 'child2' },
                ],
                default: 'child3',
              },
            },
          },
        },
      } as unknown as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
    ]

    const parents = findParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })

  it('should find parents with switch logic via default', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        _meta: {
          type: 'switch',
          is_connected: true,
          data: {
            next: {
              switch: {
                arg: 'type',
                cases: [
                  { condition: 'a', state_id: 'child2' },
                  { condition: 'b', state_id: 'child3' },
                ],
                default: 'child1',
              },
            },
          },
        },
      } as unknown as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
    ]

    const parents = findParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })

  it('should find multiple parents from different connection types', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'child1' },
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
      {
        id: 'parent2',
        _meta: {
          type: 'conditional',
          is_connected: true,
          data: {
            next: {
              condition: {
                expression: 'x > 0',
                then: 'child1', // nosonar
                otherwise: 'other',
              },
            },
          },
        },
      } as StateConfiguration,
      {
        id: 'parent3',
        _meta: {
          type: 'switch',
          is_connected: true,
          data: {
            next: {
              switch: {
                arg: 'type',
                cases: [{ condition: 'a', state_id: 'child1' }],
                default: 'other',
              },
            },
          },
        },
      } as unknown as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
    ]

    const parents = findParents('child1', states)
    expect(parents).toEqual(['parent1', 'parent2', 'parent3'])
  })

  it('should return empty array when no parents reference the state', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'other' },
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
    ]

    const parents = findParents('child1', states)
    expect(parents).toEqual([])
  })

  it('should handle states without next property', () => {
    const states: StateConfiguration[] = [
      {
        id: 'state1',
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
      {
        id: 'state2',
        next: { state_id: 'state3' },
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
    ]

    const parents = findParents('state1', states)
    expect(parents).toEqual([])
  })

  it('should handle empty states array', () => {
    const parents = findParents('child1', [])
    expect(parents).toEqual([])
  })

  it('should handle meta states with decision logic', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        _meta: {
          type: 'conditional',
          is_connected: true,
          data: {
            next: {
              condition: {
                expression: 'x > 0',
                then: 'child1', // nosonar
                otherwise: 'child2',
              },
            },
          },
        },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true },
      } as StateConfiguration,
    ]

    const parents = findParents('child1', states)
    expect(parents).toEqual(['parent1'])
  })
})

describe('findDirectChildren', () => {
  it('should find single child via state_id', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_id: 'child1' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const children = findDirectChildren('parent1', states)
    expect(children).toEqual(['child1'])
  })

  it('should find multiple children via state_ids array', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_ids: ['child1', 'child2', 'child3'] },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child2',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child3',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const children = findDirectChildren('parent1', states)
    expect(children).toEqual(['child1', 'child2', 'child3'])
  })

  it('should return empty array when state does not exist or has no next', () => {
    const states: StateConfiguration[] = [
      {
        id: 'state1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    expect(findDirectChildren('nonexistent', states)).toEqual([])
    expect(findDirectChildren('state1', states)).toEqual([])
  })

  it('should filter out START_NODE_ID and END_NODE_ID from children', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_ids: [START_NODE_ID, 'child1', END_NODE_ID, 'child2'] },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: START_NODE_ID,
        _meta: { type: 'start', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: END_NODE_ID,
        _meta: { type: 'end', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child2',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const children = findDirectChildren('parent1', states)
    expect(children).toEqual(['child1', 'child2'])
  })

  it('should filter out non-existent child IDs', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_ids: ['child1', 'nonexistent', 'child2'] },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child2',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const children = findDirectChildren('parent1', states)
    expect(children).toEqual(['child1', 'child2'])
  })

  it('should handle state with iter_key', () => {
    const states: StateConfiguration[] = [
      {
        id: 'parent1',
        next: { state_ids: ['child1', 'child2'], iter_key: 'items' },
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child1',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
      {
        id: 'child2',
        _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
      } as StateConfiguration,
    ]

    const children = findDirectChildren('parent1', states)
    expect(children).toEqual(['child1', 'child2'])
  })
})
