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

import { WorkflowBaseIssue } from '@/types/entity'
import { NodeTypes } from '@/types/workflowEditor/base'

import {
  CONTRACT_ERROR_TYPE,
  CONTRACT_WARNING_KIND,
  formatCoverage,
  ISSUE_OUTCOMES,
  VALIDATION_MODES,
  isContractWarning,
  hasSaveWarnings,
  isHiddenControlPath,
  ParsedContractOutcome,
  parseContractOutcome,
  toWorkflowIssue,
} from '../contractProtocol'

const SAVE_WITH_WARNINGS = {
  message: 'Workflow updated successfully',
  data: {},
  warnings: [
    { kind: 'consumer_slot', assistant_ref: 'a1', tool_name: 'Jira', credential_type: 'Jira' },
    {
      id: 'w-1',
      kind: 'contract_validation',
      outcome: 'WARNING',
      state_id: 'c1',
      path: 'x',
      message: "'x' is not guaranteed",
      config_path: 'task',
      config_section: 'states',
      config_line: 14,
      meta: { label: 'not guaranteed by the contracts' },
    },
  ],
  coverage: {
    validated_states: 3,
    total_states: 3,
    uncovered_state_ids: [],
    analysed: true,
    cap_reached: false,
  },
}

const REJECTION = {
  error: {
    message: 'Workflow Configuration error',
    help: '',
    details: {
      error_type: 'contract_validation',
      message: 'Workflow contracts are not satisfied',
      errors: [
        {
          id: 'e-1',
          outcome: 'ERROR',
          state_id: 'c1',
          path: 'x',
          config_path: 'input_schema.properties.x',
          config_section: 'states',
          config_line: 12,
          message: "'x' is missing",
        },
      ],
      warnings: [{ outcome: 'UNVERIFIED', kind: 'contract_validation' }],
      coverage: {
        validated_states: 2,
        total_states: 3,
        uncovered_state_ids: ['s2'],
        analysed: true,
        cap_reached: false,
      },
    },
  },
}

describe('contractProtocol literals', () => {
  it('exposes the protocol literals', () => {
    expect(CONTRACT_ERROR_TYPE).toBe('contract_validation')
    expect(CONTRACT_WARNING_KIND).toBe('contract_validation')
    expect(VALIDATION_MODES).toEqual(['warn', 'strict'])
  })
})

describe('isContractWarning', () => {
  it('matches only the contract kind', () => {
    expect(isContractWarning({ kind: 'contract_validation' })).toBe(true)
    expect(isContractWarning({ kind: 'consumer_slot' })).toBe(false)
    expect(isContractWarning(null)).toBe(false)
    expect(isContractWarning('contract_validation')).toBe(false)
  })
})

