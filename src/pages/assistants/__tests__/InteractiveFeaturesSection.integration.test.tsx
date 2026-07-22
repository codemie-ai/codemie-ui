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

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { renderPage, mockAPI } from '@/test-utils/integration'

const INTERACTIVE_FLAG = { id: 'features:interactiveElements', settings: { enabled: true } }

describe('AssistantForm Interactive features section - Integration', () => {
  const user = userEvent.setup()

  const userWithProject = {
    user_id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    is_admin: false,
    is_maintainer: false,
    user_type: 'INTERNAL',
    applications: ['test-project'],
    projects: [{ name: 'test-project', display_name: null, is_project_admin: true }],
  }

  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    mockRouterState.currentRoute.value = {
      path: '/assistants/new',
      name: 'new-assistant',
      params: {},
      query: {},
      hash: '',
    }
    localStorage.setItem('codemie-new-asst-ai-popup', 'false')
    localStorage.setItem('test-user-id_onboarding-visited-pages', JSON.stringify(['assistants']))
    mockAPI('GET', 'v1/assistants/tools', [])
  })

  it('hides the section when the feature flag is disabled', async () => {
    renderPage('/assistants/new')

    await waitFor(() => {
      expect(screen.getByText('Create Assistant')).toBeInTheDocument()
    })

    expect(screen.queryByText('Interactive features')).not.toBeInTheDocument()
  })

  it('shows the section when the feature flag is enabled', async () => {
    mockAPI('GET', 'v1/config', [INTERACTIVE_FLAG])

    renderPage('/assistants/new')

    await waitFor(() => {
      expect(screen.getByText('Interactive features')).toBeInTheDocument()
    })
  })

  it('lists the available interactive elements (incl. Date picker and Dropdown)', async () => {
    mockAPI('GET', 'v1/config', [INTERACTIVE_FLAG])

    renderPage('/assistants/new')

    await waitFor(() => {
      expect(screen.getByText('Interactive features')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Interactive features'))
    await user.click(screen.getByLabelText('Enable interactive features'))

    const info = screen.getByText(/request structured input directly in chat using/i)
    expect(info).toHaveTextContent('Dropdown')
    expect(info).toHaveTextContent('Date picker')
  })

  it('enabling interactive features turns on the whole element catalog', async () => {
    mockAPI('GET', 'v1/user', userWithProject)
    mockAPI('GET', 'v1/config', [INTERACTIVE_FLAG])
    mockAPI('POST', 'v1/assistants', { id: 'new-assistant-id', assistantId: 'new-assistant-id' })

    renderPage('/assistants/new')

    await waitFor(() => {
      expect(screen.getByText('test-project')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Name*'), 'Interactive Assistant')
    await user.type(screen.getByPlaceholderText(/description/i), 'Interactive one')
    await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are interactive')

    await user.click(screen.getByText('Interactive features'))
    await user.click(screen.getByLabelText('Enable interactive features'))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/assistants'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(
            '"interactive_features":{"action_buttons":true,"choice":true,"short_forms":true}'
          ),
        })
      )
    })
  })
})
