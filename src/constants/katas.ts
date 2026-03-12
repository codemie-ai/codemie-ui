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

import { KataStatus } from '@/types/entity/kata'

export const KATA_CONSTRAINTS = {
  MAX_TAGS: 3,
  MAX_ROLES: 3,
  MIN_DURATION: 5,
  MAX_DURATION: 240,
  DEFAULT_PER_PAGE: 20,
  LEADERBOARD_LIMIT: 100,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 1000,
  IMAGE_URL_MAX_LENGTH: 500,
} as const

export const KATA_PROGRESS_STATUS_VALUES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const

export type KataProgressStatusValue =
  (typeof KATA_PROGRESS_STATUS_VALUES)[keyof typeof KATA_PROGRESS_STATUS_VALUES]

export const KATA_FILTER_TYPE = {
  ALL: 'all',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
} as const

export type KataFilterType = (typeof KATA_FILTER_TYPE)[keyof typeof KATA_FILTER_TYPE]

export const KATA_FILTER_INITIAL_STATE: {
  search: string
  level: string | null
  roles: string[]
  tags: string[]
  author: string | null
  status: KataStatus | null
  progress_status: KataProgressStatusValue | null
} = {
  search: '',
  level: null,
  roles: [],
  tags: [],
  author: null,
  status: KataStatus.PUBLISHED,
  progress_status: null,
}
