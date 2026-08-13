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

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Toolkit from '../Toolkit'

vi.mock('../../../../ToolkitIcon', () => ({ default: () => <span /> }))

const tool = { name: 'generic_jira_tool', label: 'Generic Jira', settings_config: true }

const baseProps = {
  toolkit: { toolkit: 'Project Management', label: 'Project Management', tools: [tool] } as never,
  settings: { jira: [{ id: 'int-1', alias: 'My Jira', setting_type: 'USER' }] } as never,
  toggleTool: vi.fn(),
  toggleAllTools: vi.fn(),
  updateToolSetting: vi.fn(),
  updateToolkitSetting: vi.fn(),
  onAddSettingClick: vi.fn(),
}

describe('author Toolkit — auto lookup toggle reflects and persists the stored flag', () => {
  afterEach(cleanup)

  it('shows the toggle off when the stored flag is false', () => {
    // The toggle used to be derived from "nothing pinned", which made a saved "lookup off" look
    // enabled — and the user could never turn it back on.
    render(
      <Toolkit
        {...baseProps}
        selectedToolkits={[
          {
            toolkit: 'Project Management',
            tools: [{ ...tool, auto_credentials_lookup: false }],
          } as never,
        ]}
      />
    )

    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  it('shows the toggle on when the flag is absent (assistants created before the field)', () => {
    render(
      <Toolkit {...baseProps} selectedToolkits={[{ toolkit: 'Project Management', tools: [tool] } as never]} />
    )

    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('persists enabling it', async () => {
    const updateToolAutoLookup = vi.fn()
    render(
      <Toolkit
        {...baseProps}
        updateToolAutoLookup={updateToolAutoLookup}
        selectedToolkits={[
          {
            toolkit: 'Project Management',
            tools: [{ ...tool, auto_credentials_lookup: false }],
          } as never,
        ]}
      />
    )

    await userEvent.click(screen.getByRole('switch'))

    expect(updateToolAutoLookup).toHaveBeenCalledWith(expect.anything(), expect.anything(), true)
  })

  it('reflects the flag that arrives after the first render', () => {
    // The form mounts before the assistant's toolkits are loaded. Reading the flag once, in a
    // useState initializer, left the toggle stuck on its initial value — which is exactly how a
    // saved "lookup off" kept showing as enabled.
    const { rerender } = render(
      <Toolkit {...baseProps} selectedToolkits={[] as never} />
    )

    rerender(
      <Toolkit
        {...baseProps}
        selectedToolkits={[
          {
            toolkit: 'Project Management',
            tools: [{ ...tool, auto_credentials_lookup: false }],
          } as never,
        ]}
      />
    )

    expect(screen.getByRole('switch')).not.toBeChecked()
  })
})
