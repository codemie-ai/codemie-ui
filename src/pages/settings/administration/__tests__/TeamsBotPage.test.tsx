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
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
const mockIndexProjects = vi.fn()

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/store/projects', () => ({
  projectsStore: {
    projects: [
      { id: 'p1', name: 'alpha-project', display_name: 'Alpha Project' },
      { id: 'p2', name: 'beta-project', display_name: 'Beta Project' },
    ],
    pagination: { page: 0, perPage: 12, totalPages: 1, totalCount: 2 },
    loading: false,
    indexProjects: mockIndexProjects,
  },
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useTeamsEnabled: () => [true, true],
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: { content: React.ReactNode }) => <div>{content}</div>,
}))

function createTableMock() {
  return {
    default: ({ items, customRenderColumns }: any) => (
      <div>
        {items.map((item: any) => (
          <div key={item.name} data-testid={`row-${item.name}`}>
            {customRenderColumns?.name?.(item)}
            {customRenderColumns?.actions?.(item)}
          </div>
        ))}
      </div>
    ),
  }
}

vi.mock('@/components/Table', createTableMock)

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('@/components/form/Input', () => ({
  default: () => null,
}))

describe('TeamsBotPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIndexProjects.mockResolvedValue([])
  })

  it('renders project rows', async () => {
    const { default: TeamsBotPage } = await import('../TeamsBotPage')
    render(
      <MemoryRouter>
        <TeamsBotPage />
      </MemoryRouter>
    )
    expect(await screen.findByText('alpha-project')).toBeInTheDocument()
    expect(screen.getByText('beta-project')).toBeInTheDocument()
  })

  it('navigates to project page on Configure click', async () => {
    const { default: TeamsBotPage } = await import('../TeamsBotPage')
    render(
      <MemoryRouter>
        <TeamsBotPage />
      </MemoryRouter>
    )
    const buttons = await screen.findAllByRole('button', { name: /configure/i })
    fireEvent.click(buttons[0])
    expect(mockNavigate).toHaveBeenCalledWith(
      `/settings/administration/teams/${encodeURIComponent('alpha-project')}`
    )
  })

  it('redirects to /settings/administration when feature flag is disabled', async () => {
    vi.resetModules()
    vi.doMock('@/hooks/useFeatureFlags', () => ({
      useTeamsEnabled: () => [false, true],
    }))
    vi.doMock('react-router', async () => {
      const actual = await vi.importActual('react-router')
      return { ...actual, useNavigate: () => mockNavigate }
    })
    vi.doMock('@/store/projects', () => ({
      projectsStore: {
        projects: [],
        pagination: { page: 0, perPage: 12, totalPages: 1, totalCount: 0 },
        loading: false,
        indexProjects: mockIndexProjects,
      },
    }))
    vi.doMock('@/pages/settings/components/SettingsLayout', () => ({
      default: ({ content }: { content: React.ReactNode }) => <div>{content}</div>,
    }))
    vi.doMock('@/components/Table', createTableMock)
    vi.doMock('@/components/Button', () => ({
      default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    }))
    vi.doMock('@/components/form/Input', () => ({
      default: () => null,
    }))
    const { default: TeamsBotPage } = await import('../TeamsBotPage')
    render(
      <MemoryRouter>
        <TeamsBotPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/administration', { replace: true })
    })
  })
})
