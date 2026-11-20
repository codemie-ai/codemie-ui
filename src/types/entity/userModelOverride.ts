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

export interface UserModelOverride {
  id: string
  user_id: string
  project_name: string
  allowed_models: string[]
  default_model: string | null
  date: string | null
  update_date: string | null
}

export interface SetUserModelOverridePayload {
  /** Replaces the user's whole model set; the backend rejects an empty list. */
  allowed_models: string[]
  default_model?: string | null
}

export type BatchUserModelOverrideOperation = 'grant' | 'revoke'

export interface BatchUserModelOverridePayload {
  operation: BatchUserModelOverrideOperation
  user_ids: string[]
  allowed_models?: string[]
  default_model?: string | null
}
