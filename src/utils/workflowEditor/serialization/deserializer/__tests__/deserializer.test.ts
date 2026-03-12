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

import { describe, it, expect, beforeAll } from 'vitest'

import { NodeTypes } from '@/types/workflowEditor/base'
import { START_NODE_ID, END_NODE_ID } from '@/utils/workflowEditor/constants'

import { deserialize } from '../deserializer'

const loadFixture = (filename: string): string => {
  return readFileSync(join(__dirname, 'fixtures', filename), 'utf-8')
}

describe('deserialize - workflow with branches', () => {
  let loadedConfig

  beforeAll(() => {
    const yaml = loadFixture('workflow-with-branches.yaml')
    loadedConfig = deserialize(yaml)
  })

  it('creates boundary nodes (start/end)', () => {
    const { states } = loadedConfig

    const startNode = states.find((s) => s.id === START_NODE_ID)
    expect(startNode).toBeDefined()
    expect(startNode._meta.type).toBe(NodeTypes.START)

    const endNode = states.find((s) => s.id === END_NODE_ID)
    expect(endNode).toBeDefined()
    expect(endNode._meta.type).toBe(NodeTypes.END)
  })

  it('creates connected assistant states', () => {
    const { states } = loadedConfig

    const analyzerState = states.find((s) => s.id === 'analyzer')
    expect(analyzerState).toBeDefined()
    expect(analyzerState._meta.type).toBe(NodeTypes.ASSISTANT)
    expect(analyzerState._meta.is_connected).toBe(true)
    expect(analyzerState.assistant_id).toBe('analyzer')

    const javaDoc = states.find((s) => s.id === 'documentation_java')
    expect(javaDoc).toBeDefined()
    expect(javaDoc._meta.type).toBe(NodeTypes.ASSISTANT)
    expect(javaDoc._meta.is_connected).toBe(true)
    expect(javaDoc.assistant_id).toBe('documentation')

    const pythonDoc = states.find((s) => s.id === 'documentation_python')
    expect(pythonDoc).toBeDefined()
    expect(pythonDoc._meta.type).toBe(NodeTypes.ASSISTANT)
    expect(pythonDoc._meta.is_connected).toBe(true)
    expect(pythonDoc.assistant_id).toBe('documentation')

    const unknownLang = states.find((s) => s.id === 'unknown_language')
    expect(unknownLang).toBeDefined()
    expect(unknownLang._meta.is_connected).toBe(true)
  })

  it('creates conditional node from condition logic', () => {
    const { states } = loadedConfig

    const checkQuality = states.find((s) => s.id === 'check_quality')
    expect(checkQuality).toBeDefined()
    expect(checkQuality.next?.meta_next_state_id).toBeDefined()

    const conditionNode = states.find((s) => s.id === checkQuality.next.meta_next_state_id)
    expect(conditionNode).toBeDefined()
    expect(conditionNode._meta.type).toBe(NodeTypes.CONDITIONAL)
    expect(conditionNode._meta.is_connected).toBe(true)

    expect(conditionNode._meta.data.next?.condition).toBeDefined()
    expect(conditionNode._meta.data.next.condition.then).toBe('analyzer')
    expect(conditionNode._meta.data.next.condition.otherwise).toBe('end')
  })

  it('creates switch node from switch logic', () => {
    const { states } = loadedConfig

    const analyzer = states.find((s) => s.id === 'analyzer')
    expect(analyzer).toBeDefined()
    expect(analyzer.next?.meta_next_state_id).toBeDefined()

    const switchNode = states.find((s) => s.id === analyzer.next.meta_next_state_id)
    expect(switchNode).toBeDefined()
    expect(switchNode._meta.type).toBe(NodeTypes.SWITCH)
    expect(switchNode._meta.is_connected).toBe(true)

    expect(switchNode._meta.data.next?.switch).toBeDefined()
    expect(switchNode._meta.data.next.switch.cases).toBeDefined()
    expect(switchNode._meta.data.next.switch.cases.length).toBe(2)
    expect(switchNode._meta.data.next.switch.default).toBe('unknown_language')
  })

  it('marks orphaned states as disconnected', () => {
    const { states } = loadedConfig

    const orphanState = states.find((s) => s.id === 'orphan_test')
    expect(orphanState).toBeDefined()
    expect(orphanState._meta.is_connected).toBe(false)
    expect(orphanState.assistant_id).toBe('documentation')
  })

  it('sets general workflow configuration', () => {
    expect(loadedConfig.tokens_limit_before_summarization).toBe(3123)
    expect(loadedConfig.enable_summarization_node).toBe(true)
    expect(loadedConfig.retry_policy).toBeDefined()
    expect(typeof loadedConfig.retry_policy).toBe('object')
  })
})

