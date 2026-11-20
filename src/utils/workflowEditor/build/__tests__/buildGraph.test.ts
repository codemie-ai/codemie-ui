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

import { describe, it, expect } from 'vitest'

import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import { deserialize } from '../../serialization/deserializer/deserializer'
import buildGraph from '../index'

type Position = { x: number; y: number }

const loadConfig = (filename: string): WorkflowConfiguration =>
  deserialize(
    readFileSync(
      join(__dirname, '../../serialization/deserializer/__tests__/fixtures', filename),
      'utf-8'
    )
  )

// Keeps a saved position on the listed states only; every other state is left unpositioned
const withSavedPositions = (
  config: WorkflowConfiguration,
  positions: Record<string, Position>
): WorkflowConfiguration => ({
  ...config,
  states: config.states.map((state) => ({
    ...state,
    _meta: { ...state._meta, type: state._meta?.type ?? '', position: positions[state.id] },
  })),
})

const positionById = (items: { id: string; position: Position }[]) =>
  new Map(items.map((item) => [item.id, item.position]))

describe('buildGraph - placement of unpositioned nodes', () => {
  const saved = {
    start: { x: 0, y: 0 },
    analyzer: { x: 600, y: 300 },
  }

  it('places unpositioned nodes apart and leaves positioned nodes untouched', () => {
    const config = withSavedPositions(loadConfig('workflow-with-branches.yaml'), saved)

    const { nodes } = buildGraph(config, true)

    const positions = positionById(nodes)
    expect(positions.get('start')).toEqual(saved.start)
    expect(positions.get('analyzer')).toEqual(saved.analyzer)

    const unpositioned = nodes.filter((node) => !(node.id in saved))
    const keys = unpositioned.map((node) => `${node.position.x},${node.position.y}`)
    expect(unpositioned.length).toBeGreaterThan(1)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('writes the placed positions to config without duplicate default positions', () => {
    const config = withSavedPositions(loadConfig('workflow-with-branches.yaml'), saved)

    const { config: result, nodes } = buildGraph(config, true)

    const saturated = result.states.map((state) => state._meta?.position)
    const keys = saturated.map((position) => `${position?.x},${position?.y}`)
    expect(saturated.every(Boolean)).toBe(true)
    expect(new Set(keys).size).toBe(keys.length)
    expect(positionById(result.states.map((s) => ({ id: s.id, position: s._meta!.position! })))).toEqual(
      positionById(nodes)
    )
  })

  it('keeps an unpositioned iterator child inside its saved iterator frame', () => {
    const config = withSavedPositions(loadConfig('workflow-with-iterator.yaml'), {
      start: { x: 0, y: 0 },
      iterator_1: { x: 1000, y: 500 },
    })

    const { nodes } = buildGraph(config, true)

    const child = nodes.find((node) => node.id === 'process_item')!
    expect(child.parentId).toBe('iterator_1')
    // Placed rather than left on the shared default, and still inside the iterator's frame
    expect(child.position).not.toEqual({ x: 100, y: 100 })
    expect(child.position.x).toBeGreaterThanOrEqual(0)
    expect(child.position.y).toBeGreaterThanOrEqual(0)
    expect(child.position.x).toBeLessThan(500)
    expect(child.position.y).toBeLessThan(500)
  })

  it('leaves every position untouched when all nodes are positioned', () => {
    const base = loadConfig('workflow-with-branches.yaml')
    const all = Object.fromEntries(
      base.states.map((state, index) => [state.id, { x: index * 10, y: index * 20 }])
    )

    const { nodes } = buildGraph(withSavedPositions(base, all), true)

    const expected = new Map(Object.entries(all))
    for (const node of nodes) {
      expect(node.position).toEqual(expected.get(node.id))
    }
  })

  it('still lays out every node when none is positioned', () => {
    const { nodes } = buildGraph(loadConfig('workflow-with-branches.yaml'), true)

    const keys = nodes.map((node) => `${node.position.x},${node.position.y}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
