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

import { WorkItemPriority, WorkItemStatus, WorkItemType } from '@/types/entity/workItem'

export const WORK_ITEMS_PER_PAGE = 20

export const WORK_ITEM_TITLE_MAX_LENGTH = 200

export const WORK_ITEM_TYPE_OPTIONS = [
  { label: 'Task', value: WorkItemType.TASK },
  { label: 'Bug', value: WorkItemType.BUG },
  { label: 'Feature', value: WorkItemType.FEATURE },
]

export const WORK_ITEM_PRIORITY_OPTIONS = [
  { label: 'Low', value: WorkItemPriority.LOW },
  { label: 'Medium', value: WorkItemPriority.MEDIUM },
  { label: 'High', value: WorkItemPriority.HIGH },
  { label: 'Critical', value: WorkItemPriority.CRITICAL },
]

export const WORK_ITEM_STATUS_OPTIONS = [
  { label: 'Open', value: WorkItemStatus.OPEN },
  { label: 'In Progress', value: WorkItemStatus.IN_PROGRESS },
  { label: 'Done', value: WorkItemStatus.DONE },
  { label: 'Closed', value: WorkItemStatus.CLOSED },
]

export const WORK_ITEM_SORT_OPTIONS = [
  { label: 'Priority', value: 'priority' },
  { label: 'Created Date', value: 'createdAt' },
  { label: 'Updated Date', value: 'updatedAt' },
]
