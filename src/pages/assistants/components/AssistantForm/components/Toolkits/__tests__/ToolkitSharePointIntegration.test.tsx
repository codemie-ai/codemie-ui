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
import { afterEach, describe, expect, it, vi } from 'vitest'

import Toolkit from '../Toolkit'

vi.mock('../../../../ToolkitIcon', () => ({ default: () => <span /> }))

// The backend names the tool `sharepoint_site` but stores its credentials under the `SharePoint`
// credential type, so the form has to translate the tool name before looking settings up.
const tool = { name: 'sharepoint_site', label: 'SharePoint Site Tool', settings_config: true }

const baseProps = {
  toolkit: { toolkit: 'SharePoint', label: 'SharePoint', tools: [tool] } as never,
  settings: {
    sharepoint: [{ id: 'sp-1', alias: 'sharepoint-2026-08-17_10-36', setting_type: 'USER' }],
  } as never,
  toggleTool: vi.fn(),
  toggleAllTools: vi.fn(),
  updateToolSetting: vi.fn(),
  updateToolkitSetting: vi.fn(),
  onAddSettingClick: vi.fn(),
}

const selectedWithLookupOff = [
  {
    toolkit: 'SharePoint',
    tools: [{ ...tool, auto_credentials_lookup: false }],
  } as never,
]

describe('author Toolkit — SharePoint tool offers existing user integrations', () => {
  afterEach(cleanup)

  it('offers the existing SharePoint integration instead of only "Add User Integration"', () => {
    render(<Toolkit {...baseProps} selectedToolkits={selectedWithLookupOff} />)

    expect(document.querySelector('.p-dropdown')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add User Integration/i })).not.toBeInTheDocument()
  })

  it('preselects a pinned SharePoint integration', () => {
    render(
      <Toolkit
        {...baseProps}
        selectedToolkits={[
          {
            toolkit: 'SharePoint',
            tools: [
              {
                ...tool,
                auto_credentials_lookup: false,
                settings: {
                  id: 'sp-1',
                  alias: 'sharepoint-2026-08-17_10-36',
                  setting_type: 'USER',
                },
              },
            ],
          } as never,
        ]}
      />
    )

    expect(document.querySelector('.p-dropdown-label')).toHaveTextContent(
      'sharepoint-2026-08-17_10-36 (USER)'
    )
  })

  it('still falls back to the add action when the author has no SharePoint integration', () => {
    render(
      <Toolkit {...baseProps} settings={{} as never} selectedToolkits={selectedWithLookupOff} />
    )

    expect(screen.getByRole('button', { name: /Add User Integration/i })).toBeInTheDocument()
  })
})
