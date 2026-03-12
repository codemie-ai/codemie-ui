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

import { PaginationBE } from '@/types/common'
import type {
  GuardrailCreateAssignmentResult,
  GuardrailAssignmentResponse,
  GuardrailAssignmentRequest,
  GuardrailListItem,
  GuardrailAssignment,
  GuardrailEntity,
} from '@/types/entity/guardrail'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

interface GuardrailStore {
  fetchGuardrails: (
    filters?: { project?: string; setting_id?: string; search?: string },
    page?: number,
    perPage?: number
  ) => Promise<{
    data: GuardrailListItem[]
    pagination: PaginationBE
  }>
  fetchGuardrailAssignments: (guardrailId: string) => Promise<GuardrailAssignmentResponse>
  saveGuardrailAssignments: (
    guardrailId: string,
    payload: GuardrailAssignmentRequest
  ) => Promise<void>
  fetchEntityAssignments: (
    project: string,
    entityType: GuardrailEntity
  ) => Promise<GuardrailAssignment[]>
}

export const guardrailStore = proxy<GuardrailStore>({
  async fetchGuardrails(filters = {}, page = 0, perPage = 20) {
    try {
      const params = new URLSearchParams()

      if (Object.keys(filters).length > 0) {
        params.append('filters', JSON.stringify(filters))
      }

      params.append('page', page.toString())
      params.append('per_page', perPage.toString())

      const response = await api.get(`v1/guardrails?${params.toString()}`)
      return response.json()
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      console.error('Store Error (fetchGuardrails):', error)
      throw new Error(`Failed to fetch guardrails: ${contextualError}`)
    }
  },

  async fetchGuardrailAssignments(guardrailId: string) {
    try {
      const response = await api.get(`v1/guardrails/${guardrailId}/assignments`)
      return await response.json()
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      console.error('Store Error (fetchGuardrailAssignments):', error)
      throw new Error(`Failed to fetch guardrail assignments: ${contextualError}`)
    }
  },

  async saveGuardrailAssignments(guardrailId, payload) {
    try {
      const response = await api.put(`v1/guardrails/${guardrailId}/assignments`, payload)
      const data = (await response.json()) as GuardrailCreateAssignmentResult

      if (data.failed) toaster.error(`Failed save guardrail assignments: ${data.errors}`)
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      toaster.error(`Failed save guardrail assignments: ${contextualError}`)
      console.error('Store Error (saveGuardrailAssignments):', error)
      throw error
    }
  },

  async fetchEntityAssignments(project, entityType) {
    try {
      const params = new URLSearchParams()
      params.append('project', project)
      params.append('entity_type', entityType)

      const response = await api.get(`v1/guardrails/assignments?${params.toString()}`)
      return response.json()
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      console.error('Store Error (fetchEntityAssignments):', error)
      throw new Error(`Failed to fetch entity assignments: ${contextualError}`)
    }
  },
})