describe('parseContractOutcome', () => {
  it('parses a 200 save body with warnings', () => {
    const result = parseContractOutcome(SAVE_WITH_WARNINGS)

    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({
      id: 'w-1',
      outcome: 'WARNING',
      stateId: 'c1',
      path: 'task',
      configPath: 'task',
      configSection: 'states',
      configLine: 14,
      message: "'x' is not guaranteed",
      error_type: 'contract_validation',
      meta: { label: 'not guaranteed by the contracts' },
    })
    expect(result.coverage).toEqual(SAVE_WITH_WARNINGS.coverage)
    expect(result.truncated).toBeUndefined()
    expect(result.otherWarnings).toEqual([SAVE_WITH_WARNINGS.warnings[0]])
    expect((result.otherWarnings[0] as { kind: string }).kind).toBe('consumer_slot')
  })

  it('parses a 400 rejection from error.details', () => {
    const result = parseContractOutcome(REJECTION.error.details)

    expect(result.issues).toHaveLength(2)
    expect(result.issues[0]).toMatchObject({
      id: 'e-1',
      outcome: 'ERROR',
      stateId: 'c1',
      path: 'input_schema',
      configPath: 'input_schema.properties.x',
      configSection: 'states',
      configLine: 12,
    })
    expect(result.issues[1].outcome).toBe('UNVERIFIED')
    expect(result.coverage?.uncovered_state_ids).toEqual(['s2'])
    expect(result.otherWarnings).toEqual([])
  })

  it('accepts the whole error envelope as well', () => {
    const result = parseContractOutcome(REJECTION)
    expect(result.issues).toHaveLength(2)
    expect(result.coverage?.validated_states).toBe(2)
  })

  it('maps an unknown or missing outcome to ERROR', () => {
    const result = parseContractOutcome({
      warnings: [
        { kind: 'contract_validation', outcome: 'SURPRISE', message: 'a' },
        { kind: 'contract_validation', message: 'b' },
      ],
    })
    expect(result.issues.map((i) => i.outcome)).toEqual(['ERROR', 'ERROR'])
  })

  it('drops extra coverage keys and tolerates total_states 0', () => {
    const result = parseContractOutcome({
      warnings: [],
      coverage: {
        validated_states: 0,
        total_states: 0,
        uncovered_state_ids: [],
        analysed: false,
        cap_reached: false,
        surprise: 'x',
      },
    })
    expect(result.coverage).toEqual({
      validated_states: 0,
      total_states: 0,
      uncovered_state_ids: [],
      analysed: false,
      cap_reached: false,
    })
  })

  it('parses a body without coverage, strict_source or warnings_truncated', () => {
    const result = parseContractOutcome({
      warnings: [{ kind: 'contract_validation', outcome: 'WARNING', message: 'm' }],
    })
    expect(result.coverage).toBeUndefined()
    expect(result.truncated).toBeUndefined()
    expect((result.issues[0] as WorkflowBaseIssue).meta?.strict_source).toBeUndefined()
  })

  it('keeps strict_source and warnings_truncated when present', () => {
    const result = parseContractOutcome({
      warnings: [
        {
          kind: 'contract_validation',
          outcome: 'ERROR',
          message: 'm',
          meta: { strict_source: 'workflow' },
        },
      ],
      warnings_truncated: 7,
    })
    expect((result.issues[0] as WorkflowBaseIssue).meta?.strict_source).toBe('workflow')
    expect(result.truncated).toBe(7)
  })

  it('does not throw on empty or malformed bodies', () => {
    expect(parseContractOutcome(undefined)).toEqual({ issues: [], otherWarnings: [] })
    expect(parseContractOutcome('oops')).toEqual({ issues: [], otherWarnings: [] })
    expect(parseContractOutcome({ warnings: 'x', coverage: 5 })).toEqual({
      issues: [],
      otherWarnings: [],
    })
  })

  it('gives every issue a unique id', () => {
    const result = parseContractOutcome({
      errors: [{ id: 'same', outcome: 'ERROR', message: 'a' }],
      warnings: [
        { id: 'same', kind: 'contract_validation', outcome: 'WARNING', message: 'b' },
        { kind: 'contract_validation', outcome: 'WARNING', message: 'c' },
        { kind: 'contract_validation', outcome: 'WARNING', message: 'd' },
      ],
    })
    const ids = result.issues.map((i) => i.id)
    expect(new Set(ids).size).toBe(4)
    expect(ids.every(Boolean)).toBe(true)
  })
})

describe('isHiddenControlPath', () => {
  it('flags task on non-assistant nodes', () => {
    expect(isHiddenControlPath('task', NodeTypes.TOOL)).toBe(true)
    expect(isHiddenControlPath('task', NodeTypes.CUSTOM)).toBe(true)
    expect(isHiddenControlPath('task', NodeTypes.ASSISTANT)).toBe(false)
  })

  it('flags output_schema on transform only', () => {
    expect(isHiddenControlPath('output_schema', NodeTypes.TRANSFORM)).toBe(true)
    expect(isHiddenControlPath('output_schema', NodeTypes.TOOL)).toBe(false)
  })

  it('leaves other paths alone', () => {
    expect(isHiddenControlPath('input_schema', NodeTypes.TRANSFORM)).toBe(false)
  })
})

describe('isHiddenControlPath — hasTaskField', () => {
  it('keeps task in the form on a node that has a Task control', () => {
    expect(isHiddenControlPath('task', NodeTypes.CUSTOM, true)).toBe(false)
  })

  it('sends task to YAML on an assistant without a Task control', () => {
    expect(isHiddenControlPath('task', NodeTypes.ASSISTANT, false)).toBe(true)
  })
})

describe('ISSUE_OUTCOMES and formatCoverage', () => {
  it('lists every outcome, most severe first', () => {
    expect(ISSUE_OUTCOMES).toEqual(['ERROR', 'WARNING', 'UNVERIFIED'])
  })

  it('formats the input contract coverage line', () => {
    expect(
      formatCoverage({
        validated_states: 2,
        total_states: 5,
        uncovered_state_ids: [],
        analysed: true,
        cap_reached: false,
      })
    ).toBe('Input contract coverage: 2 of 5 states')
  })
})

