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

// Capture the props the real Select receives so we can drive its value callback directly. The real
// Select's `onChangeValue` always hands back a primitive (it runs extractValue, which returns null
// for the empty-string "Default" option — the known PrimeReact object-leak bug). We assert the
// selector wires that path and never forwards an option object into settingId.
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

  it('emits null for DEFAULT (empty option leaks as null from Select)', () => {
    const onUpdate = vi.fn()
    render(<IntegrationSelector {...baseProps} settingId={null} onUpdate={onUpdate} />)

    // Select returns null for the empty-string "Default" option after extractValue.
    selectProps.onChangeValue(null)

    expect(onUpdate).toHaveBeenCalledWith('MCP_srv', null, null)
    const emitted = onUpdate.mock.calls[0][1]
    expect(emitted === null || typeof emitted === 'string').toBe(true)
  })

  it('emits the uuid string plus the backing setting for an explicit integration', () => {
    const onUpdate = vi.fn()
    render(<IntegrationSelector {...baseProps} settingId={null} onUpdate={onUpdate} />)

    selectProps.onChangeValue('uuid-1')

    expect(onUpdate).toHaveBeenCalledWith('MCP_srv', 'uuid-1', baseProps.options[0])
    expect(typeof onUpdate.mock.calls[0][1]).toBe('string')
  })
})
