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
import { beforeEach, describe, expect, it } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { mockAPI, renderPage } from '@/test-utils/integration'

const HEADROOM_FLAG = { id: 'features:headroom', settings: { enabled: true } }
const SECTION = 'Context compression (Headroom)'
const CONTEXT_ACCORDION = /^Context( & Data Sources)?$/

describe('AssistantForm Headroom section - Integration', () => {
  const user = userEvent.setup()

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
    await waitFor(() => expect(screen.getByText('Create Assistant')).toBeInTheDocument())
    expect(screen.queryByText(SECTION)).not.toBeInTheDocument()
  })

  it('shows the section when the feature flag is enabled', async () => {
    mockAPI('GET', 'v1/config', [HEADROOM_FLAG])
    renderPage('/assistants/new')
    await waitFor(() => expect(screen.getByText(SECTION)).toBeInTheDocument())
    await user.click(screen.getByText(CONTEXT_ACCORDION))
    expect(screen.getByLabelText('Enable context compression')).not.toBeChecked()
  })

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

  const fillAndSave = async () => {
    renderPage('/assistants/new')
    await waitFor(() => expect(screen.getByText('test-project')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText(SECTION)).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText('Name*'), 'My Assistant')
    await user.type(screen.getByPlaceholderText(/description/i), 'A useful assistant')
    await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are helpful')
  }

  const lastPostBody = (): string => {
    const calls = (global.fetch as any).mock.calls.filter(
      ([url, init]: [string, RequestInit]) =>
        String(url).includes('v1/assistants') && init?.method === 'POST'
    )
    return String(calls[calls.length - 1][1].body)
  }

  it('sends a null headroom_config when untouched', async () => {
    mockAPI('GET', 'v1/config', [HEADROOM_FLAG])
    mockAPI('GET', 'v1/user', userWithProject)
    mockAPI('POST', 'v1/assistants', { id: 'new-id', assistantId: 'new-id' })
    await fillAndSave()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(lastPostBody()).toBeDefined())
    expect(JSON.parse(lastPostBody()).headroom_config).toBeNull()
  })

  it('sends headroom_config in the payload after toggling the switch', async () => {
    mockAPI('GET', 'v1/config', [HEADROOM_FLAG])
    mockAPI('GET', 'v1/user', userWithProject)
    mockAPI('POST', 'v1/assistants', { id: 'new-id', assistantId: 'new-id' })
    await fillAndSave()
    await user.click(screen.getByText(CONTEXT_ACCORDION))
    await user.click(screen.getByLabelText('Enable context compression'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(lastPostBody()).toContain('"headroom_config"'))
    const body = JSON.parse(lastPostBody())
    expect(body.headroom_config).toEqual({
      enabled: true,
      compress_user_messages: true,
      compress_tool_outputs: true,
      strategy: 'balanced',
    })
  })

  it('shows a server strategy error inside the opened section', async () => {
    mockAPI('GET', 'v1/config', [HEADROOM_FLAG])
    mockAPI('GET', 'v1/user', userWithProject)
    mockAPI(
      'POST',
      'v1/assistants',
      {
        error: {
          message: 'Validation failed',
          details: 'headroom_config.strategy is not supported',
        },
        message: 'Validation failed',
        details: 'headroom_config.strategy is not supported',
      },
      422
    )
    await fillAndSave()
    // The Context accordion stays closed: the section must open itself to reveal the error.
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(screen.getByText(/headroom_config\.strategy is not supported/)).toBeInTheDocument()
    )
  })
})