describe('toWorkflowIssue', () => {
  it('takes the path from raw.path for a non-contract type', () => {
    const issue = toWorkflowIssue(
      { id: 'a', message: 'm', path: 'model', config_path: 'ignored' },
      'schema_validation',
      new Set(),
      0
    )

    expect(issue.path).toBe('model')
    expect(issue.error_type).toBe('schema_validation')
  })

  it('takes the path from config_path for a contract issue', () => {
    const issue = toWorkflowIssue(
      { id: 'a', message: 'm', path: 'x', config_path: 'input_schema.properties.x' },
      CONTRACT_ERROR_TYPE,
      new Set(),
      0
    )

    expect(issue.path).toBe('input_schema')
  })

  it('camel-cases the toolkit meta keys and keeps the others', () => {
    const issue = toWorkflowIssue(
      {
        id: 'a',
        message: 'm',
        meta: {
          toolkit_type: 'tt',
          toolkit_name: 'tn',
          tool_name: 'tool',
          mcp_name: 'mcp',
          strict_source: 'state',
        },
      },
      'resource_validation',
      new Set(),
      0
    )

    expect(issue.meta).toEqual({
      toolkitType: 'tt',
      toolkitName: 'tn',
      toolName: 'tool',
      mcpName: 'mcp',
      strict_source: 'state',
    })
  })

  it('reads an unknown outcome as ERROR, a missing line as 0 and drops unknown fields', () => {
    const issue = toWorkflowIssue(
      { message: 'm', outcome: 'SURPRISE', extra: 'x' },
      'schema_validation',
      new Set(),
      3
    )

    expect(issue).toEqual({
      id: 'schema_validation-3',
      message: 'm',
      path: '',
      configLine: 0,
      error_type: 'schema_validation',
      outcome: 'ERROR',
    })
  })

  it('makes a repeated id unique', () => {
    const used = new Set<string>()
    const first = toWorkflowIssue({ id: 'dup', message: 'm' }, 'schema_validation', used, 0)
    const second = toWorkflowIssue({ id: 'dup', message: 'm' }, 'schema_validation', used, 1)

    expect(first.id).toBe('dup')
    expect(second.id).not.toBe('dup')
  })
})

describe('parseContractOutcome — registry paths', () => {
  const parseOne = (record: object) =>
    parseContractOutcome({
      warnings: [{ kind: 'contract_validation', outcome: 'WARNING', message: 'm', ...record }],
    }).issues[0]

  it('leaves the registry path empty when the backend sent no config_path', () => {
    const issue = parseOne({ path: 'task', state_id: 'c1' })

    expect(issue.path).toBe('')
    expect(issue.configPath).toBeUndefined()
  })

  it("maps a transform actor property path to the transform's Output Schema control", () => {
    const issue = parseOne({
      path: 'ghost',
      state_id: 't1',
      config_path: 'config.output_schema.properties.ghost',
    })

    expect(issue.path).toBe('config.output_schema')
    expect(issue.configPath).toBe('config.output_schema.properties.ghost')
  })

  it('keeps the state-level output_schema path apart from the transform control', () => {
    expect(parseOne({ state_id: 't1', config_path: 'output_schema.properties.x' }).path).toBe(
      'output_schema.properties.x'
    )
  })
})

describe('hasSaveWarnings', () => {
  const issue = (outcome: 'ERROR' | 'WARNING' | 'UNVERIFIED') =>
    ({ id: outcome, outcome } as unknown as ParsedContractOutcome['issues'][number])

  it('is true for a visible warning', () => {
    expect(hasSaveWarnings({ issues: [issue('WARNING')], otherWarnings: [] })).toBe(true)
  })

  it('is true for an ERROR in a 2xx body, e.g. an unknown outcome read fail closed', () => {
    expect(hasSaveWarnings({ issues: [issue('ERROR')], otherWarnings: [] })).toBe(true)
    const parsed = parseContractOutcome({
      warnings: [{ kind: 'contract_validation', outcome: 'SURPRISE', message: 'm' }],
    })
    expect(hasSaveWarnings(parsed)).toBe(true)
  })

  it('is true when entries were cut off at the response limit, whatever is visible', () => {
    expect(
      hasSaveWarnings({ issues: [issue('UNVERIFIED')], truncated: 1, otherWarnings: [] })
    ).toBe(true)
  })

  it('is false for unverified entries only, or nothing', () => {
    expect(hasSaveWarnings({ issues: [issue('UNVERIFIED')], otherWarnings: [] })).toBe(false)
    expect(hasSaveWarnings({ issues: [], truncated: 0, otherWarnings: [] })).toBe(false)
  })
})
