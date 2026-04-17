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

export type PlatformRole = 'user' | 'platform_admin' | 'admin'

export interface UsersManagementFilters {
  search: string
  projects: string[]
  budgets: string[]
  platform_role?: PlatformRole | null
}

export const FILTER_INITIAL_STATE: UsersManagementFilters = {
  search: '',
  projects: [],
  budgets: [],
  platform_role: null,
}

export const MAX_DISPLAYED_PROJECTS = 3
