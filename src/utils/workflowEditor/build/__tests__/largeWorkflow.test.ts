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

import yaml from 'js-yaml'
import { describe, it, expect } from 'vitest'

import { WorkflowNode } from '@/types/workflowEditor/base'

import { deserialize } from '../../serialization/deserializer/deserializer'
import buildGraph from '../index'

type Position = { x: number; y: number }

interface RawState {
  id: string
  next?: {
    state_id?: string
    state_ids?: string[]
    condition?: { then: string; otherwise: string }
    switch?: { cases: { state_id: string }[]; default: string }
  }
}

interface RawMetaState {
  id: string
  position?: Position
}

const source = readFileSync(join(__dirname, 'fixtures', 'large-workflow.yaml'), 'utf-8')
const raw = yaml.load(source) as { states: RawState[]; meta_states: RawMetaState[] }

const config = deserialize(source)
const { nodes, edges } = buildGraph(config, true)

// Branch node id of each decision parent, as assigned by the deserializer
const branchIdOf = (parentId: string): string =>
  config.states.find((state) => state.id === parentId)!.next!.meta_next_state_id!

const decisionParents = raw.states.filter((s) => s.next?.condition || s.next?.switch)

// Every transition written in the YAML, as `source->target`
const expectedEdgeKeys = (): string[] => {
  const keys = ['start->intake']
  for (const { id, next } of raw.states) {
    if (next?.state_id) keys.push(`${id}->${next.state_id}`)
    next?.state_ids?.forEach((target) => keys.push(`${id}->${target}`))
    if (next?.condition) {
      const branchId = branchIdOf(id)
      keys.push(`${id}->${branchId}`)
      keys.push(`${branchId}->${next.condition.then}`, `${branchId}->${next.condition.otherwise}`)
    }
    if (next?.switch) {
      const branchId = branchIdOf(id)
      keys.push(`${id}->${branchId}`)
      next.switch.cases.forEach((c) => keys.push(`${branchId}->${c.state_id}`))
      keys.push(`${branchId}->${next.switch.default}`)
    }
  }
  return keys.sort()
}

const absolutePosition = (node: WorkflowNode): Position => {
  const parent = node.parentId ? nodes.find((n) => n.id === node.parentId) : undefined
  return parent
    ? { x: parent.position.x + node.position.x, y: parent.position.y + node.position.y }
    : node.position
}

describe('buildGraph - large workflow', () => {
  it('builds a node for every YAML state and only start, end, branch and iterator nodes besides', () => {
    const branchIds = decisionParents.map((s) => branchIdOf(s.id))
    const iteratorIds = config.states.filter((s) => s._meta?.type === 'iterator').map((s) => s.id)

    expect(raw.states).toHaveLength(50)
    expect(branchIds).toHaveLength(6)
    expect(iteratorIds).toHaveLength(1)

    const expectedIds = [
      ...raw.states.map((s) => s.id),
      'start',
      'end',
      ...branchIds,
      ...iteratorIds,
    ].sort()

    expect(nodes.map((n) => n.id).sort()).toEqual(expectedIds)
    expect(nodes).toHaveLength(59)
  })

  it('gives every node and every branch a unique id', () => {
    const ids = nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)

    const branchIds = decisionParents.map((s) => branchIdOf(s.id))
    expect(new Set(branchIds).size).toBe(6)
    // The shared meta_next_state_id stays with the first parent only
    expect(branchIdOf('review_one')).toBe('conditional_7')
    expect(branchIdOf('review_two')).not.toBe('conditional_7')
    // Neither the user state named conditional_1 nor an already generated id is reused
    expect(branchIds).not.toContain('conditional_1')
    expect(branchIdOf('fan_join')).toBe('conditional_8')
    expect(branchIdOf('late_check')).not.toBe('conditional_8')
    expect(nodes.find((n) => n.id === 'conditional_1')!.type).toBe('assistant')
  })

  it('has one edge per transition and every edge endpoint exists as a node', () => {
    const edgeKeys = edges.map((e) => `${e.source}->${e.target}`).sort()

    expect(edgeKeys).toEqual(expectedEdgeKeys())
    expect(edges).toHaveLength(74)

    const ids = new Set(nodes.map((n) => n.id))
    for (const edge of edges) {
      expect(ids.has(edge.source)).toBe(true)
      expect(ids.has(edge.target)).toBe(true)
    }
    expect(new Set(edges.map((e) => e.id)).size).toBe(edges.length)
  })

  it('keeps saved positions and places every other node apart', () => {
    const saved = new Map(raw.meta_states.filter((m) => m.position).map((m) => [m.id, m.position!]))
    expect(saved.size).toBe(21)

    for (const [id, position] of saved) {
      expect(nodes.find((n) => n.id === id)!.position).toEqual(position)
    }

    const unpositioned = nodes.filter((n) => !saved.has(n.id))
    expect(unpositioned).toHaveLength(59 - 21)
    const keys = unpositioned.map((n) => {
      const { x, y } = absolutePosition(n)
      return `${x},${y}`
    })
    expect(new Set(keys).size).toBe(keys.length)
  })
})
