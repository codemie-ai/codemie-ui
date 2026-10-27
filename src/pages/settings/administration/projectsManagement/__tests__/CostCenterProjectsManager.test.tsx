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

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { userStore } from '@/store/user'
import { ProjectListItem } from '@/types/entity/projectManagement'

import CostCenterProjectsManager from '../CostCenterProjectsManager'

// Mock the Pagination component to expose page/perPage changes for testing
let capturedPaginationProps: any = null
vi.mock('@/components/Pagination', () => ({
  default: (props: any) => {
    capturedPaginationProps = props
    return (
      <div data-testid="pagination">
        <button data-testid="page-change-20" onClick={() => props.setPage(0, 20)}>
          Show 20 per page
        </button>
        <button data-testid="page-change-50" onClick={() => props.setPage(0, 50)}>
          Show 50 per page
        </button>
        <button data-testid="page-2" onClick={() => props.setPage(1, props.perPage)}>
          Page 2
        </button>
      </div>
    )
  },
}))

vi.mock('@/components/Table', () => ({
  default: ({ items }: any) => (
    <div data-testid="projects-table">
      {items.map((item: any) => (
        <div key={item.name} data-testid={`project-${item.name}`}>
          {item.name}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/form/Input/Input', () => ({
  default: ({ value, onChange }: any) => (
    <input data-testid="search-input" value={value} onChange={onChange} />
  ),
}))

vi.mock('@/components/ConfirmationModal', () => ({
  default: () => null,
}))

vi.mock('../AssignProjectToCostCenterPopup', () => ({
  default: () => null,
}))

vi.mock('../CostCenterProjectsBulkActions', () => ({
  default: () => null,
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/utils/projectDisplayName', () => ({
  getProjectDisplayName: (p: any) => p.name,
}))

vi.mock('@/store/projects', () => ({
  projectsStore: {
    updateProject: vi.fn(),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    info: vi.fn(),
  },
}))

// Helper to create test projects
const createProject = (name: string): ProjectListItem => ({
  name,
  description: `Project ${name}`,
  project_type: 'standard',
  user_count: 5,
  admin_count: 1,
  created_by: 'admin',
  created_at: new Date().toISOString(),
})

// Create 25 projects to test pagination (default 10, plus options for 20, 50)
const createProjects = (count: number): ProjectListItem[] => {
  return Array.from({ length: count }, (_, i) => createProject(`project-${i + 1}`))
}

beforeEach(() => {
  userStore.user = { isAdmin: true } as any
  capturedPaginationProps = null
})

describe('CostCenterProjectsManager — items per page', () => {
  it('renders 10 projects by default', () => {
    const projects = createProjects(25)

    render(<CostCenterProjectsManager costCenterId="cc-1" projects={projects} />)

    // Should show exactly 10 projects on page 1 (0-9)
    for (let i = 1; i <= 10; i += 1) {
      expect(screen.getByTestId(`project-project-${i}`)).toBeInTheDocument()
    }
    // Should not show projects 11-25 on page 1
    expect(screen.queryByTestId('project-project-11')).not.toBeInTheDocument()
  })

  it('increases items per page when user selects 20 from dropdown', async () => {
    const projects = createProjects(25)
    const user = userEvent.setup()

    render(<CostCenterProjectsManager costCenterId="cc-1" projects={projects} />)

    // Click button to change perPage to 20
    await act(async () => {
      await user.click(screen.getByTestId('page-change-20'))
    })

    // Should now show 20 projects (all of them, since we only have 25)
    for (let i = 1; i <= 20; i += 1) {
      expect(screen.getByTestId(`project-project-${i}`)).toBeInTheDocument()
    }
    // Should not show project 21+ on page 1 with 20 per page
    expect(screen.queryByTestId('project-project-21')).not.toBeInTheDocument()
  })

  it('updates page navigation when per-page size changes', async () => {
    const projects = createProjects(25)
    const user = userEvent.setup()

    render(<CostCenterProjectsManager costCenterId="cc-1" projects={projects} />)

    // Initially perPage should be 10, total 25 projects = 3 pages
    expect(capturedPaginationProps.perPage).toBe(10)
    expect(capturedPaginationProps.totalPages).toBe(3)

    // Change to 20 per page
    await act(async () => {
      await user.click(screen.getByTestId('page-change-20'))
    })

    // perPage should be 20, total 25 projects = 2 pages
    expect(capturedPaginationProps.perPage).toBe(20)
    expect(capturedPaginationProps.totalPages).toBe(2)
  })

  it('persists selected page size when navigating between pages', async () => {
    const projects = createProjects(50)
    const user = userEvent.setup()

    render(<CostCenterProjectsManager costCenterId="cc-1" projects={projects} />)

    // Change to 20 per page
    await act(async () => {
      await user.click(screen.getByTestId('page-change-20'))
    })

    expect(capturedPaginationProps.perPage).toBe(20)

    // Navigate to page 2
    await act(async () => {
      await user.click(screen.getByTestId('page-2'))
    })

    // perPage should still be 20 after navigation
    expect(capturedPaginationProps.perPage).toBe(20)
    // Should show projects 21-40 (second page with 20 per page)
    for (let i = 21; i <= 40; i += 1) {
      expect(screen.getByTestId(`project-project-${i}`)).toBeInTheDocument()
    }
  })

  it('resets to default (10) page size on new render', () => {
    const projects = createProjects(25)

    const { rerender } = render(
      <CostCenterProjectsManager costCenterId="cc-1" projects={projects} />
    )

    // Check default
    expect(capturedPaginationProps.perPage).toBe(10)

    // Rerender with different projects (simulating component remount/refresh)
    const newProjects = createProjects(30)
    rerender(<CostCenterProjectsManager costCenterId="cc-1" projects={newProjects} />)

    // perPage should reset to default (10) — state is not preserved across renders
    expect(capturedPaginationProps.perPage).toBe(10)
  })
})
