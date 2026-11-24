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

import { fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkflowIssue } from '@/types/entity'
import { StateConfiguration } from '@/types/workflowEditor'
import { NodeTypes } from '@/types/workflowEditor/base'
import { processBackendError } from '@/utils/workflowEditor/helpers/backendErrorHandler'
import { parseContractOutcome } from '@/utils/workflowEditor/helpers/contractProtocol'

// Registers the contract controls (input_schema and the rest), so routing uses the production registry.
import '../configPanels/CommonStateFields'
import { enableWorkflowContracts } from '../configPanels/__tests__/contractTestUtils'
import useWorkflowFieldIssues from '../hooks/useWorkflowFieldIssues'
import IssueGroups, { groupIssues } from '../IssueGroups'

/**
 * Backend text reaches the panel, the inline field message and Go to Issue unchanged: names that look
 * like markup stay text, and every issue navigates with the location the backend sent. Ownership
 * (which control or YAML line an issue belongs to) is decided by the backend; nothing here re-derives it.
 */

declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var __injected: number | undefined
}

const HTML_MESSAGE = 'Missing <b>name</b> & <img src=x onerror="globalThis.__injected=1"> in input'
const HTML_DETAILS = 'producers: <b>a1</b> & 日本語 ü'
const KEY_ONE_MESSAGE = 'Property "1" is not guaranteed'
const KEY_ZERO_ONE_MESSAGE = 'Property "01" is not guaranteed'
const DOTTED_MESSAGE = 'Property "a.b[0]" is not guaranteed'
const NO_LOCATION_MESSAGE = 'Context key <i>task</i> is not guaranteed'
const TOOL_MESSAGE =
  'Tool <u>x</u> & <img src=y onerror="globalThis.__injected=2"> is not available'

// The rejection body for a contract failure: errors, warnings and a mix of locations.
const contractRejection = {
  error: {
    message: 'Workflow Configuration error',
    details: {
      error_type: 'contract_validation',
      errors: [
        {
          id: 'html',
          outcome: 'ERROR',
          state_id: 's1',
          path: 'task',
          config_path: 'input_schema.properties.<b>name</b>',
          config_section: 'states',
          config_line: 7,
          message: HTML_MESSAGE,
          details: HTML_DETAILS,
        },
      ],
      warnings: [
        {
          kind: 'contract_validation',
          id: 'key-1',
          outcome: 'WARNING',
          state_id: 's1',
          path: 'x',
          config_path: 'input_schema.properties.1',
          config_section: 'states',
          config_line: 11,
          message: KEY_ONE_MESSAGE,
        },
        {
          kind: 'contract_validation',
          id: 'key-01',
          outcome: 'WARNING',
          state_id: 's1',
          path: 'x',
          config_path: 'input_schema.properties.01',
          config_section: 'states',
          config_line: 12,
          message: KEY_ZERO_ONE_MESSAGE,
        },
        {
          kind: 'contract_validation',
          id: 'dotted',
          outcome: 'WARNING',
          state_id: 's1',
          path: 'x',
          config_path: 'input_schema.properties.a.b[0]',
          config_section: 'states',
          config_line: 13,
          message: DOTTED_MESSAGE,
        },
        {
          // No config_path: the backend named no field, so Go to Issue opens YAML at the sent line.
          kind: 'contract_validation',
          id: 'no-location',
          outcome: 'WARNING',
          state_id: 's1',
          path: 'task',
          config_section: 'states',
          config_line: 21,
          message: NO_LOCATION_MESSAGE,
        },
      ],
    },
  },
}

// A tool-owned issue comes from the resource validation path, not from the contract parser.
const toolRejection = {
  message: 'Workflow Configuration error',
  details: {
    error_type: 'resource_validation',
    errors: [
      {
        id: 'tool',
        state_id: 's1',
        path: 'tools',
        config_line: 31,
        message: 'Tool problem',
        details: TOOL_MESSAGE,
        meta: { toolkit_type: 'Jira', toolkit_name: 'tk<b>', tool_name: 'x.y[1]' },
      },
    ],
  },
}

// A true list index in a schema-validation path (`1` is a position here, not a key).
const LIST_MESSAGE = 'Item <b>1</b> of next.state_ids is invalid'
const listRejection = {
  message: 'Workflow Configuration error',
  details: {
    error_type: 'schema_validation',
    errors: [
      {
        id: 'list-index',
        state_id: 's1',
        path: 'next.state_ids.1',
        config_line: 41,
        message: LIST_MESSAGE,
      },
    ],
  },
}

const CONFIG_STATES = [
  { id: 's1', _meta: { type: NodeTypes.ASSISTANT } } as unknown as StateConfiguration,
]