describe('deserialize - workflow with iterator', () => {
  let loadedConfig

  beforeAll(() => {
    const yaml = loadFixture('workflow-with-iterator.yaml')
    loadedConfig = deserialize(yaml)
  })

  it('creates iterator node for state with iter_key', () => {
    const { states } = loadedConfig

    const fetchItems = states.find((s) => s.id === 'fetch_items')
    expect(fetchItems).toBeDefined()
    expect(fetchItems.next?.iter_key).toBe('items')
  })

  it('assigns meta_iter_state_id to child of parent with iter_key', () => {
    const { states } = loadedConfig

    const processItem = states.find((s) => s.id === 'process_item')
    expect(processItem).toBeDefined()
    expect(processItem.next?.meta_iter_state_id).toBeDefined()

    // Find the iterator node
    const iteratorNode = states.find((s) => s.id === processItem.next.meta_iter_state_id)
    expect(iteratorNode).toBeDefined()
    expect(iteratorNode._meta.type).toBe(NodeTypes.ITERATOR)
    expect(iteratorNode._meta.data.next?.iter_key).toBe('items')
  })

  it('creates one iterator per iter_key', () => {
    const { states } = loadedConfig

    const iteratorNodes = states.filter((s) => s._meta.type === NodeTypes.ITERATOR)
    expect(iteratorNodes.length).toBe(1)
    expect(iteratorNodes[0]._meta.data.next?.iter_key).toBe('items')
  })
})

describe('deserialize - workflow with multiple children for same iterator', () => {
  let loadedConfig

  beforeAll(() => {
    const yaml = loadFixture('workflow-with-multiple-iterators.yaml')
    loadedConfig = deserialize(yaml)
  })

  it('assigns same iterator to all children of parent with iter_key', () => {
    const { states } = loadedConfig

    const processItem = states.find((s) => s.id === 'process_item')
    const validateItem = states.find((s) => s.id === 'validate_item')

    expect(processItem).toBeDefined()
    expect(validateItem).toBeDefined()
    expect(processItem.next?.meta_iter_state_id).toBeDefined()
    expect(validateItem.next?.meta_iter_state_id).toBeDefined()

    // Both children should have the same iterator
    expect(processItem.next.meta_iter_state_id).toBe(validateItem.next.meta_iter_state_id)

    // Find the iterator node
    const iteratorNode = states.find((s) => s.id === processItem.next.meta_iter_state_id)
    expect(iteratorNode).toBeDefined()
    expect(iteratorNode._meta.type).toBe(NodeTypes.ITERATOR)
    expect(iteratorNode._meta.data.next?.iter_key).toBe('items')
  })

  it('creates only one iterator for multiple children', () => {
    const { states } = loadedConfig

    const iteratorNodes = states.filter((s) => s._meta.type === NodeTypes.ITERATOR)
    expect(iteratorNodes.length).toBe(1)
  })
})

describe('deserialize - workflow with same iter_key on different parents', () => {
  let loadedConfig

  beforeAll(() => {
    const yaml = loadFixture('workflow-with-same-iter-key.yaml')
    loadedConfig = deserialize(yaml)
  })

  it('creates one iterator for same iter_key across multiple parents', () => {
    const { states } = loadedConfig

    const processItem = states.find((s) => s.id === 'process_item')
    const validateItem = states.find((s) => s.id === 'validate_item')

    expect(processItem).toBeDefined()
    expect(validateItem).toBeDefined()
    expect(processItem.next?.meta_iter_state_id).toBeDefined()
    expect(validateItem.next?.meta_iter_state_id).toBeDefined()

    // Both children should share the same iterator (same iter_key)
    expect(processItem.next.meta_iter_state_id).toBe(validateItem.next.meta_iter_state_id)
  })

  it('accumulates all children for the same iter_key', () => {
    const { states } = loadedConfig

    const processItem = states.find((s) => s.id === 'process_item')
    const iteratorNode = states.find((s) => s.id === processItem.next.meta_iter_state_id)

    expect(iteratorNode).toBeDefined()
    expect(iteratorNode._meta.type).toBe(NodeTypes.ITERATOR)
    expect(iteratorNode._meta.data.next?.iter_key).toBe('items')

    // Should have only one iterator node for 'items'
    const iteratorNodes = states.filter(
      (s) => s._meta.type === NodeTypes.ITERATOR && s._meta.data.next?.iter_key === 'items'
    )
    expect(iteratorNodes.length).toBe(1)
  })
})
