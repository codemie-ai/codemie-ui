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

export enum WorkItemType {
  TASK = 'Task',
  BUG = 'Bug',
  FEATURE = 'Feature',
}

export enum WorkItemPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export enum WorkItemStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'InProgress',
  DONE = 'Done',
  CLOSED = 'Closed',
}

export interface WorkItem {
  id: string
  title: string
  description?: string
  type: WorkItemType
  priority: WorkItemPriority
  status: WorkItemStatus
  assignee?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface WorkItemFilters {
  type?: WorkItemType | ''
  priority?: WorkItemPriority | ''
  status?: WorkItemStatus | ''
  sort?: 'priority' | 'createdAt' | 'updatedAt'
  order?: 'asc' | 'desc'
}

export interface CreateWorkItemDto {
  title: string
  description?: string
  type: WorkItemType
  priority: WorkItemPriority
  status: WorkItemStatus
  assignee?: string
  tags?: string[]
}

export type UpdateWorkItemDto = CreateWorkItemDto
