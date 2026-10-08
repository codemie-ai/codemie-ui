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
import { describe, it, expect, vi } from 'vitest'

import { UserListItem } from '@/types/entity/user'

import UserProjectsTable from '../UserProjectsTable'

vi.mock('@/store/user', () => ({ userStore: {} }))
vi.mock('../popups/AddProjectPopup', () => ({ default: () => null }))

const makeUser = (projects: UserListItem['projects']): UserListItem => ({
  id: 'target-1',
  name: 'Target User',
  username: 'target',
  email: 'target@example.com',
  is_admin: false,
  is_active: true,
  user_type: 'regular',
  auth_source: 'internal',
  last_login_at: null,
  projects,
  picture: null,
  date: null,
})

describe('UserProjectsTable — project column layout (EPMCDME-15739)', () => {
  it('does not cap the project name width, so long names stay on one line', () => {
    const longName = 'uladzislau_svetlakou@epam.com'
    render(
      <UserProjectsTable
        user={makeUser([{ name: longName, is_project_admin: false, is_default: true }])}
        canManageProjects
      />
    )

    expect(screen.getByText(longName).className).not.toMatch(/max-w-/)
  })
})
