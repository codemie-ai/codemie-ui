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

import { PaginatedResponse } from '@/types/common'
import {
  CostCenterDetail,
  CostCenterListItem,
  CostCenterPayload,
  CostCenterUpdatePayload,
} from '@/types/entity/costCenter'
import { FilterOption } from '@/types/filters'
import api from '@/utils/api'
import { makeCleanObject } from '@/utils/utils'

const COST_CENTERS_BASE_URL = 'v1/admin/cost-centers'

export const costCentersStore = {
  getCostCenters(params?: {
    search?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<CostCenterListItem>> {
    return api
      .get(COST_CENTERS_BASE_URL, {
        params: makeCleanObject({
          search: params?.search,
          page: params?.page ?? 0,
          per_page: params?.per_page ?? 20,
        }),
      })
      .then((response) => response.json())
  },

  getCostCenter(id: string): Promise<CostCenterDetail> {
    return api
      .get(`${COST_CENTERS_BASE_URL}/${encodeURIComponent(id)}`)
      .then((response) => response.json())
  },

  createCostCenter(payload: CostCenterPayload): Promise<CostCenterListItem> {
    return api
      .post(COST_CENTERS_BASE_URL, makeCleanObject(payload), { skipErrorHandling: true })
      .then((response) => response.json())
  },

  updateCostCenter(id: string, payload: CostCenterUpdatePayload): Promise<CostCenterListItem> {
    return api
      .patch(`${COST_CENTERS_BASE_URL}/${encodeURIComponent(id)}`, makeCleanObject(payload), {
        skipErrorHandling: true,
      })
      .then((response) => response.json())
  },

  deleteCostCenter(id: string): Promise<void> {
    return api.delete(`${COST_CENTERS_BASE_URL}/${encodeURIComponent(id)}`).then(() => undefined)
  },

  getCostCenterOptions(search = ''): Promise<FilterOption[]> {
    return this.getCostCenters({
      search,
      page: 0,
      per_page: 20,
    }).then((data) =>
      data.data.map((costCenter) => ({
        label: costCenter.name,
        value: costCenter.id,
      }))
    )
  },
}
