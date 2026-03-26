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

import { proxy } from 'valtio'

import { ENV } from '@/constants'
import { userStore } from '@/store/user'
import { BaseAuthFormData, RegisterPayload } from '@/types/auth'
import api from '@/utils/api'
import { getMode, getIsLocalAuth } from '@/utils/utils'
import { ValidationError } from '@/utils/validationError'

interface AuthStore {
  loading: boolean
  register: (payload: RegisterPayload) => Promise<boolean>
  login: (payload: BaseAuthFormData) => Promise<boolean>
  logout: () => Promise<void>
}

export const authStore = proxy<AuthStore>({
  loading: false,

  async register(payload: RegisterPayload) {
    this.loading = true
    try {
      const response = await fetch(`${api.BASE_URL}/v1/local-auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        const validationError = ValidationError.fromParsedError(errorData.error)
        if (validationError) throw validationError
        throw new Error(errorData.error?.message ?? errorData.error ?? 'Failed to create account')
      }

      return true
    } finally {
      this.loading = false
    }
  },

  async login(payload: BaseAuthFormData) {
    this.loading = true
    try {
      const response = await fetch(`${api.BASE_URL}/v1/local-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        const validationError = ValidationError.fromParsedError(errorData.error)
        if (validationError) throw validationError
        throw new Error(errorData.error?.message ?? errorData.error ?? 'Failed to sign in')
      }

      return true
    } finally {
      this.loading = false
    }
  },

  async logout() {
    if (getIsLocalAuth()) {
      await api.post('v1/local-auth/logout')
      userStore.user = null
      userStore.userData = null
      window.location.hash = '#/auth/sign-in'
      return
    }

    if (getMode() === ENV.LOCAL) {
      return
    }

    document.location.href = `${api.BASE_URL}/v1/user/log_out`
  },
})
