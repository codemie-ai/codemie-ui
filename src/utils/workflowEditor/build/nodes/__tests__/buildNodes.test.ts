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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import { buildNodes } from '../buildNodes'

const connected = (type: string, extra: Record<string, unknown> = {}) => ({
  type,
  is_connected: true,
  ...extra,
})

const condition = { expression: 'x', then: 'a', otherwise: 'b' }

// A decision parent whose sibling state_id is not followed by the entry walk
const decisionWithSibling = (): WorkflowConfiguration =>
  ({
    states: [
      { id: 'start', _meta: connected('start'), next: { state_id: 'p' } },
      {
        id: 'p',
        _meta: connected('assistant'),
        next: { condition, state_id: 'c', meta_next_state_id: 'cond_1' },
      },
      {
        id: 'cond_1',
        _meta: connected('conditional', { data: { next: { condition } } }),
      },
      { id: 'a', _meta: connected('assistant'), next: { state_id: 'end' } },
      { id: 'b', _meta: connected('assistant'), next: { state_id: 'end' } },
      { id: 'c', _meta: connected('assistant'), next: { state_id: 'end' } },
      { id: 'end', _meta: connected('end') },
    ],
  }) as unknown as WorkflowConfiguration

const ids = (nodes: { id: string }[]) => nodes.map((node) => node.id)

describe('buildNodes - flat node membership', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it('adds a state the entry walk skipped and warns once for it', () => {
    const nodes = buildNodes(decisionWithSibling())

    const nodeIds = ids(nodes)
    expect(nodeIds.filter((id) => id === 'c')).toHaveLength(1)
    expect(new Set(nodeIds).size).toBe(nodeIds.length)
    expect(nodeIds).toEqual(expect.arrayContaining(['start', 'p', 'cond_1', 'a', 'b', 'end']))
    expect(nodeIds.indexOf('c')).toBeGreaterThan(nodeIds.indexOf('b'))
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('Node added outside entry walk: c')
  })

  it('adds an iterator child the entry walk skipped, with one iterator node', () => {
    const config = {
      states: [
        { id: 'start', _meta: connected('start'), next: { state_id: 'p' } },
        {
          id: 'p',
          _meta: connected('assistant'),
          next: { condition, state_id: 'c', meta_next_state_id: 'cond_1' },
        },
        { id: 'cond_1', _meta: connected('conditional', { data: { next: { condition } } }) },
        { id: 'a', _meta: connected('assistant'), next: { state_id: 'end' } },
        { id: 'b', _meta: connected('assistant'), next: { state_id: 'end' } },
        {
          id: 'c',
          _meta: connected('assistant'),
          next: { state_id: 'end', meta_iter_state_id: 'iterator_1' },
        },
        { id: 'iterator_1', _meta: connected('iterator') },
        { id: 'end', _meta: connected('end') },
      ],
    } as unknown as WorkflowConfiguration

    const nodes = buildNodes(config)

    const nodeIds = ids(nodes)
    expect(new Set(nodeIds).size).toBe(nodeIds.length)
    expect(nodeIds.filter((id) => id === 'iterator_1')).toHaveLength(1)
    expect(nodes.filter((node) => node.parentId === 'iterator_1').map((node) => node.id)).toEqual([
      'c',
    ])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('Node added outside entry walk: c')
  })

  it('does not duplicate nodes or warn when the entry walk reaches every state', () => {
    const config = {
      states: [
        { id: 'start', _meta: connected('start'), next: { state_id: 'p' } },
        { id: 'p', _meta: connected('assistant'), next: { state_id: 'q' } },
        { id: 'q', _meta: connected('assistant'), next: { state_id: 'end' } },
        { id: 'end', _meta: connected('end') },
      ],
    } as unknown as WorkflowConfiguration

    const nodeIds = ids(buildNodes(config))

    expect(nodeIds.sort()).toEqual(['end', 'p', 'q', 'start'])
    expect(warn).not.toHaveBeenCalled()
  })
})
