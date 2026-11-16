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

import { ModelStatus } from './configuration'

export interface AdminGlobalDefaultResponse {
  saved_base_name: string | null
  updated_by_id: string | null
  updated_by_name: string | null
  updated_at: string | null
  effective_base_name: string | null
  source: string | null
  temporary_fallback: boolean
}

/** One item's outcome from `POST v1/admin/llm/status/bulk`. */
export interface BulkStatusResult {
  base_name: string
  status: ModelStatus
  success: boolean
  error: string | null
}

/** The aggregate of a bulk status update, summed across request chunks. */
export interface BulkStatusOutcome {
  total: number
  succeeded: number
  failed: number
  results: BulkStatusResult[]
}

export interface AdminModel {
  base_name: string
  modelType: 'chat' | 'embedding'
  label: string
  provider?: string
  isPremium?: boolean
  enabled: boolean
  status: ModelStatus
  routerType?: 'switchyard' | 'litellm_auto'
  cost?: { input: number; output: number }
  multimodal?: boolean
  supportsTools?: boolean
  supportsImageGeneration?: boolean
  defaultForCategories?: string[]
}

/** Display fields returned by GET /v1/admin/llm/status. */
export interface AdminModelCatalogItem {
  base_name: string
  label: string
  model_type: AdminModel['modelType']
  enabled: boolean
  status: ModelStatus
  provider?: string | null
  router_type?: AdminModel['routerType'] | null
  is_premium?: boolean | null
  multimodal?: boolean | null
  supports_tools?: boolean | null
  supports_image_generation?: boolean
  cost?: AdminModel['cost'] | null
}
