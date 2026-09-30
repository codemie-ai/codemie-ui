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

import { INDEX_TYPES } from '@/constants/dataSources'
import { DataSource } from '@/types/entity/dataSource'

export type DataSourceStatusTitle = 'Queued' | 'Fetching' | 'Processing' | 'Completed' | 'Error'

export interface DataSourceStatusInfo {
  title: DataSourceStatusTitle
  classes: string
  dotColor: string
  isProviderInProgress: boolean
  isTag: boolean
  isInProgress: boolean
}

export function getDataSourceStatusInfo(item: DataSource): DataSourceStatusInfo {
  const statusInfo = {
    isQueued: item.is_queued && !item.completed && !item.error,
    isFetching: item.is_fetching && !item.error,
    isInProgress: !item.completed && !item.error && !item.is_fetching && !item.is_queued,
    isError: item.error,
    isCompleted: item.completed,
  }

  const isProviderInProgress = statusInfo.isInProgress && item.index_type === INDEX_TYPES.PROVIDER
  const isTag =
    statusInfo.isQueued ||
    statusInfo.isFetching ||
    statusInfo.isCompleted ||
    statusInfo.isError ||
    isProviderInProgress

  let title: DataSourceStatusTitle
  let classes: string
  let dotColor: string

  if (statusInfo.isQueued) {
    title = 'Queued'
    classes = 'bg-not-started-tertiary border-not-started-secondary text-not-started-primary'
    dotColor = 'bg-not-started-primary'
  } else if (statusInfo.isFetching) {
    title = 'Fetching'
    classes = 'bg-aborted-tertiary border-aborted-secondary text-aborted-primary'
    dotColor = 'bg-aborted-primary animate-pulse'
  } else if (statusInfo.isInProgress) {
    title = 'Processing'
    classes = 'bg-aborted-tertiary border-aborted-secondary text-aborted-primary'
    dotColor = 'bg-aborted-primary animate-pulse'
  } else if (statusInfo.isCompleted) {
    title = 'Completed'
    classes = 'bg-success-secondary border-success-primary text-success-primary'
    dotColor = 'bg-success-primary'
  } else {
    title = 'Error'
    classes = 'bg-failed-tertiary border-failed-secondary text-failed-secondary'
    dotColor = 'bg-failed-secondary'
  }

  return {
    title,
    classes,
    dotColor,
    isProviderInProgress,
    isTag,
    isInProgress: statusInfo.isInProgress,
  }
}
