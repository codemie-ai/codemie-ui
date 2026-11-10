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

import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { userStore } from '@/store/user'
import { Assistant } from '@/types/entity/assistant'
import { User } from '@/types/entity/user'

import AssistantDetailsSidebarSections from '../AssistantDetailsSidebarSections'

const mockGetSharedWith = vi.fn().mockResolvedValue([])

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    sharing: { loadSharedWith: (...args: unknown[]) => mockGetSharedWith(...args) },
  },
}))

vi.mock('@/hooks/useProjectDisplayNames', () => ({
  useProjectDisplayNames: () => new Map([['my-project', 'My Display Name']]),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useRequestHedgingEnabled: () => [false],
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { findLLMLabel: () => null },
}))

vi.mock('@/store/mcp', () => ({
  mcpStore: { configs: [], getConfig: vi.fn().mockResolvedValue({}) },
}))

vi.mock('@/store/user', () => ({
  userStore: { user: { userId: 'owner-id' } },
}))

vi.mock('@/pages/assistants/components/ToolkitsViewList', () => ({
  default: () => null,
}))

vi.mock('@/components/guardrails/GuardrailAssignmentsDetails/GuardrailAssignmentsDetails', () => ({
  default: () => null,
}))

vi.mock('../RequestHedgingDetails', () => ({ default: () => null }))

vi.mock('../sidebar_details/SidebarSubassistants', () => ({ default: () => null }))

vi.mock('../sidebar_details/SidebarTags', () => ({ default: () => null }))

const assistant: Assistant = {
  id: 'a1',
  name: 'Test Assistant',
  slug: 'test-assistant',
  description: '',
  is_global: false,
  shared: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  system_prompt: '',
  llm_model_type: 'gpt-4',
  project: 'my-project',
  mcp_servers: [],
  system_prompt_history: [],
  guardrail_assignments: [],
}

describe('AssistantDetailsSidebarSections — project name display', () => {
  it('renders project technical name', () => {
    const { getByText } = render(<AssistantDetailsSidebarSections assistant={assistant} />)
    expect(getByText('my-project')).toBeInTheDocument()
  })

  it('shows the display name as a react-tooltip hint on the project name', () => {
    const { getByText } = render(<AssistantDetailsSidebarSections assistant={assistant} />)
    const projectValue = getByText('my-project')
    expect(projectValue.getAttribute('data-tooltip-id')).toBe('react-tooltip')
    expect(projectValue.getAttribute('data-tooltip-content')).toBe('My Display Name')
  })
})

describe('AssistantDetailsSidebarSections — shared status property', () => {
  it('shows Shared status for the owner of the assistant', () => {
    const ownedAssistant: Assistant = {
      ...assistant,
      shared: true,
      created_by: { id: 'owner-id', name: 'Owner', email: 'owner@test.com' },
    }
    const { getByText } = render(<AssistantDetailsSidebarSections assistant={ownedAssistant} />)
    expect(getByText('Shared status', { exact: false })).toBeInTheDocument()
  })

  it('hides Shared status for an assistant shared with the current user by someone else', () => {
    const sharedWithMeAssistant: Assistant = {
      ...assistant,
      shared: true,
      created_by: { id: 'someone-else', name: 'Someone Else', email: 'someone@test.com' },
    }
    const { queryByText } = render(
      <AssistantDetailsSidebarSections assistant={sharedWithMeAssistant} />
    )
    expect(queryByText('Shared status', { exact: false })).not.toBeInTheDocument()
  })

  it('shows Shared status for a project member who is not the owner', () => {
    const originalUser = userStore.user
    userStore.user = { userId: 'member-id', projects: [{ name: 'my-project' }] } as User
    try {
      const memberAssistant: Assistant = {
        ...assistant,
        shared: true,
        created_by: { id: 'someone-else', name: 'Someone Else', email: 'someone@test.com' },
      }
      const { getByText } = render(<AssistantDetailsSidebarSections assistant={memberAssistant} />)
      expect(getByText('Shared status', { exact: false })).toBeInTheDocument()
    } finally {
      userStore.user = originalUser
    }
  })

  it('hides Shared status when neither the assistant creator nor the viewer id is known', () => {
    const originalUser = userStore.user
    userStore.user = {} as User
    try {
      const { queryByText } = render(<AssistantDetailsSidebarSections assistant={assistant} />)
      expect(queryByText('Shared status', { exact: false })).not.toBeInTheDocument()
    } finally {
      userStore.user = originalUser
    }
  })

  it('shows Shared status for global assistants regardless of ownership', () => {
    const globalAssistant: Assistant = {
      ...assistant,
      is_global: true,
      created_by: { id: 'someone-else', name: 'Someone Else', email: 'someone@test.com' },
    }
    const { getByText } = render(<AssistantDetailsSidebarSections assistant={globalAssistant} />)
    expect(getByText('Shared status', { exact: false })).toBeInTheDocument()
  })
})