const setup = () => {
  const contractIssues = parseContractOutcome(contractRejection).issues
  const toolIssues = processBackendError(toolRejection as any).issues as WorkflowIssue[]
  const listIssues = processBackendError(listRejection as any).issues as WorkflowIssue[]
  const issues = [...contractIssues, ...toolIssues, ...listIssues]

  const nav = {
    openNodeTab: vi.fn(),
    openYamlTab: vi.fn(),
    openAdvancedConfigTab: vi.fn(),
    openState: vi.fn(),
  }
  const { result } = renderHook(() =>
    useWorkflowFieldIssues({
      configStates: CONFIG_STATES,
      activeIssue: null,
      selectedStateId: 's1',
      issues,
      tempIssues: issues,
      setTempIssues: vi.fn(),
      isIssueResolved: () => false,
      isIssueDirty: () => false,
      markIssueDirty: vi.fn(),
      setDirtyIssues: vi.fn(),
      ...nav,
    })
  )
  const view = render(
    <IssueGroups
      groups={groupIssues(issues)}
      onGo={result.current.goToField}
      isResolved={() => false}
    />
  )
  const goTo = (id: string) =>
    fireEvent.click(
      within(screen.getByTestId(`issue-card-${id}`)).getByRole('button', { name: 'Go to Issue' })
    )
  return { issues, nav, field: result.current, view, goTo }
}

afterEach(() => {
  globalThis.__injected = undefined
})

describe('IssueGroups with backend text that looks like markup', () => {
  // The fixtures point at the Input contract control, which exists only while the contracts flag is on.
  beforeEach(enableWorkflowContracts)

  it('parses every record and keeps the location the backend sent', () => {
    const { issues } = setup()
    const byId = Object.fromEntries(issues.map((issue) => [issue.id, issue]))

    expect(byId.html).toMatchObject({ configLine: 7, configSection: 'states', stateId: 's1' })
    expect(byId['key-1']).toMatchObject({ configLine: 11, configPath: 'input_schema.properties.1' })
    expect(byId['key-01']).toMatchObject({
      configLine: 12,
      configPath: 'input_schema.properties.01',
    })
    expect(byId.dotted).toMatchObject({
      configLine: 13,
      configPath: 'input_schema.properties.a.b[0]',
    })
    expect(byId['no-location']).toMatchObject({ configLine: 21, path: '' })
    expect(byId['no-location'].configPath).toBeUndefined()
    expect(byId.tool).toMatchObject({ configLine: 31, path: 'tools', stateId: 's1' })
    expect(byId['list-index']).toMatchObject({ configLine: 41, path: 'next.state_ids.1' })
  })

  it('renders names, markup-looking text, Unicode and numeric keys exactly as sent', () => {
    const { view } = setup()

    expect(screen.getByText(HTML_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText(HTML_DETAILS)).toBeInTheDocument()
    expect(screen.getByText(KEY_ONE_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText(KEY_ZERO_ONE_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText(DOTTED_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText(NO_LOCATION_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText(TOOL_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText(LIST_MESSAGE)).toBeInTheDocument()

    // The text stayed text: no element was created from it and no handler ran.
    expect(view.container.querySelector('img, b, i, u')).toBeNull()
    expect(globalThis.__injected).toBeUndefined()
  })

  it('shows the same literal text in the inline field message, not the provenance line', () => {
    const { field } = setup()

    expect(field.getIssueField('input_schema').fieldError).toBe(HTML_MESSAGE)
    expect(
      field.getToolIssue({ toolkit: 'tk<b>', tool: 'x.y[1]', path: 'tools' })?.fieldError
    ).toBe(TOOL_MESSAGE)
  })

  it.each([
    ['html', 7],
    ['key-1', 11],
    ['key-01', 12],
    ['dotted', 13],
  ])('opens the bound control for %s with its original line %i', (id, line) => {
    const { nav, goTo } = setup()

    goTo(id)

    expect(nav.openYamlTab).not.toHaveBeenCalled()
    expect(nav.openNodeTab).toHaveBeenCalledTimes(1)
    expect(nav.openNodeTab).toHaveBeenCalledWith(expect.objectContaining({ id, configLine: line }))
    expect(nav.openState).toHaveBeenCalledWith('s1')
  })

  it('opens YAML at the sent line when the backend named no field', () => {
    const { nav, goTo } = setup()

    goTo('no-location')

    expect(nav.openNodeTab).not.toHaveBeenCalled()
    expect(nav.openYamlTab).toHaveBeenCalledTimes(1)
    expect(nav.openYamlTab).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'no-location', configLine: 21, configSection: 'states' })
    )
  })

  it('navigates a true list index with the sent line and path untouched', () => {
    const { nav, goTo } = setup()

    goTo('list-index')

    const calls = [nav.openNodeTab, nav.openYamlTab, nav.openAdvancedConfigTab].flatMap(
      (open) => open.mock.calls
    )
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toMatchObject({
      id: 'list-index',
      path: 'next.state_ids.1',
      configLine: 41,
    })
  })

  it('opens the node for a tool-owned issue with the original line', () => {
    const { nav, goTo } = setup()

    goTo('tool')

    expect(nav.openYamlTab).not.toHaveBeenCalled()
    expect(nav.openNodeTab).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tool',
        configLine: 31,
        meta: expect.objectContaining({ toolkitName: 'tk<b>', toolName: 'x.y[1]' }),
      })
    )
    expect(nav.openState).toHaveBeenCalledWith('s1')
  })
})
