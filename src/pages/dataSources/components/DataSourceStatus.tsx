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

import { FC, useMemo } from 'react'

import InfoSvg from '@/assets/icons/info.svg?react'
import ProgressBar from '@/components/ProgressBar/ProgressBar'
import { INDEX_TYPES } from '@/constants'
import { DatasetResponse } from '@/types/entity/dataSource'
import { cn } from '@/utils/utils'

interface Props {
  item: DatasetResponse['data'][number]
}

const DataSourceStatus: FC<Props> = ({ item }) => {
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

  const { title, classes, dotColor } = useMemo(() => {
    if (statusInfo.isQueued) {
      return {
        title: 'Queued',
        classes: 'bg-not-started-tertiary border-not-started-secondary text-not-started-primary',
        dotColor: 'bg-not-started-primary',
      }
    }

    if (statusInfo.isFetching) {
      return {
        title: 'Fetching',
        classes: 'bg-aborted-tertiary border-aborted-secondary text-aborted-primary',
        dotColor: 'bg-aborted-primary animate-pulse',
      }
    }

    if (statusInfo.isInProgress) {
      return {
        title: 'Processing',
        classes: 'bg-aborted-tertiary border-aborted-secondary text-aborted-primary',
        dotColor: 'bg-aborted-primary animate-pulse',
      }
    }

    if (statusInfo.isCompleted) {
      return {
        title: 'Completed',
        classes: 'bg-success-secondary border-success-primary text-success-primary',
        dotColor: 'bg-success-primary',
      }
    }

    return {
      title: 'Error',
      classes: 'bg-failed-tertiary border-failed-secondary text-failed-secondary',
      dotColor: 'bg-failed-secondary',
    }
  }, [statusInfo.isQueued, statusInfo.isFetching, statusInfo.isCompleted, statusInfo.isError])

  return (
    <div data-onboarding="datasource-status-badge" className="flex items-center gap-2">
      {isTag && (
        <div
          className={cn(
            'inline-flex flex-row gap-1.5 uppercase text-[10px] border-1 rounded-full  h-[17px] justify-center items-center font-semibold px-2',
            classes
          )}
        >
          <div className={cn('w-[7px] h-[7px] rounded-full', dotColor)} />
          <div className="leading-[13px] text-nowrap">{title}</div>
        </div>
      )}
      {item.error && (
        <span
          data-pr-tooltip={item.text}
          data-pr-position="left"
          className="target-tooltip cursor-pointer"
        >
          <InfoSvg className="text-failed-secondary" />
        </span>
      )}

      {statusInfo.isInProgress && !isProviderInProgress && (
        <ProgressBar value={item.current_state} max={item.complete_state} />
      )}
    </div>
  )
}

export default DataSourceStatus
