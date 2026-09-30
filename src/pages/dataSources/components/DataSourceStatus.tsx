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

import { FC } from 'react'

import InfoSvg from '@/assets/icons/info.svg?react'
import ProgressBar from '@/components/ProgressBar/ProgressBar'
import { getDataSourceStatusInfo } from '@/pages/dataSources/utils/dataSourceStatus'
import { DatasetResponse } from '@/types/entity/dataSource'
import { cn } from '@/utils/utils'

interface Props {
  item: DatasetResponse['data'][number]
}

const DataSourceStatus: FC<Props> = ({ item }) => {
  const { title, classes, dotColor, isProviderInProgress, isTag, isInProgress } =
    getDataSourceStatusInfo(item)

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

      {isInProgress && !isProviderInProgress && (
        <ProgressBar value={item.current_state} max={item.complete_state} />
      )}
    </div>
  )
}

export default DataSourceStatus
