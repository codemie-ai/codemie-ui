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
import { MemoryRouter } from 'react-router'
import { useSnapshot } from 'valtio'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'

import ProjectsManagementFull from '../ProjectsManagementFull'

const resolveMock = vi.fn(({ name, query }) => {
  const searchParamsString = new URLSearchParams(
    Object.entries(query ?? {}).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((i: unknown) => [k, String(i)]) : [[k, String(v)]]
    )
  ).toString()
  return { href: `/${name}`, path: `/${name}`, searchParamsString }
})

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    resolve: resolveMock,
    currentRoute: { value: { query: {}, path: '/' } },
  }),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [false, true]),
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))

vi.mock('@/components/Table', () => ({
  default: ({ items, customRenderColumns }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.name} data-testid={`row-${item.name}`}>
          {customRenderColumns?.assignments?.(item)}
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

vi.mock('@/pages/settings/administration/projectsManagement/ProjectModal', () => ({
  default: () => null,
}))

vi.mock('@/components/ConfirmationModal', () => ({
  default: () => null,
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: () => null,
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

const mockProject = {
  name: 'my-project',
  id: 'proj-1',
  project_type: 'standard',
  user_count: 5,
  counters: {
    assistants_count: 3,
    workflows_count: 2,
    integrations_count: 1,
    datasources_count: 4,
    skills_count: 5,
  },
}

beforeEach(() => {
  vi.mocked(useSnapshot).mockImplementation((store) => {
    if (store === projectsStore) {
      return {
        projects: [mockProject],
        pagination: { page: 1, perPage: 10, total: 1, totalPages: 1 },
        loading: false,
      }
    }
    if (store === userStore) {
      return { user: { platform_role: 'admin', isAdmin: true } }
    }
    return {}
  })
  resolveMock.mockClear()
})

const expectBadgeHref = (label: RegExp, expectedRoute: string) => {
  const link = screen.getByRole('link', { name: label })
  const href = link.getAttribute('href') ?? ''
  expect(href).toContain(expectedRoute)
  expect(href).toContain('project=my-project')
}

describe('ProjectsManagementFull — resource counter links', () => {
  it('assistants badge links to assistants-project with project filter', () => {
    render(
      <MemoryRouter>
        <ProjectsManagementFull />
      </MemoryRouter>
    )
    expectBadgeHref(/assistants/i, 'assistants-project')
  })

  it('skills badge links to skills-project with project filter', () => {
    render(
      <MemoryRouter>
        <ProjectsManagementFull />
      </MemoryRouter>
    )
    expectBadgeHref(/skills/i, 'skills-project')
  })

  it('workflows badge links to workflows-all with project filter', () => {
    render(
      <MemoryRouter>
        <ProjectsManagementFull />
      </MemoryRouter>
    )
    expectBadgeHref(/workflows/i, 'workflows-all')
  })

  it('integrations badge links to integrations with project filter', () => {
    render(
      <MemoryRouter>
        <ProjectsManagementFull />
      </MemoryRouter>
    )
    expectBadgeHref(/integrations/i, 'integrations')
  })

  it('data sources badge links to data-sources with project filter', () => {
    render(
      <MemoryRouter>
        <ProjectsManagementFull />
      </MemoryRouter>
    )
    expectBadgeHref(/data sources/i, 'data-sources')
  })
})
