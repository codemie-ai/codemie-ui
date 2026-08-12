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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import DataSourceName from '../DataSourceName'

const push = vi.fn()

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push }) }))

const makeDataSource = (overrides: Record<string, unknown> = {}) => ({
  id: 'ds-1',
  repo_name: 'my-repo',
  full_name: 'org/my-repo',
  index_type: 'git',
  status: 'indexed',
  ...overrides,
})

describe('DataSourceName keyboard accessibility', () => {
  it('is exposed as a native, natively focusable button element', () => {
    render(<DataSourceName dataSource={makeDataSource() as any} />)

    const element = screen.getByRole('button', { name: 'my-repo' })
    expect(element.tagName).toBe('BUTTON')
  })

  it('navigates to the datasource details on Enter key press', async () => {
    const user = userEvent.setup()
    render(<DataSourceName dataSource={makeDataSource() as any} />)

    screen.getByRole('button', { name: 'my-repo' }).focus()
    await user.keyboard('{Enter}')

    expect(push).toHaveBeenCalledWith({ name: 'data-source-details', params: { id: 'ds-1' } })
  })

  it('navigates to the datasource details on Space key press', async () => {
    const user = userEvent.setup()
    render(<DataSourceName dataSource={makeDataSource() as any} />)

    screen.getByRole('button', { name: 'my-repo' }).focus()
    await user.keyboard(' ')

    expect(push).toHaveBeenCalledWith({ name: 'data-source-details', params: { id: 'ds-1' } })
  })
})
