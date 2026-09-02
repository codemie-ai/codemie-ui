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
import api from '@/utils/api'
import toaster from '@/utils/toaster'

vi.mock('@/utils/api')
vi.mock('@/utils/toaster')

describe('userStore.createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts payload and returns created user on success', async () => {
    const payload = {
      email: 'a@b.com',
      username: 'newuser',
      password: 'secret123',
      is_admin: false,
      is_maintainer: false,
      is_auditor: false,
    }
    const created = { id: '1', ...payload }
    vi.mocked(api.post).mockResolvedValue({ json: () => Promise.resolve(created) } as any)

    const result = await userStore.createUser(payload)

    expect(api.post).toHaveBeenCalledWith('v1/admin/users', payload, { skipErrorHandling: true })
    expect(result).toEqual(created)
    expect(toaster.info).toHaveBeenCalled()
  })

  it('toasts an error and rethrows on failure', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('boom'))
    await expect(
      userStore.createUser({
        email: 'a@b.com',
        username: 'newuser',
        password: 'secret123',
        is_admin: false,
        is_maintainer: false,
        is_auditor: false,
      })
    ).rejects.toThrow('boom')
    expect(toaster.error).toHaveBeenCalledWith('Failed to create user')
  })

  it('surfaces the backend error message when the response includes one', async () => {
    vi.mocked(api.post).mockRejectedValue({
      status: 400,
      parsedError: { message: 'Username already exists' },
    })
    await expect(
      userStore.createUser({
        email: 'a@b.com',
        username: 'newuser',
        password: 'secret123',
        is_admin: false,
        is_maintainer: false,
        is_auditor: false,
      })
    ).rejects.toBeTruthy()
    expect(toaster.error).toHaveBeenCalledWith('Username already exists')
  })
})
