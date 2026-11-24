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
import { beforeEach, describe, expect, it } from 'vitest'

import { ParsedContractOutcome } from '@/utils/workflowEditor/helpers/contractProtocol'

import {
  applyOutcome,
  clearOutcome,
  contractOutcomeStore,
  handOverIssues,
  isTokenCurrent,
  nextRequestToken,
  resetOutcome,
  takeHandedOverIssues,
} from '../contractOutcome'

const parsed = (overrides: Partial<ParsedContractOutcome> = {}): ParsedContractOutcome => ({
  issues: [],
  otherWarnings: [],
  ...overrides,
})

describe('contractOutcomeStore', () => {
  beforeEach(() => {
    contractOutcomeStore.outcome = null
  })

  it('starts empty', () => {
    expect(contractOutcomeStore.outcome).toBeNull()
  })

  it('applyOutcome stores coverage, truncation, context and key, not the issues', () => {
    const coverage = {
      validated_states: 1,
      total_states: 2,
      uncovered_state_ids: ['s2'],
      analysed: true,
      cap_reached: false,
    }
    const issue = { id: 'i1', message: 'm', path: 'x', outcome: 'ERROR' } as any

    applyOutcome(parsed({ issues: [issue], coverage, truncated: 3 }), 'not-saved', 'wf-1')

    expect(contractOutcomeStore.outcome).toEqual({
      key: 'wf-1',
      coverage,
      truncated: 3,
      context: 'not-saved',
    })
  })

  it('applyOutcome replaces the previous outcome', () => {
    applyOutcome(parsed(), 'saved', 'a')
    applyOutcome(parsed(), 'created', 'b')

    expect(contractOutcomeStore.outcome?.key).toBe('b')
    expect(contractOutcomeStore.outcome?.context).toBe('created')
  })

  it('clearOutcome clears the slot when the key matches', () => {
    applyOutcome(parsed(), 'saved', 'wf-1')

    clearOutcome('wf-1')

    expect(contractOutcomeStore.outcome).toBeNull()
  })

  it('clearOutcome keeps the slot when the key differs', () => {
    applyOutcome(parsed(), 'saved', 'wf-1')

    clearOutcome('other')

    expect(contractOutcomeStore.outcome?.key).toBe('wf-1')
  })

  it('applyOutcome keeps an undefined context (no note)', () => {
    applyOutcome(parsed(), undefined, 'wf-1')

    expect(contractOutcomeStore.outcome?.key).toBe('wf-1')
    expect(contractOutcomeStore.outcome?.context).toBeUndefined()
  })

  it('resetOutcome clears the slot whatever its key', () => {
    applyOutcome(parsed(), 'saved', 'wf-1')

    resetOutcome()

    expect(contractOutcomeStore.outcome).toBeNull()
  })
})

describe('create-to-edit issue handover', () => {
  const issue = { id: 'i1', message: 'm', path: 'x', outcome: 'WARNING' } as any

  beforeEach(() => {
    takeHandedOverIssues('drain')
  })

  it('hands the issues to the matching key once', () => {
    handOverIssues('wf-1', [issue])

    expect(takeHandedOverIssues('wf-1')).toEqual([issue])
    expect(takeHandedOverIssues('wf-1')).toBeNull()
  })

  it('drops issues handed over for another key', () => {
    handOverIssues('wf-1', [issue])

    expect(takeHandedOverIssues('wf-2')).toBeNull()
    expect(takeHandedOverIssues('wf-1')).toBeNull()
  })

  it('returns null when nothing was handed over', () => {
    expect(takeHandedOverIssues('wf-1')).toBeNull()
  })
})

describe('request token', () => {
  it('the latest token is current', () => {
    const token = nextRequestToken()

    expect(isTokenCurrent(token)).toBe(true)
  })

  it('a superseded token is not current', () => {
    const first = nextRequestToken()
    const second = nextRequestToken()

    expect(isTokenCurrent(first)).toBe(false)
    expect(isTokenCurrent(second)).toBe(true)
  })
})
