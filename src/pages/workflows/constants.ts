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

export const WORKFLOW_STATUS_BADGE_MAPPING = {
  'In Progress': 'in_progress',
  'Not Started': 'not_started',
  Interrupted: 'pending',
  Failed: 'error',
  Succeeded: 'success',
  ABORTED: 'warning',
  Aborted: 'warning',
} as const

export const WORKFLOW_LIST_SCOPE = {
  ALL: 'all',
  MY: 'my',
  TEMPLATES: 'templates',
} as const

export type WorkflowListScope = (typeof WORKFLOW_LIST_SCOPE)[keyof typeof WORKFLOW_LIST_SCOPE]

export const WORKFLOW_TAB = {
  EXECUTIONS: 'executions',
  CONFIG: 'config',
} as const

export type WorkflowTab = (typeof WORKFLOW_TAB)[keyof typeof WORKFLOW_TAB]

export const INITIAL_WORKFLOWS_FILTERS = {
  name: '',
  project: [],
  shared: '',
  created_by: '',
}

export const INITIAL_WORKFLOWS_PAGINATION = {
  page: 0,
  perPage: 12,
  totalPages: 0,
  totalCount: 0,
}
