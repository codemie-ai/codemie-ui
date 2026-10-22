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

import { describe, it, expect } from 'vitest'

import { User } from '@/types/entity/user'
import { canAccessUsersTab } from '@/utils/permissions'

const baseUser: User = {
  userId: 'u1',
  email: 'u1@example.com',
  isAdmin: false,
  isAuthenticated: true,
}

describe('canAccessUsersTab', () => {
  it('returns false for null or undefined', () => {
    expect(canAccessUsersTab(null)).toBe(false)
    expect(canAccessUsersTab(undefined)).toBe(false)
  })

  it('returns false for a plain user with no platform role', () => {
    expect(canAccessUsersTab(baseUser)).toBe(false)
  })

  it('returns true for an admin', () => {
    expect(canAccessUsersTab({ ...baseUser, isAdmin: true })).toBe(true)
  })

  it('returns true for a maintainer', () => {
    expect(canAccessUsersTab({ ...baseUser, isMaintainer: true })).toBe(true)
  })

  it('returns true for an auditor', () => {
    expect(canAccessUsersTab({ ...baseUser, isAuditor: true })).toBe(true)
  })

  it('returns false for a project admin without a platform role', () => {
    expect(canAccessUsersTab({ ...baseUser, applicationsAdmin: ['some-project'] })).toBe(false)
  })
})
