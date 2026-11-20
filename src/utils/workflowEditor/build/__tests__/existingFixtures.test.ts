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

import { deserialize } from '../../serialization/deserializer/deserializer'
import buildGraph from '../index'

const loadFixture = (filename: string): string =>
  readFileSync(
    join(__dirname, '../../serialization/deserializer/__tests__/fixtures', filename),
    'utf-8'
  )

const buildFromFixture = (filename: string) => {
  const { nodes, edges } = buildGraph(deserialize(loadFixture(filename)), true)
  return {
    nodeIds: nodes.map((node) => node.id).sort(),
    edgeKeys: edges.map((edge) => `${edge.source}->${edge.target}`).sort(),
  }
}

describe('buildGraph - existing fixtures', () => {
  it('builds nodes and edges for workflow-with-branches', () => {
    const { nodeIds, edgeKeys } = buildFromFixture('workflow-with-branches.yaml')

    expect(nodeIds).toEqual([
      'analyzer',
      'check_quality',
      'conditional_1',
      'documentation_java',
      'documentation_python',
      'end',
      'orphan_test',
      'start',
      'switch_1',
      'unknown_language',
    ])
    expect(edgeKeys).toEqual([
      'analyzer->switch_1',
      'check_quality->conditional_1',
      'conditional_1->analyzer',
      'conditional_1->end',
      'documentation_java->end',
      'documentation_python->end',
      'orphan_test->end',
      'start->check_quality',
      'switch_1->documentation_java',
      'switch_1->documentation_python',
      'switch_1->unknown_language',
      'unknown_language->end',
    ])
  })

  it('builds nodes and edges for workflow-with-iterator', () => {
    const { nodeIds, edgeKeys } = buildFromFixture('workflow-with-iterator.yaml')

    expect(nodeIds).toEqual(['end', 'fetch_items', 'iterator_1', 'process_item', 'start'])
    expect(edgeKeys).toEqual([
      'fetch_items->process_item',
      'process_item->end',
      'start->fetch_items',
    ])
  })

  it('builds nodes and edges for workflow-with-multiple-iterators', () => {
    const { nodeIds, edgeKeys } = buildFromFixture('workflow-with-multiple-iterators.yaml')

    expect(nodeIds).toEqual([
      'end',
      'fetch_items',
      'iterator_1',
      'process_item',
      'start',
      'validate_item',
    ])
    expect(edgeKeys).toEqual([
      'fetch_items->process_item',
      'fetch_items->validate_item',
      'process_item->end',
      'start->fetch_items',
      'validate_item->end',
    ])
  })

  it('builds nodes and edges for workflow-with-same-iter-key', () => {
    const { nodeIds, edgeKeys } = buildFromFixture('workflow-with-same-iter-key.yaml')

    expect(nodeIds).toEqual([
      'another_state',
      'end',
      'fetch_items',
      'iterator_1',
      'process_item',
      'start',
      'validate_item',
    ])
    expect(edgeKeys).toEqual([
      'another_state->validate_item',
      'fetch_items->process_item',
      'process_item->end',
      'start->fetch_items',
      'validate_item->end',
    ])
  })
})
