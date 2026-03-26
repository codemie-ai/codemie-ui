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

import { WorkflowExecutionState } from '@/types/entity/workflow'

import { getLastInterruptibleStateId } from '../utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeState = (
  overrides: Partial<WorkflowExecutionState> & { id: string; name: string }
): WorkflowExecutionState => ({
  date: null,
  update_date: null,
  execution_id: 'exec-1',
  task: null,
  status: 'Succeeded',
  started_at: null,
  completed_at: null,
  output: null,
  error: null,
  thoughts: [],
  ...overrides,
})

// ---------------------------------------------------------------------------
// describe
// ---------------------------------------------------------------------------

describe('getLastInterruptibleStateId', () => {
  describe('returns undefined for degenerate inputs', () => {
    it('should return undefined when yamlConfig is undefined', () => {
      // Arrange
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
      ]

      // Act
      const result = getLastInterruptibleStateId(states, undefined)

      // Assert
      expect(result).toBeUndefined()
    })

    it('should return undefined when states array is empty', () => {
      // Arrange
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      state_id: state-b
  - id: state-b
    iter_key: ''
    tool_id: ''
    interrupt_before: true
`

      // Act
      const result = getLastInterruptibleStateId([], yamlConfig)

      // Assert
      expect(result).toBeUndefined()
    })

    it('should return undefined when YAML has no states with interrupt_before: true', () => {
      // Arrange
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
        makeState({ id: 'es-2', name: 'state-b', completed_at: '2024-01-01T11:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      state_id: state-b
  - id: state-b
    iter_key: ''
    tool_id: ''
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBeUndefined()
    })

    it('should return undefined when no predecessor state matches any execution state name', () => {
      // Arrange — predecessor is "state-a" but no execution state has name "state-a"
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-x', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      state_id: state-b
  - id: state-b
    iter_key: ''
    tool_id: ''
    interrupt_before: true
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBeUndefined()
    })

    it('should return undefined on invalid/unparseable YAML', () => {
      // Arrange
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    bad indentation:
  this is: [not: valid: yaml
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('simple state_id routing', () => {
    it('should return the execution state ID whose name matches the predecessor via state_id', () => {
      // Arrange
      //   state-a  --next.state_id-->  state-b (interrupt_before: true)
      //   state-a is a predecessor → look for execution state with name "state-a"
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      state_id: state-b
  - id: state-b
    iter_key: ''
    tool_id: ''
    interrupt_before: true
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBe('es-1')
    })
  })

  describe('state_ids (parallel) routing', () => {
    it('should return the execution state ID whose name matches the predecessor via state_ids', () => {
      // Arrange
      //   state-a  --next.state_ids-->  [state-b, state-c]
      //   state-c has interrupt_before, so state-a is a predecessor
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      state_ids:
        - state-b
        - state-c
  - id: state-b
    iter_key: ''
    tool_id: ''
  - id: state-c
    iter_key: ''
    tool_id: ''
    interrupt_before: true
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBe('es-1')
    })
  })

  describe('condition.then routing', () => {
    it('should return the execution state ID whose name matches the predecessor via condition.then', () => {
      // Arrange
      //   state-a  --next.condition.then-->  state-b (interrupt_before: true)
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      condition:
        expression: 'some_flag == true'
        then: state-b
        otherwise: state-c
  - id: state-b
    iter_key: ''
    tool_id: ''
    interrupt_before: true
  - id: state-c
    iter_key: ''
    tool_id: ''
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBe('es-1')
    })
  })

  describe('condition.otherwise routing', () => {
    it('should return the execution state ID whose name matches the predecessor via condition.otherwise', () => {
      // Arrange
      //   state-a  --next.condition.otherwise-->  state-c (interrupt_before: true)
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      condition:
        expression: 'some_flag == true'
        then: state-b
        otherwise: state-c
  - id: state-b
    iter_key: ''
    tool_id: ''
  - id: state-c
    iter_key: ''
    tool_id: ''
    interrupt_before: true
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBe('es-1')
    })
  })

  describe('switch.cases routing', () => {
    it('should return the execution state ID whose name matches the predecessor via switch.cases', () => {
      // Arrange
      //   state-a  --next.switch.cases[1].state_id-->  state-c (interrupt_before: true)
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      switch:
        cases:
          - condition: 'value == 1'
            state_id: state-b
          - condition: 'value == 2'
            state_id: state-c
        default: state-b
  - id: state-b
    iter_key: ''
    tool_id: ''
  - id: state-c
    iter_key: ''
    tool_id: ''
    interrupt_before: true
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBe('es-1')
    })
  })

  describe('switch.default routing', () => {
    it('should return the execution state ID whose name matches the predecessor via switch.default', () => {
      // Arrange
      //   state-a  --next.switch.default-->  state-c (interrupt_before: true)
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      switch:
        cases:
          - condition: 'value == 1'
            state_id: state-b
        default: state-c
  - id: state-b
    iter_key: ''
    tool_id: ''
  - id: state-c
    iter_key: ''
    tool_id: ''
    interrupt_before: true
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBe('es-1')
    })
  })

  describe('legacy wait_for_user_confirmation routing', () => {
    it('should treat wait_for_user_confirmation: true the same as interrupt_before: true', () => {
      // Arrange
      //   state-a  --next.state_id-->  state-b (wait_for_user_confirmation: true)
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      state_id: state-b
  - id: state-b
    iter_key: ''
    tool_id: ''
    wait_for_user_confirmation: true
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBe('es-1')
    })

    it('should return undefined when YAML has no states with wait_for_user_confirmation or interrupt_before', () => {
      // Arrange
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      state_id: state-b
  - id: state-b
    iter_key: ''
    tool_id: ''
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('most recent by completed_at when multiple predecessors match', () => {
    it('should return the ID of the execution state with the latest completed_at', () => {
      // Arrange
      //   Both state-a and state-x are predecessors pointing to interrupted states.
      //   state-x has the more recent completed_at → its execution state ID wins.
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T09:00:00Z' }),
        makeState({ id: 'es-2', name: 'state-x', completed_at: '2024-01-01T11:00:00Z' }),
        makeState({ id: 'es-3', name: 'state-y', completed_at: '2024-01-01T10:00:00Z' }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      state_id: state-b
  - id: state-b
    iter_key: ''
    tool_id: ''
    interrupt_before: true
  - id: state-x
    iter_key: ''
    tool_id: ''
    next:
      state_id: state-z
  - id: state-y
    iter_key: ''
    tool_id: ''
  - id: state-z
    iter_key: ''
    tool_id: ''
    interrupt_before: true
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert — es-2 (state-x) has the latest completed_at
      expect(result).toBe('es-2')
    })

    it('should treat null completed_at as epoch (lowest priority)', () => {
      // Arrange
      //   state-a has a real completed_at; state-x has null (treated as 0 / epoch).
      //   state-a should win because its timestamp is newer than epoch.
      const states: WorkflowExecutionState[] = [
        makeState({ id: 'es-1', name: 'state-a', completed_at: '2024-01-01T10:00:00Z' }),
        makeState({ id: 'es-2', name: 'state-x', completed_at: null }),
      ]
      const yamlConfig = `
states:
  - id: state-a
    iter_key: ''
    tool_id: ''
    next:
      state_id: state-b
  - id: state-b
    iter_key: ''
    tool_id: ''
    interrupt_before: true
  - id: state-x
    iter_key: ''
    tool_id: ''
    next:
      state_id: state-b
`

      // Act
      const result = getLastInterruptibleStateId(states, yamlConfig)

      // Assert — es-1 (state-a) has a real timestamp and wins
      expect(result).toBe('es-1')
    })
  })
})
