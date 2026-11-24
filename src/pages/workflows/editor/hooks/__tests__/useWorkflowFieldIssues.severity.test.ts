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

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IssueOutcome, WorkflowIssue } from '@/types/entity'
import { StateConfiguration } from '@/types/workflowEditor'
import { NodeTypes } from '@/types/workflowEditor/base'
import { CONTRACT_ERROR_TYPE } from '@/utils/workflowEditor/helpers/contractProtocol'

import { enableWorkflowContracts } from '../../configPanels/__tests__/contractTestUtils'
import useWorkflowFieldIssues from '../useWorkflowFieldIssues'

// The issues sit on contract controls, which exist only while the contracts flag is on.
beforeEach(enableWorkflowContracts)

const makeIssue = (id: string, outcome: IssueOutcome, overrides: Partial<WorkflowIssue> = {}) =>
  ({
    id,
    message: `${outcome} message`,
    stateId: 's1',
    path: 'input_schema',
    configLine: 3,
    error_type: CONTRACT_ERROR_TYPE,
    outcome,
    ...overrides,
  } as WorkflowIssue)

const renderFieldIssues = (
  tempIssues: WorkflowIssue[],
  isIssueResolved: (issue: string | WorkflowIssue) => boolean = () => false,
  activeIssue: WorkflowIssue | null = null
) => {
  const { result } = renderHook(() =>
    useWorkflowFieldIssues({
      configStates: [
        { id: 's1', _meta: { type: NodeTypes.ASSISTANT } } as unknown as StateConfiguration,
      ],
      activeIssue,
      selectedStateId: 's1',
      issues: tempIssues,
      tempIssues,
      setTempIssues: vi.fn(),
      isIssueResolved,
      isIssueDirty: () => false,
      markIssueDirty: vi.fn(),
      setDirtyIssues: vi.fn(),
      openNodeTab: vi.fn(),
      openYamlTab: vi.fn(),
      openAdvancedConfigTab: vi.fn(),
      openState: vi.fn(),
    })
  )
  return result.current
}

describe('getIssueField severity', () => {
  it('returns the error when an error and a warning share a path, whatever their order', () => {
    const warning = makeIssue('w', 'WARNING')
    const error = makeIssue('e', 'ERROR')

    const field = renderFieldIssues([warning, error]).getIssueField('input_schema')

    expect(field.issue).toBe(error)
    expect(field.fieldError).toBe('ERROR message')
    expect(field.fieldWarning).toBeUndefined()
  })

  it('exposes a WARNING issue as fieldWarning and not as fieldError', () => {
    const field = renderFieldIssues([makeIssue('w', 'WARNING')]).getIssueField('input_schema')

    expect(field.fieldWarning).toBe('WARNING message')
    expect(field.fieldError).toBeUndefined()
  })

  it('skips a resolved error and falls back to the unresolved warning', () => {
    const error = makeIssue('e', 'ERROR')
    const warning = makeIssue('w', 'WARNING')

    const field = renderFieldIssues([error, warning], (issue) =>
      typeof issue === 'string' ? issue === 'e' : issue.id === 'e'
    ).getIssueField('input_schema')

    expect(field.issue).toBe(warning)
    expect(field.fieldWarning).toBe('WARNING message')
    expect(field.fieldError).toBeUndefined()
  })

  it('gives an UNVERIFIED issue neither an error nor a warning message', () => {
    const field = renderFieldIssues([makeIssue('u', 'UNVERIFIED')]).getIssueField('input_schema')

    expect(field.fieldError).toBeUndefined()
    expect(field.fieldWarning).toBeUndefined()
  })
})

describe('getIssueField inline text and binding', () => {
  it('shows the finding, not the provenance line, for a contract issue', () => {
    const field = renderFieldIssues([
      makeIssue('w', 'WARNING', { message: 'x is not guaranteed', details: 'producers: a1' }),
    ]).getIssueField('input_schema')

    expect(field.fieldWarning).toBe('x is not guaranteed')
  })

  it('keeps details as the inline text for a non-contract issue', () => {
    const field = renderFieldIssues([
      makeIssue('e', 'ERROR', { error_type: 'schema_validation', details: 'detail text' }),
    ]).getIssueField('input_schema')

    expect(field.fieldError).toBe('detail text')
  })

  it('focuses the field for the selected issue when several share it', () => {
    const first = makeIssue('first', 'ERROR')
    const second = makeIssue('second', 'WARNING')
    const node = { focus: vi.fn(), scrollIntoView: vi.fn() }

    const field = renderFieldIssues([first, second], () => false, second).getIssueField(
      'input_schema'
    )
    ;(field.ref as (node: unknown) => void)(node)

    // The inline message still comes from the worst issue.
    expect(field.fieldError).toBe('ERROR message')
    expect(node.focus).toHaveBeenCalledTimes(1)
  })

  it('ignores a workflow-level issue for a per-node control when stateOnly is set', () => {
    const workflowLevel = makeIssue('wf', 'ERROR', { path: 'save_validation', stateId: undefined })
    const { getIssueField } = renderFieldIssues([workflowLevel])

    expect(getIssueField('save_validation').fieldError).toBe('ERROR message')
    expect(getIssueField('save_validation', { stateOnly: true }).fieldError).toBeUndefined()
    expect(getIssueField('save_validation', { stateOnly: true }).issue).toBeUndefined()
  })
})
