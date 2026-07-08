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

import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { MCP_SETTINGS_TYPE_LABEL } from '@/constants/settings'

import { IntegrationSelector } from '../IntegrationSelector'

// Capture the props the real Select receives so we can drive its value callback directly and assert
// what the control renders. The leading "No integration" option carries a non-empty sentinel value
// (not '') so PrimeReact can match it and show the label instead of the "Default integration"
// placeholder; the selector maps that sentinel back to null before it leaves the component.
const selectProps: any = {}
vi.mock('@/components/form/Select', () => ({
  default: (props: any) => {
    Object.assign(selectProps, props)
    return null
  },
}))

vi.mock('@/store', () => ({ userStore: { user: null } }))
vi.mock('@/utils/user', () => ({ isUserProjectAdmin: () => false }))

const baseProps = {
  itemKey: 'MCP_srv',
  project: 'proj-a',
  credentialType: MCP_SETTINGS_TYPE_LABEL,
  originalToolName: 'srv',
  options: [{ id: 'uuid-1', alias: 'My Jira', setting_type: 'user', project_name: 'proj-a' }],
  onAdd: vi.fn(),
}

describe('IntegrationSelector — MCP two-state emits a string integration id', () => {
  beforeEach(() => {
    Object.keys(selectProps).forEach((k) => delete selectProps[k])
  })

  it('uses the sanitized onChangeValue path (never raw onChange)', () => {
    render(<IntegrationSelector {...baseProps} settingId={null} onUpdate={vi.fn()} />)
    expect(typeof selectProps.onChangeValue).toBe('function')
    expect(selectProps.onChange).toBeUndefined()
  })

  it('labels the MCP DEFAULT leading option "No integration" with a non-empty sentinel value', () => {
    render(<IntegrationSelector {...baseProps} settingId={null} onUpdate={vi.fn()} />)
    expect(selectProps.options[0].label).toBe('No integration')
    // The value must be a non-empty string so PrimeReact can match it (an empty '' would fall back
    // to the placeholder), and it must not be a real integration id.
    expect(selectProps.options[0].value).toBeTruthy()
    expect(selectProps.options[0].value).not.toBe('')
    expect(selectProps.options[0].value).not.toBe('uuid-1')
  })

  it('feeds the control the leading sentinel value for DEFAULT so it shows "No integration", not the placeholder', () => {
    render(<IntegrationSelector {...baseProps} settingId={null} onUpdate={vi.fn()} />)
    // A resolvable, non-empty value guarantees the label renders instead of "Default integration".
    expect(selectProps.value).toBe(selectProps.options[0].value)
    expect(selectProps.value).toBeTruthy()
  })

  it('feeds the control the real uuid when an explicit integration is selected', () => {
    render(<IntegrationSelector {...baseProps} settingId="uuid-1" onUpdate={vi.fn()} />)
    expect(selectProps.value).toBe('uuid-1')
  })

  it('emits null for DEFAULT when the leading sentinel option is chosen', () => {
    const onUpdate = vi.fn()
    render(<IntegrationSelector {...baseProps} settingId={null} onUpdate={onUpdate} />)

    // Picking "No integration" hands back the sentinel value; the selector maps it back to null so
    // the stored value / backend contract is unchanged (base config).
    selectProps.onChangeValue(selectProps.options[0].value)

    expect(onUpdate).toHaveBeenCalledWith('MCP_srv', null, null)
  })

  it('still emits null when Select hands back null (empty-option object-leak guard)', () => {
    const onUpdate = vi.fn()
    render(<IntegrationSelector {...baseProps} settingId={null} onUpdate={onUpdate} />)

    selectProps.onChangeValue(null)

    expect(onUpdate).toHaveBeenCalledWith('MCP_srv', null, null)
  })

  it('emits the uuid string plus the backing setting for an explicit integration', () => {
    const onUpdate = vi.fn()
    render(<IntegrationSelector {...baseProps} settingId={null} onUpdate={onUpdate} />)

    selectProps.onChangeValue('uuid-1')

    expect(onUpdate).toHaveBeenCalledWith('MCP_srv', 'uuid-1', baseProps.options[0])
    expect(typeof onUpdate.mock.calls[0][1]).toBe('string')
  })

  it('labels the non-MCP DEFAULT leading option "None" with the same non-empty sentinel', () => {
    render(
      <IntegrationSelector
        {...baseProps}
        credentialType="Jira"
        settingId={null}
        onUpdate={vi.fn()}
      />
    )
    expect(selectProps.options[0].label).toBe('None')
    expect(selectProps.options[0].value).toBeTruthy()
    expect(selectProps.value).toBe(selectProps.options[0].value)
  })
})
