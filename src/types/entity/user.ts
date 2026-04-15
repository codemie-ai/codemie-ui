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

import { BudgetAssignment, BudgetAssignmentsPayload } from '@/types/entity/budget'

export interface UserAssignedProject {
  name: string
  is_project_admin: boolean
}

export interface User {
  userId: string
  email: string
  name?: string
  isAdmin: boolean
  isMaintainer?: boolean
  isAuthenticated: boolean
  user_type?: string
  applications?: string[]
  applicationsAdmin?: string[]
  projects?: UserAssignedProject[]
  currentProject?: string
  username?: string
  picture?: string
}

export interface UserData {
  update_date: string
  sidebar_view: 'flat'
  user_id: string
  date: string
  id: string
  stt_support: boolean
}

export type UserType = 'regular' | 'external'

export interface UserListItem {
  id: string
  name: string | null
  username: string
  email: string
  is_admin: boolean
  is_maintainer?: boolean
  is_active: boolean
  user_type: UserType
  auth_source: string
  last_login_at: string | null
  projects: UserAssignedProject[]
  picture: string | null
  date: string | null
  budget_assignments?: BudgetAssignment[]
}

export interface UserUpdatePayload {
  user_type?: UserType
  budget_assignments?: BudgetAssignmentsPayload
  is_admin?: boolean
  is_maintainer?: boolean
}

export interface PaginationInfo {
  total: number
  page: number
  per_page: number
}

export interface GetUsersResponse {
  data: UserListItem[]
  pagination: PaginationInfo
}
