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
import { describe, it, expect, beforeAll } from 'vitest'

import { NodeTypes } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import { START_NODE_ID, END_NODE_ID } from '../../constants'
import { serialize } from '../serializer'

const TEST_CONFIG: WorkflowConfiguration = {
  states: [
    {
      id: START_NODE_ID,
      _meta: { type: NodeTypes.START, is_connected: true },
    },
    {
      id: 'check_quality',
      assistant_id: 'validator',
      task: 'Check quality',
      next: {
        condition: {
          then: 'analyzer', // nosonar
          otherwise: 'end',
        },
      },
      _meta: { type: NodeTypes.ASSISTANT, is_connected: true, position: { x: 100, y: 100 } },
    },
    {
      id: 'condition_12345',
      next: {
        condition: {
          then: 'analyzer', // nosonar
          otherwise: 'end',
        },
      },
      _meta: { type: NodeTypes.CONDITIONAL, is_connected: true, position: { x: 200, y: 100 } },
    },
    {
      id: 'analyzer',
      assistant_id: 'analyzer',
      task: 'Analyze code',
      next: {
        switch: {
          cases: [
            { condition: 'language == "Java"', state_id: 'doc_java' },
            { condition: 'language == "Python"', state_id: 'doc_python' },
          ],
          default: 'unknown',
        },
      },
      _meta: { type: NodeTypes.ASSISTANT, is_connected: true, position: { x: 300, y: 100 } },
    },
    {
      id: 'switch_67890',
      next: {
        switch: {
          cases: [
            { condition: 'language == "Java"', state_id: 'doc_java' },
            { condition: 'language == "Python"', state_id: 'doc_python' },
          ],
          default: 'unknown',
        },
      },
      _meta: { type: NodeTypes.SWITCH, is_connected: true, position: { x: 400, y: 100 } },
    },
    {
      id: 'doc_java',
      assistant_id: 'documentation',
      task: 'Document Java code',
      next: { state_id: 'end' },
      _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
    },
    {
      id: 'doc_python',
      assistant_id: 'documentation',
      task: 'Document Python code',
      next: { state_id: 'end' },
      _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
    },
    {
      id: 'unknown',
      assistant_id: 'documentation',
      task: 'Document unknown language',
      next: { state_id: 'end' },
      _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
    },
    {
      id: 'orphan_state',
      assistant_id: 'documentation',
      task: 'Orphaned task',
      next: { state_id: 'end' },
      _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
    },
    {
      id: END_NODE_ID,
      _meta: { type: NodeTypes.END, is_connected: true },
    },
  ],
  retry_policy: {},
  tokens_limit_before_summarization: 5000,
  enable_summarization_node: true,
} as WorkflowConfiguration

describe('serialize', () => {
  let serializedYaml: string
  let parsedYaml: any

  beforeAll(() => {
    serializedYaml = serialize(TEST_CONFIG)
    parsedYaml = yaml.load(serializedYaml)
  })

  it('serializes connected states without _meta', () => {
    expect(parsedYaml.states).toBeDefined()
    expect(Array.isArray(parsedYaml.states)).toBe(true)

    const checkQuality = parsedYaml.states.find((s) => s.id === 'check_quality')
    expect(checkQuality).toBeDefined()
    expect(checkQuality.assistant_id).toBe('validator')
    expect(checkQuality.task).toBe('Check quality')
    expect(checkQuality._meta).toBeUndefined()

    const analyzer = parsedYaml.states.find((s) => s.id === 'analyzer')
    expect(analyzer).toBeDefined()
    expect(analyzer._meta).toBeUndefined()
  })

  it('serializes orphaned states to orphaned_states section', () => {
    expect(parsedYaml.orphaned_states).toBeDefined()
    expect(Array.isArray(parsedYaml.orphaned_states)).toBe(true)

    const orphan = parsedYaml.orphaned_states.find((s) => s.id === 'orphan_state')
    expect(orphan).toBeDefined()
    expect(orphan.assistant_id).toBe('documentation')
    expect(orphan.task).toBe('Orphaned task')
    expect(orphan._meta).toBeUndefined()
  })

  it('excludes meta states (start, end, condition, switch) from states', () => {
    const startInStates = parsedYaml.states?.find((s) => s.id === START_NODE_ID)
    const endInStates = parsedYaml.states?.find((s) => s.id === END_NODE_ID)
    const conditionInStates = parsedYaml.states?.find((s) => s.id === 'condition_12345')
    const switchInStates = parsedYaml.states?.find((s) => s.id === 'switch_67890')

    expect(startInStates).toBeUndefined()
    expect(endInStates).toBeUndefined()
    expect(conditionInStates).toBeUndefined()
    expect(switchInStates).toBeUndefined()
  })

  it('serializes meta states to meta_states section', () => {
    expect(parsedYaml.meta_states).toBeDefined()
    expect(Array.isArray(parsedYaml.meta_states)).toBe(true)

    const startMeta = parsedYaml.meta_states.find((m) => m.id === START_NODE_ID)
    expect(startMeta).toBeDefined()
    expect(startMeta.type).toBe(NodeTypes.START)

    const endMeta = parsedYaml.meta_states.find((m) => m.id === END_NODE_ID)
    expect(endMeta).toBeDefined()
    expect(endMeta.type).toBe(NodeTypes.END)

    const conditionMeta = parsedYaml.meta_states.find((m) => m.id === 'condition_12345')
    expect(conditionMeta).toBeDefined()
    expect(conditionMeta.type).toBe(NodeTypes.CONDITIONAL)

    const switchMeta = parsedYaml.meta_states.find((m) => m.id === 'switch_67890')
    expect(switchMeta).toBeDefined()
    expect(switchMeta.type).toBe(NodeTypes.SWITCH)
  })

  it('serializes _meta for workflow states to meta_states', () => {
    const checkQualityMeta = parsedYaml.meta_states.find((m) => m.id === 'check_quality')
    expect(checkQualityMeta).toBeDefined()
    expect(checkQualityMeta.type).toBe(NodeTypes.ASSISTANT)
    expect(checkQualityMeta.is_connected).toBe(true)
    expect(checkQualityMeta.position).toEqual({ x: 100, y: 100 })

    const orphanMeta = parsedYaml.meta_states.find((m) => m.id === 'orphan_state')
    expect(orphanMeta).toBeDefined()
    expect(orphanMeta.is_connected).toBe(false)
  })

  it('serializes general workflow configuration', () => {
    expect(parsedYaml.retry_policy).toBeDefined()
    expect(parsedYaml.tokens_limit_before_summarization).toBe(5000)
    expect(parsedYaml.enable_summarization_node).toBe(true)
  })

  it('returns valid YAML string', () => {
    expect(typeof serializedYaml).toBe('string')
    expect(serializedYaml.length).toBeGreaterThan(0)
    expect(() => yaml.load(serializedYaml)).not.toThrow()
  })
})
