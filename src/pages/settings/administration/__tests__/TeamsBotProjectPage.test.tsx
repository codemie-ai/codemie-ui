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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockFetchMappings = vi.fn()
const mockRemoveMapping = vi.fn()

const mockStore: {
  assistants: any[]
  pagination: { page: number; perPage: number; totalPages: number; totalCount: number }
  loading: boolean
  error: string | null
  fetchMappings: typeof mockFetchMappings
  removeMapping: typeof mockRemoveMapping
} = {
  assistants: [
    {
      id: 'a1',
      name: 'Bot Alpha',
      slug: 'bot-alpha',
      description: '',
      is_global: false,
      shared: false,
      created_at: '',
      updated_at: '',
      system_prompt: '',
      llm_model_type: '',
    },
  ],
  pagination: { page: 0, perPage: 12, totalPages: 1, totalCount: 1 },
  loading: false,
  error: null,
  fetchMappings: mockFetchMappings,
  removeMapping: mockRemoveMapping,
}

vi.mock('@/store/assistantsProjectMapping', () => ({
  assistantsProjectMappingStore: mockStore,
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: { content: React.ReactNode }) => <div>{content}</div>,
}))

vi.mock('@/components/Table', () => ({
  default: ({ items, customRenderColumns }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.id} data-testid={`row-${item.id}`}>
          {customRenderColumns?.name?.(item)}
          {customRenderColumns?.actions?.(item)}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('@/pages/settings/administration/components/AddAssistantModal', () => ({
  default: () => null,
}))

vi.mock('@/components/ConfirmationModal', () => ({
  default: ({ visible, onConfirm }: { visible: boolean; onConfirm: () => void }) =>
    visible ? <button onClick={onConfirm}>Confirm delete</button> : null,
}))

const renderWithRoute = async (projectName: string) => {
  const { default: TeamsBotProjectPage } = await import('../TeamsBotProjectPage')
  return render(
    <MemoryRouter initialEntries={[`/settings/administration/teams/${projectName}`]}>
      <Routes>
        <Route
          path="/settings/administration/teams/:projectName"
          element={<TeamsBotProjectPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('TeamsBotProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchMappings.mockResolvedValue(undefined)
    mockRemoveMapping.mockResolvedValue(undefined)
  })

  it('calls fetchMappings on mount with projectName from URL', async () => {
    await renderWithRoute('my-project')
    await waitFor(() => {
      expect(mockFetchMappings).toHaveBeenCalledWith('my-project', 0, 12)
    })
  })

  it('renders assistant rows', async () => {
    await renderWithRoute('my-project')
    expect(await screen.findByText('Bot Alpha')).toBeInTheDocument()
  })

  it('calls removeMapping when Remove is clicked and confirmed, then shows success toast', async () => {
    const toaster = (await import('@/utils/toaster')).default
    await renderWithRoute('my-project')
    const removeButton = await screen.findByRole('button', { name: /^remove$/i })
    fireEvent.click(removeButton)
    const confirmButton = await screen.findByRole('button', { name: /confirm delete/i })
    fireEvent.click(confirmButton)
    await waitFor(() => {
      expect(mockRemoveMapping).toHaveBeenCalledWith('a1', 'my-project')
      expect(toaster.info).toHaveBeenCalledWith('Assistant removed')
    })
  })

  it('renders empty state when no assistants are configured', async () => {
    mockStore.assistants = []
    mockStore.error = null
    await renderWithRoute('my-project')
    expect(
      await screen.findByText('No assistants configured for Teams bot on this project.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add assistants/i })).toBeInTheDocument()
  })

  it('renders error state', async () => {
    mockStore.assistants = []
    mockStore.error = 'Something went wrong'
    await renderWithRoute('my-project')
    expect(await screen.findByText('Failed to load assistants')).toBeInTheDocument()
  })
})
