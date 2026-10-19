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

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { forwardRef, useImperativeHandle } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import EditSettingPageBase, { EditableSetting } from '../EditSettingPageBase'

let capturedOnSubmit: ((values: Record<string, unknown>) => void) | null = null

vi.mock('../SettingsForm/SettingsForm', () => ({
  default: forwardRef((props: any, ref: any) => {
    capturedOnSubmit = props.onSubmit
    useImperativeHandle(ref, () => ({ submit: vi.fn(), validate: vi.fn() }))
    return null
  }),
}))
vi.mock('../EditIntegrationActions', () => ({ default: () => null }))
vi.mock('@/components/Sidebar', () => ({ default: () => null }))
vi.mock('@/components/Spinner', () => ({ default: () => null }))
vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ children, rightContent }: any) => (
    <div>
      {rightContent}
      {children}
    </div>
  ),
}))

const mockNavigateBack = vi.hoisted(() => vi.fn())
vi.mock('@/utils/helpers', () => ({ navigateBack: mockNavigateBack }))

const mockToaster = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn() }))
vi.mock('@/utils/toaster', () => ({ default: mockToaster }))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    currentRoute: {
      value: { query: { project_name: 'proj-a', credential_type: 'jira', alias: 'my-jira' } },
    },
  }),
}))

const SETTING: EditableSetting = {
  id: 'setting-1',
  project_name: 'proj-a',
  alias: 'my-jira',
  credential_type: 'jira',
  credential_key: 'jira-key',
  credential_values: [],
}

const renderPage = ({ updateSetting = vi.fn().mockResolvedValue({}) } = {}) => {
  const fetchSetting = vi.fn().mockResolvedValue(SETTING)
  render(
    <EditSettingPageBase
      title="Edit"
      sidebarTitle="Integrations"
      sidebarDescription="Manage your integrations"
      backRoute="/integrations"
      successMessage="Integration updated successfully"
      fetchSetting={fetchSetting}
      updateSetting={updateSetting}
    />
  )
  return { fetchSetting, updateSetting }
}

describe('EditSettingPageBase — confirm before changing an integration project (EPMCDME-12586)', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup()
  })

  it('saves immediately, without showing the modal, when the project is unchanged', async () => {
    const { updateSetting } = renderPage()
    await waitFor(() => expect(capturedOnSubmit).not.toBeNull())

    capturedOnSubmit!({ project_name: 'proj-a', alias: 'my-jira' })

    await waitFor(() =>
      expect(updateSetting).toHaveBeenCalledWith('setting-1', {
        project_name: 'proj-a',
        alias: 'my-jira',
      })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a confirmation modal and withholds the save when the project changes', async () => {
    const { updateSetting } = renderPage()
    await waitFor(() => expect(capturedOnSubmit).not.toBeNull())

    capturedOnSubmit!({ project_name: 'proj-b', alias: 'my-jira' })

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/proj-a/)).toBeInTheDocument()
    expect(updateSetting).not.toHaveBeenCalled()
  })

  it('saves the pending values once the project change is confirmed', async () => {
    const { updateSetting } = renderPage()
    await waitFor(() => expect(capturedOnSubmit).not.toBeNull())

    capturedOnSubmit!({ project_name: 'proj-b', alias: 'my-jira' })
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: /Change Project/i }))

    await waitFor(() =>
      expect(updateSetting).toHaveBeenCalledWith('setting-1', {
        project_name: 'proj-b',
        alias: 'my-jira',
      })
    )
    expect(mockToaster.info).toHaveBeenCalledWith('Integration updated successfully')
  })

  it('discards the pending change and saves nothing when the modal is cancelled', async () => {
    const { updateSetting } = renderPage()
    await waitFor(() => expect(capturedOnSubmit).not.toBeNull())

    capturedOnSubmit!({ project_name: 'proj-b', alias: 'my-jira' })
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: /Cancel/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(updateSetting).not.toHaveBeenCalled()
    expect(mockNavigateBack).not.toHaveBeenCalled()
  })
})
