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

import * as yup from 'yup'

import { WORK_ITEM_TITLE_MAX_LENGTH } from '@/constants/workItems'
import { WorkItemPriority, WorkItemStatus, WorkItemType } from '@/types/entity/workItem'

export const workItemSchema = yup.object({
  title: yup
    .string()
    .required('Title is required')
    .max(
      WORK_ITEM_TITLE_MAX_LENGTH,
      `Title must be at most ${WORK_ITEM_TITLE_MAX_LENGTH} characters`
    ),
  description: yup.string().optional(),
  type: yup.mixed<WorkItemType>().oneOf(Object.values(WorkItemType)).required('Type is required'),
  priority: yup
    .mixed<WorkItemPriority>()
    .oneOf(Object.values(WorkItemPriority))
    .required('Priority is required'),
  status: yup
    .mixed<WorkItemStatus>()
    .oneOf(Object.values(WorkItemStatus))
    .required('Status is required'),
  assignee: yup.string().optional(),
  tags: yup.array().of(yup.string().required()).optional(),
})

export type WorkItemFormData = {
  title: string
  description: string | undefined
  type: WorkItemType
  priority: WorkItemPriority
  status: WorkItemStatus
  assignee: string | undefined
  tags: string[] | undefined
}

export const defaultWorkItemFormValues: WorkItemFormData = {
  title: '',
  description: '',
  type: WorkItemType.TASK,
  priority: WorkItemPriority.MEDIUM,
  status: WorkItemStatus.OPEN,
  assignee: '',
  tags: [],
}
