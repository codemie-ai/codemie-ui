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

import { appInfoStore } from '@/store/appInfo'
import { WorkflowIssue } from '@/types/entity'
import { StateConfiguration } from '@/types/workflowEditor'
import { NodeType, NodeTypes } from '@/types/workflowEditor/base'
import {
  CONTRACT_ERROR_TYPE,
  isHiddenControlPath,
} from '@/utils/workflowEditor/helpers/contractProtocol'

// The real editor entry: importing it pulls in every config panel and so every registerFields side effect.
import '../../WorkflowEditor'
import { enableWorkflowContracts } from '../../configPanels/__tests__/contractTestUtils'
import useWorkflowFieldIssues from '../../hooks/useWorkflowFieldIssues'
import { isFieldSupported } from '../visualEditorFieldRegistry'

const ACTION_TYPES: NodeType[] = [
  NodeTypes.ASSISTANT,
  NodeTypes.TOOL,
  NodeTypes.CUSTOM,
  NodeTypes.SUB_WORKFLOW,
  NodeTypes.TRANSFORM,
]

const GROUP_A: Array<[string, NodeType[]]> = [
  ['input_schema', ACTION_TYPES],
  ['save_validation', ACTION_TYPES],
  [
    'output_schema',
    [NodeTypes.ASSISTANT, NodeTypes.CUSTOM, NodeTypes.TOOL, NodeTypes.SUB_WORKFLOW],
  ],
  ['task', [NodeTypes.ASSISTANT]],
  ['tool_args.query', [NodeTypes.TOOL]],
  ['config.mappings.2.source_path', [NodeTypes.TRANSFORM]],
  ['config.some_key', [NodeTypes.CUSTOM]],
]

const GROUP_B: Array<[string, NodeType]> = [
  ['next.condition.expression', NodeTypes.ASSISTANT],
  ['next.condition.expression', NodeTypes.TOOL],
  ['next.switch.cases.1.condition', NodeTypes.CUSTOM],
  ['next.iter_key', NodeTypes.SUB_WORKFLOW],
  ['config.input_key', NodeTypes.TRANSFORM],
  ['config.input_key', NodeTypes.TOOL],
  ['task', NodeTypes.CUSTOM],
  ['task', NodeTypes.TOOL],
  ['task', NodeTypes.TRANSFORM],
  ['task', NodeTypes.SUB_WORKFLOW],
  ['output_schema', NodeTypes.TRANSFORM],
  ['tool_args', NodeTypes.TOOL],
  ['context.foo', NodeTypes.ASSISTANT],
  ['', NodeTypes.ASSISTANT],
]

const isYamlFallback = (path: string, type: NodeType) =>
  !isFieldSupported(path, type, CONTRACT_ERROR_TYPE) || isHiddenControlPath(path, type)

const makeIssue = (overrides: Partial<WorkflowIssue>): WorkflowIssue =>
  ({
    id: 'issue-1',
    message: 'Contract problem',
    stateId: 's1',
    path: 'task',
    configLine: 7,
    error_type: CONTRACT_ERROR_TYPE,
    outcome: 'ERROR',
    ...overrides,
  } as WorkflowIssue)

const renderFieldIssues = (type: NodeType, tempIssues: WorkflowIssue[] = []) => {
  const handlers = {
    openNodeTab: vi.fn(),
    openYamlTab: vi.fn(),
    openAdvancedConfigTab: vi.fn(),
    openState: vi.fn(),
  }
  const { result } = renderHook(() =>
    useWorkflowFieldIssues({
      configStates: [{ id: 's1', _meta: { type } } as unknown as StateConfiguration],
      activeIssue: null,
      selectedStateId: 's1',
      issues: tempIssues,
      tempIssues,
      setTempIssues: vi.fn(),
      isIssueResolved: () => false,
      isIssueDirty: () => false,
      markIssueDirty: vi.fn(),
      setDirtyIssues: vi.fn(),
      ...handlers,
    })
  )
  return { ...result.current, ...handlers }
}

