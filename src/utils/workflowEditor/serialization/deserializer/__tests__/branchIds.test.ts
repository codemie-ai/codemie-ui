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

import { deserialize } from '../deserializer'

const findState = (states: StateConfiguration[], id: string) => states.find((s) => s.id === id)

const branchStates = (states: StateConfiguration[]) =>
  states.filter((s) => s._meta?.type === 'conditional')

describe('deserialize branch ids', () => {
  it('gives parents sharing a meta_next_state_id their own branch ids', () => {
    const yaml = `
states:
  - id: first
    assistant_id: a1
    next:
      state_id: second
      meta_next_state_id: conditional_7
      condition:
        expression: first_expr
        then: second
        otherwise: end
  - id: second
    assistant_id: a1
    next:
      state_id: end
      meta_next_state_id: conditional_7
      condition:
        expression: second_expr
        then: end
        otherwise: end
meta_states:
  - id: conditional_7
    type: conditional
    position:
      x: 10
      y: 20
`
    const { states } = deserialize(yaml)

    const first = findState(states, 'first')!
    const second = findState(states, 'second')!
    const firstBranchId = first.next!.meta_next_state_id!
    const secondBranchId = second.next!.meta_next_state_id!

    expect(firstBranchId).not.toBe(secondBranchId)
    expect(branchStates(states)).toHaveLength(2)

    const firstBranch = findState(states, firstBranchId)!
    const secondBranch = findState(states, secondBranchId)!
    expect((firstBranch._meta as any).data.next.condition.expression).toBe('first_expr')
    expect((secondBranch._meta as any).data.next.condition.expression).toBe('second_expr')
    expect(firstBranchId).toBe('conditional_7')
    expect((firstBranch._meta as any).position).toEqual({ x: 10, y: 20 })
    expect((secondBranch._meta as any).position).toBeUndefined()
  })

  it('does not generate a branch id equal to a user state id', () => {
    const yaml = `
states:
  - id: router
    assistant_id: a1
    next:
      state_id: conditional_1
      condition:
        expression: some_expr
        then: conditional_1
        otherwise: end
  - id: conditional_1
    assistant_id: a1
    next:
      state_id: end
`
    const { states } = deserialize(yaml)

    const router = findState(states, 'router')!
    const branchId = router.next!.meta_next_state_id!

    expect(branchId).not.toBe('conditional_1')
    expect(states.filter((s) => s.id === branchId)).toHaveLength(1)
    expect(states.filter((s) => s.id === 'conditional_1')).toHaveLength(1)
    expect(findState(states, 'conditional_1')!._meta?.type).not.toBe('conditional')
  })

  it('keeps the id and position of a single meta_next_state_id found in meta_states', () => {
    const yaml = `
states:
  - id: router
    assistant_id: a1
    next:
      state_id: end
      meta_next_state_id: conditional_7
      condition:
        expression: some_expr
        then: end
        otherwise: end
meta_states:
  - id: conditional_7
    type: conditional
    position:
      x: 5
      y: 6
`
    const { states } = deserialize(yaml)

    const router = findState(states, 'router')!
    expect(router.next!.meta_next_state_id).toBe('conditional_7')
    expect(branchStates(states)).toHaveLength(1)
    expect((findState(states, 'conditional_7')!._meta as any).position).toEqual({ x: 5, y: 6 })
  })
})
