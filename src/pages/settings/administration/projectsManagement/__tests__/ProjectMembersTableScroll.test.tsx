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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProjectMembersManager from '@/pages/settings/administration/projectsManagement/ProjectMembersManager'
import { userStore } from '@/store/user'
import { ProjectDetail } from '@/types/entity/projectManagement'

vi.mock('@/utils/toaster', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

const mockProject: ProjectDetail = {
  name: 'Test Project',
  description: 'Project description',
  project_type: 'shared',
  created_by: 'admin@epam.com',
  created_at: '2026-03-19T10:00:00Z',
  user_count: 1,
  admin_count: 1,
  cost_center_id: 'cc-1',
  cost_center_name: 'Cost Center',
  enforce_member_spend_limits: true,
  members: [],
}

const janeDoe = {
  id: 'u-1',
  name: 'Jane Doe',
  username: 'Jane Doe',
  email: 'jane@epam.com',
  is_admin: false,
  is_active: true,
  user_type: 'INTERNAL',
  auth_source: 'local',
  last_login_at: null,
  projects: [{ name: 'Test Project', is_project_admin: false }],
  picture: null,
  date: null,
}

let resizeCallbacks: ResizeObserverCallback[] = []
let scrollHeight = 0
let clientHeight = 0

const getGutterBox = () =>
  screen.getByTestId('project-members-table-scroll').firstElementChild as HTMLElement

describe('ProjectMembersManager — table scrollbar gutter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    resizeCallbacks = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn()

        unobserve = vi.fn()

        disconnect = vi.fn()

        constructor(callback: ResizeObserverCallback) {
          resizeCallbacks.push(callback)
        }
      }
    )
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => scrollHeight)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => clientHeight)
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    userStore.getUsers = vi.fn().mockResolvedValue({
      data: [janeDoe],
      pagination: { page: 0, per_page: 10, total: 1 },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds the scrollbar gutter once loaded rows overflow the container', async () => {
    scrollHeight = 1000
    clientHeight = 200

    render(<ProjectMembersManager project={mockProject} />)

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
    expect(getGutterBox()).toHaveClass('pr-4')
  })

  it('re-measures the gutter when the container is resized', async () => {
    scrollHeight = 200
    clientHeight = 200

    render(<ProjectMembersManager project={mockProject} />)

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
    expect(getGutterBox()).not.toHaveClass('pr-4')

    clientHeight = 100
    act(() => {
      resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver))
    })

    expect(getGutterBox()).toHaveClass('pr-4')
  })
})
