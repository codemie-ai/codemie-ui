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
// EPMCDME-14866: project deletion must not be blocked by integrations alone —
// the backend now auto-deletes a project's integrations instead of blocking on
// them, and the UI's Delete-eligibility check must match.

import { render, screen } from '@testing-library/react'
import { useSnapshot } from 'valtio'
import { describe, it, expect, vi } from 'vitest'

import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'

import ProjectsManagementFull from '../ProjectsManagementFull'

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    resolve: () => ({ href: '/', path: '/', searchParamsString: '' }),
    currentRoute: { value: { query: {}, path: '/' } },
  }),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [false, true]),
  useUserManagementEnabled: vi.fn(() => [false, true]),
  useBudgetManagementEnabled: vi.fn(() => [false, true]),
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))

vi.mock('@/components/Table', () => ({
  default: ({ items, customRenderColumns }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.name} data-testid={`row-${item.name}`}>
          {customRenderColumns?.actions?.(item)}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/pages/settings/administration/components/NameLinkCell', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/pages/settings/administration/components/BudgetSpendCell', () => ({
  default: () => null,
}))

vi.mock('@/pages/settings/administration/projectsManagement/ProjectResourceCounters', () => ({
  default: () => null,
}))

vi.mock('@/pages/settings/administration/projectsManagement/ProjectModal', () => ({
  default: () => null,
}))

vi.mock('@/components/ConfirmationModal', () => ({
  default: () => null,
}))

// Expose disabled + tooltip so this test can assert on both.
vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ items }: any) => (
    <div>
      {items.map((item: any) => (
        <button key={item.title} disabled={item.disabled} title={item.tooltip}>
          {item.title}
        </button>
      ))}
    </div>
  ),
  NavigationItem: {},
}))

vi.mock('@/components/form/Input', () => ({
  default: () => null,
}))

vi.mock('@/components/form/Select', () => ({
  default: () => null,
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('@/components/InfoWarning', () => ({
  default: () => null,
}))

vi.mock('@/hooks/useDebounceApply', () => ({
  useDebouncedApply: vi.fn(),
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: vi.fn(),
  }
})

const baseProject = {
  name: 'my-project',
  id: 'my-project',
  project_type: 'standard',
  user_count: 5,
}

const renderWithProject = (counters: Record<string, number>) => {
  vi.mocked(useSnapshot).mockImplementation((store) => {
    if (store === projectsStore) {
      return {
        projects: [{ ...baseProject, counters }],
        pagination: { page: 1, perPage: 10, total: 1, totalPages: 1 },
        loading: false,
      }
    }
    if (store === userStore) {
      return { user: { platform_role: 'admin', isAdmin: true } }
    }
    return {}
  })

  render(<ProjectsManagementFull />)
}

describe('ProjectsManagementFull — delete eligibility (EPMCDME-14866)', () => {
  it('enables Delete when the project has only integrations', () => {
    renderWithProject({
      assistants_count: 0,
      workflows_count: 0,
      integrations_count: 1,
      datasources_count: 0,
      skills_count: 0,
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    expect(deleteButton).not.toBeDisabled()
  })

  it('enables Delete when every counter is zero', () => {
    renderWithProject({
      assistants_count: 0,
      workflows_count: 0,
      integrations_count: 0,
      datasources_count: 0,
      skills_count: 0,
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    expect(deleteButton).not.toBeDisabled()
  })

  it('disables Delete with an accurate tooltip when the project has assistants', () => {
    renderWithProject({
      assistants_count: 1,
      workflows_count: 0,
      integrations_count: 0,
      datasources_count: 0,
      skills_count: 0,
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    expect(deleteButton).toBeDisabled()
    expect(deleteButton.title).toContain('assistants')
  })

  it('disables Delete and names only the true blocker when the project has both assistants and integrations', () => {
    renderWithProject({
      assistants_count: 1,
      workflows_count: 0,
      integrations_count: 1,
      datasources_count: 0,
      skills_count: 0,
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    expect(deleteButton).toBeDisabled()
    expect(deleteButton.title).toContain('assistants')
    expect(deleteButton.title).not.toContain('integrations')
  })

  it('uses grammatically correct "and" joining when two resources block deletion', () => {
    renderWithProject({
      assistants_count: 1,
      workflows_count: 1,
      integrations_count: 0,
      datasources_count: 0,
      skills_count: 0,
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    expect(deleteButton.title).toContain('assistants and workflows')
  })

  it('uses an Oxford comma when three or more resources block deletion', () => {
    renderWithProject({
      assistants_count: 1,
      workflows_count: 1,
      integrations_count: 0,
      datasources_count: 1,
      skills_count: 0,
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    expect(deleteButton.title).toContain('assistants, workflows, and datasources')
  })
})
