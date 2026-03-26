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

import { ProjectListItem } from './projectManagement'

export interface CostCenterListItem {
  id: string
  name: string
  description?: string | null
  created_by?: string | null
  created_at?: string | null
  project_count: number
}

export interface CostCenterDetail extends CostCenterListItem {
  projects: ProjectListItem[]
}

export interface CostCenterPayload {
  name: string
  description?: string
}

export interface CostCenterUpdatePayload {
  description?: string
}