describe('contract path registration', () => {
  beforeEach(enableWorkflowContracts)

  describe('Group A paths navigate to a control', () => {
    GROUP_A.forEach(([path, types]) => {
      types.forEach((type) => {
        it(`${path} is supported on ${type} for contract_validation`, () => {
          expect(isFieldSupported(path, type, CONTRACT_ERROR_TYPE)).toBe(true)
          expect(isHiddenControlPath(path, type)).toBe(false)
        })
      })
    })

    it('output_schema stays supported for non-contract error types', () => {
      expect(isFieldSupported('output_schema', NodeTypes.ASSISTANT, 'schema_validation')).toBe(true)
    })
  })

  describe('Group B cases fall back to YAML', () => {
    GROUP_B.forEach(([path, type]) => {
      it(`"${path}" on ${type} is a YAML fallback`, () => {
        expect(isYamlFallback(path, type)).toBe(true)
      })

      it(`goToField opens YAML at config_line for "${path}" on ${type}`, () => {
        const { goToField, openYamlTab, openNodeTab, openState } = renderFieldIssues(type)
        const issue = makeIssue({ path })
        goToField(issue)
        expect(openYamlTab).toHaveBeenCalledWith(issue)
        expect(openNodeTab).not.toHaveBeenCalled()
        expect(openState).not.toHaveBeenCalled()
      })
    })
  })

  describe('goToField for Group A contract issues', () => {
    it('opens the node tab for input_schema on a sub-workflow', () => {
      const { goToField, openNodeTab, openState, openYamlTab } = renderFieldIssues(
        NodeTypes.SUB_WORKFLOW
      )
      goToField(makeIssue({ path: 'input_schema' }))
      expect(openNodeTab).toHaveBeenCalled()
      expect(openState).toHaveBeenCalledWith('s1')
      expect(openYamlTab).not.toHaveBeenCalled()
    })
  })

  describe('hidden controls fall back to YAML for every error type', () => {
    it.each<[string, NodeType]>([
      ['task', NodeTypes.TOOL],
      ['task', NodeTypes.TRANSFORM],
      ['output_schema', NodeTypes.TRANSFORM],
      ['interrupt_before', NodeTypes.TRANSFORM],
      ['retry_policy.max_attempts', NodeTypes.TRANSFORM],
    ])('a schema issue on "%s" on %s opens YAML', (path, type) => {
      const { goToField, openNodeTab, openYamlTab } = renderFieldIssues(type)
      const issue = makeIssue({ path, error_type: 'schema_validation' })
      goToField(issue)
      expect(openYamlTab).toHaveBeenCalledWith(issue)
      expect(openNodeTab).not.toHaveBeenCalled()
    })

    it('a schema issue on retry_policy on a tool state still opens the node tab', () => {
      const { goToField, openNodeTab, openYamlTab } = renderFieldIssues(NodeTypes.TOOL)
      goToField(makeIssue({ path: 'retry_policy.max_attempts', error_type: 'schema_validation' }))
      expect(openNodeTab).toHaveBeenCalled()
      expect(openYamlTab).not.toHaveBeenCalled()
    })
  })

  describe('contract keys while the contracts flag is off', () => {
    beforeEach(() => {
      appInfoStore.configs = []
    })

    it.each(['input_schema', 'save_validation'])(
      'a schema issue on state %s opens YAML, not the hidden control',
      (path) => {
        const { goToField, openNodeTab, openYamlTab } = renderFieldIssues(NodeTypes.ASSISTANT)
        const issue = makeIssue({ path, error_type: 'schema_validation' })
        goToField(issue)
        expect(openYamlTab).toHaveBeenCalledWith(issue)
        expect(openNodeTab).not.toHaveBeenCalled()
      }
    )

    it.each(['save_validation', 'require_input_contracts'])(
      'a workflow-level issue on %s opens YAML, not the Advanced tab',
      (path) => {
        const { goToField, openAdvancedConfigTab, openYamlTab } = renderFieldIssues(
          NodeTypes.ASSISTANT
        )
        const issue = makeIssue({ path, stateId: undefined, error_type: 'schema_validation' })
        goToField(issue)
        expect(openYamlTab).toHaveBeenCalledWith(issue)
        expect(openAdvancedConfigTab).not.toHaveBeenCalled()
      }
    )

    it('does not bind a state input_schema issue to a field', () => {
      const issue = makeIssue({ path: 'input_schema', error_type: 'schema_validation' })
      const { getIssueField } = renderFieldIssues(NodeTypes.ASSISTANT, [issue])
      expect(getIssueField('input_schema').fieldError).toBeUndefined()
    })
  })

  it('opens the Advanced tab for a workflow-level contract issue while the flag is on', () => {
    const { goToField, openAdvancedConfigTab, openYamlTab } = renderFieldIssues(NodeTypes.ASSISTANT)
    const issue = makeIssue({ path: 'save_validation', stateId: undefined })
    goToField(issue)
    expect(openAdvancedConfigTab).toHaveBeenCalledWith(issue)
    expect(openYamlTab).not.toHaveBeenCalled()
  })

  describe('getIssueField', () => {
    it('does not bind a contract YAML-only issue to a visual field', () => {
      const issue = makeIssue({ path: 'output_schema' })
      const { getIssueField } = renderFieldIssues(NodeTypes.TRANSFORM, [issue])
      expect(getIssueField('output_schema').fieldError).toBeUndefined()
    })

    it('does not bind a state-level output_schema schema issue to the transform output control', () => {
      const issue = makeIssue({ path: 'output_schema', error_type: 'schema_validation' })
      const { getIssueField } = renderFieldIssues(NodeTypes.TRANSFORM, [issue])
      expect(getIssueField('output_schema').fieldError).toBeUndefined()
    })

    it('binds a contract issue on a registered control', () => {
      const issue = makeIssue({ path: 'output_schema' })
      const { getIssueField } = renderFieldIssues(NodeTypes.ASSISTANT, [issue])
      expect(getIssueField('output_schema').fieldError).toBe('Contract problem')
    })
  })
})
