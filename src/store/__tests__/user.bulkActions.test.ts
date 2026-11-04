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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { userStore } from '@/store/user'
import { ProjectRole } from '@/types/entity/project'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

vi.mock('@/utils/api')
vi.mock('@/utils/toaster')

describe('userStore bulk actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('bulkAssignToProject', () => {
    it('shows the backend error message when present', async () => {
      vi.mocked(api.post).mockRejectedValue({
        parsedError: { message: 'Users are deactivated: alice@example.com' },
      })

      await expect(
        userStore.bulkAssignToProject(['u1'], 'proj', ProjectRole.USER)
      ).rejects.toBeTruthy()
      expect(toaster.error).toHaveBeenCalledWith('Users are deactivated: alice@example.com')
    })

    it('falls back to the default text when no backend message is present', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('boom'))

      await expect(
        userStore.bulkAssignToProject(['u1'], 'proj', ProjectRole.USER)
      ).rejects.toBeTruthy()
      expect(toaster.error).toHaveBeenCalledWith('Failed to assign users to project')
    })
  })

  describe('bulkUpdateUsersProjectRole', () => {
    it('shows the backend error message when present', async () => {
      vi.mocked(api.post).mockRejectedValue({
        parsedError: { message: 'Users are deactivated: bob@example.com' },
      })

      await expect(
        userStore.bulkUpdateUsersProjectRole(['u1'], 'proj', ProjectRole.USER)
      ).rejects.toBeTruthy()
      expect(toaster.error).toHaveBeenCalledWith('Users are deactivated: bob@example.com')
    })

    it('falls back to the default text when no backend message is present', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('boom'))

      await expect(
        userStore.bulkUpdateUsersProjectRole(['u1'], 'proj', ProjectRole.USER)
      ).rejects.toBeTruthy()
      expect(toaster.error).toHaveBeenCalledWith('Failed to update user roles')
    })
  })

  describe('bulkSetBudgets', () => {
    it('shows the backend error message when present', async () => {
      vi.mocked(api.put).mockRejectedValue({
        parsedError: { message: 'Users are deactivated: carol@example.com' },
      })

      await expect(
        userStore.bulkSetBudgets(['u1'], [{ category: 'platform', budget_id: 'b1' }])
      ).rejects.toBeTruthy()
      expect(toaster.error).toHaveBeenCalledWith('Users are deactivated: carol@example.com')
    })

    it('falls back to the default text when no backend message is present', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('boom'))

      await expect(
        userStore.bulkSetBudgets(['u1'], [{ category: 'platform', budget_id: 'b1' }])
      ).rejects.toBeTruthy()
      expect(toaster.error).toHaveBeenCalledWith('Failed to update budgets for users')
    })
  })
})