describe('AssistantDetailsSidebarSections — shared with section', () => {
  const ownedAssistant: Assistant = {
    ...assistant,
    created_by: { id: 'owner-id', name: 'Owner', email: 'owner@test.com' },
  }

  beforeEach(() => {
    mockGetSharedWith.mockReset().mockResolvedValue([])
  })

  it('does not render the SHARED WITH section when nobody has access', async () => {
    const { queryByText } = render(<AssistantDetailsSidebarSections assistant={ownedAssistant} />)
    await waitFor(() => expect(mockGetSharedWith).toHaveBeenCalledWith(ownedAssistant.id))
    expect(queryByText('SHARED WITH')).not.toBeInTheDocument()
  })

  it('renders the SHARED WITH section and its users once loaded', async () => {
    mockGetSharedWith.mockResolvedValue([{ id: 'u1', name: 'Alice', email: 'alice@test.com' }])
    const { getByText } = render(<AssistantDetailsSidebarSections assistant={ownedAssistant} />)
    await waitFor(() => expect(getByText('SHARED WITH')).toBeInTheDocument())
    expect(getByText('Alice')).toBeInTheDocument()
  })

  it('does not fetch shared-with users for a non-owner viewing the assistant', async () => {
    const nonOwnerAssistant: Assistant = {
      ...assistant,
      created_by: { id: 'someone-else', name: 'Someone Else', email: 'someone@test.com' },
    }
    const { queryByText } = render(
      <AssistantDetailsSidebarSections assistant={nonOwnerAssistant} />
    )
    await waitFor(() => expect(queryByText('SHARED WITH')).not.toBeInTheDocument())
    expect(mockGetSharedWith).not.toHaveBeenCalled()
  })

  it('does not reject unhandled when loading fails, and offers a retry as the app details do', async () => {
    mockGetSharedWith
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce([{ id: 'u1', name: 'Alice', email: 'alice@test.com' }])
    const unhandledRejection = vi.fn()
    process.on('unhandledRejection', unhandledRejection)

    const { findByRole, findByText, getByText, queryByText } = render(
      <AssistantDetailsSidebarSections assistant={ownedAssistant} />
    )
    expect(await findByText('Could not load the people with access.')).toBeInTheDocument()
    expect(getByText('SHARED WITH')).toBeInTheDocument()
    expect(unhandledRejection).not.toHaveBeenCalled()
    process.off('unhandledRejection', unhandledRejection)

    fireEvent.click(await findByRole('button', { name: 'Retry loading people' }))
    expect(await findByText('Alice')).toBeInTheDocument()
    expect(queryByText('Could not load the people with access.')).not.toBeInTheDocument()
    expect(mockGetSharedWith).toHaveBeenCalledTimes(2)
  })

  it('leaves the current user out of the list, as the share popup does', async () => {
    mockGetSharedWith.mockResolvedValue([
      { id: 'owner-id', name: 'Owner', email: 'owner@test.com' },
      { id: 'u1', name: 'Alice', email: 'alice@test.com' },
    ])
    const { findByText, queryByText } = render(
      <AssistantDetailsSidebarSections assistant={ownedAssistant} />
    )
    expect(await findByText('Alice')).toBeInTheDocument()
    expect(queryByText('Owner')).not.toBeInTheDocument()
  })
})
