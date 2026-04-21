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

import { describe, expect, it } from 'vitest'

import type { ExtendedWorkflowExecutionState } from '@/types/entity/workflow'
import { NodeTypes } from '@/types/workflowEditor/base'
import type { StateConfiguration } from '@/types/workflowEditor/configuration'

import { removeNonExistingStates } from '../removeNonExistingStates'

const configState = (
  overrides: Partial<StateConfiguration> & { id: string }
): StateConfiguration => ({
  _meta: {
    type: NodeTypes.ASSISTANT,
    ...overrides._meta,
  },
  ...overrides,
})

const execState = (
  overrides: Partial<ExtendedWorkflowExecutionState> & { resolvedId: string }
): ExtendedWorkflowExecutionState => {
  const { resolvedId } = overrides
  return {
    id: crypto.randomUUID(),
    name: resolvedId,
    status: 'Succeeded',
    preceding_state_ids: null,
    state_id: resolvedId,
    date: null,
    update_date: null,
    execution_id: 'test-execution-id',
    task: null,
    started_at: null,
    completed_at: null,
    output: null,
    error: null,
    thoughts: [],
    ...overrides,
    resolvedId,
  }
}

describe('removeNonExistingStates', () => {
  it('returns the identical array if all execution states exist in config', () => {
    const config = [configState({ id: 'StateA' }), configState({ id: 'StateB' })]

    const execs = [
      execState({ resolvedId: 'StateA', preceding_state_ids: null }),
      execState({ resolvedId: 'StateB', preceding_state_ids: ['StateA'] }),
    ]

    const result = removeNonExistingStates(execs, config)

    expect(result).toHaveLength(2)
    expect(result).toEqual(execs)
  })

  it('removes an invalid state and correctly link the subsequent state to the valid preceding one', () => {
    const config = [
      configState({ id: 'Start' }),
      // 'Middle' is intentionally missing from config
      configState({ id: 'End' }),
    ]

    const execs = [
      execState({ resolvedId: 'Start', preceding_state_ids: null }),
      execState({ resolvedId: 'Middle', preceding_state_ids: ['Start'] }), // Invalid
      execState({ resolvedId: 'End', preceding_state_ids: ['Middle'] }),
    ]

    const result = removeNonExistingStates(execs, config)

    expect(result).toHaveLength(2)
    expect(result[0]?.state_id).toBe('Start')

    // 'End' should now point directly to 'Start', skipping 'Middle'
    expect(result[1]?.state_id).toBe('End')
    expect(result[1]?.preceding_state_ids).toEqual(['Start'])
  })

  it('handles multiple sequential invalid states by traversing up to a valid state', () => {
    const config = [configState({ id: 'A' }), configState({ id: 'D' })]

    const execs = [
      execState({ resolvedId: 'A', preceding_state_ids: null }),
      execState({ resolvedId: 'B', preceding_state_ids: ['A'] }), // Invalid
      execState({ resolvedId: 'C', preceding_state_ids: ['B'] }), // Invalid
      execState({ resolvedId: 'D', preceding_state_ids: ['C'] }),
    ]

    const result = removeNonExistingStates(execs, config)

    expect(result).toHaveLength(2)
    expect(result[1]?.state_id).toBe('D')
    // 'D' skips 'C' and 'B', pointing straight back to 'A'
    expect(result[1]?.preceding_state_ids).toEqual(['A'])
  })

  it('handles multiple sequential invalid states with the same id', () => {
    const config = [configState({ id: 'A' }), configState({ id: 'D' })]

    const execs = [
      execState({ resolvedId: 'A', preceding_state_ids: null }),
      execState({ resolvedId: 'B', preceding_state_ids: ['A'] }), // Invalid
      execState({ resolvedId: 'B', preceding_state_ids: ['B'] }), // Invalid
      execState({ resolvedId: 'D', preceding_state_ids: ['B'] }),
    ]

    const result = removeNonExistingStates(execs, config)

    expect(result).toHaveLength(2)
    expect(result[0]?.state_id).toBe('A')
    expect(result[1]?.state_id).toBe('D')
    expect(result[1]?.preceding_state_ids).toEqual(['A'])
  })

  it('sets preceding_state_ids to null if the chain leads to an invalid state that does not exist in the execution logs', () => {
    const config = [configState({ id: 'ValidState' })]

    const execs = [
      // ValidState points to 'GhostState', which is invalid AND missing from execs
      execState({ resolvedId: 'ValidState', preceding_state_ids: ['GhostState'] }),
    ]

    const result = removeNonExistingStates(execs, config)

    expect(result).toHaveLength(1)
    expect(result[0]?.state_id).toBe('ValidState')
    // Fails safely by returning null instead of leaving a broken string
    expect(result[0]?.preceding_state_ids).toBeNull()
  })

  it('prevents infinite loops and return null if invalid states have circular preceding references', () => {
    const config = [configState({ id: 'ValidState' })]

    const execs = [
      execState({ resolvedId: 'Loop1', preceding_state_ids: ['Loop2'] }), // Invalid
      execState({ resolvedId: 'Loop2', preceding_state_ids: ['Loop1'] }), // Invalid
      execState({ resolvedId: 'ValidState', preceding_state_ids: ['Loop2'] }),
    ]

    const result = removeNonExistingStates(execs, config)

    expect(result).toHaveLength(1)
    expect(result[0]?.state_id).toBe('ValidState')
    // Detects the loop between Loop1 and Loop2, breaks out, and safely returns null
    expect(result[0]?.preceding_state_ids).toBeNull()
  })

  it('handles completely empty execution arrays safely', () => {
    const config = [configState({ id: 'A' })]
    const execs: ExtendedWorkflowExecutionState[] = []

    const result = removeNonExistingStates(execs, config)
    expect(result).toEqual([])
  })

  it('removes all execution states if config is completely empty', () => {
    const config: StateConfiguration[] = []
    const execs = [execState({ resolvedId: 'A', preceding_state_ids: null })]

    const result = removeNonExistingStates(execs, config)
    expect(result).toEqual([])
  })

  it('handles the first state in the execution array being invalid and removed', () => {
    const config = [configState({ id: 'ValidEnd' })]

    const execs = [
      execState({ resolvedId: 'InvalidStart', preceding_state_ids: null }),
      execState({ resolvedId: 'ValidEnd', preceding_state_ids: ['InvalidStart'] }),
    ]

    const result = removeNonExistingStates(execs, config)

    expect(result).toHaveLength(1)
    expect(result[0]?.state_id).toBe('ValidEnd')
    // Because the start was invalid and had no preceding state itself, this becomes null
    expect(result[0]?.preceding_state_ids).toBeNull()
  })

  it('preserves special nodes (start and end) even though they are not in config', () => {
    const config = [
      configState({ id: 'StateA' }),
      configState({ id: 'StateB' }),
      // Note: 'start' and 'end' are NOT in the config
    ]

    const execs = [
      execState({ resolvedId: 'start', preceding_state_ids: null }),
      execState({ resolvedId: 'StateA', preceding_state_ids: ['start'] }),
      execState({ resolvedId: 'StateB', preceding_state_ids: ['StateA'] }),
      execState({ resolvedId: 'end', preceding_state_ids: ['StateB'] }),
    ]

    const result = removeNonExistingStates(execs, config)

    expect(result).toHaveLength(4)
    expect(result[0]?.state_id).toBe('start')
    expect(result[1]?.state_id).toBe('StateA')
    expect(result[1]?.preceding_state_ids).toEqual(['start'])
    expect(result[2]?.state_id).toBe('StateB')
    expect(result[3]?.state_id).toBe('end')
    expect(result[3]?.preceding_state_ids).toEqual(['StateB'])
  })

  it('correctly links end node when it follows a system node not in config', () => {
    const config = [
      configState({ id: 'StateA' }),
      // 'SummarizeConversationCommandNode' is a system node not in config
    ]

    const execs = [
      execState({ resolvedId: 'start', preceding_state_ids: null }),
      execState({ resolvedId: 'StateA', preceding_state_ids: ['start'] }),
      execState({
        resolvedId: 'SummarizeConversationCommandNode',
        preceding_state_ids: ['StateA'],
      }),
      execState({ resolvedId: 'end', preceding_state_ids: ['SummarizeConversationCommandNode'] }),
    ]

    const result = removeNonExistingStates(execs, config)

    expect(result).toHaveLength(3)
    expect(result[0]?.state_id).toBe('start')
    expect(result[1]?.state_id).toBe('StateA')
    expect(result[2]?.state_id).toBe('end')
    // The 'end' node should skip the system node and link to 'StateA'
    expect(result[2]?.preceding_state_ids).toEqual(['StateA'])
  })
})
