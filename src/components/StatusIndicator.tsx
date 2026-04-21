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

import FailedSvg from '@/assets/icons/status-failed.svg?react'
import InProgressSvg from '@/assets/icons/status-in-progress.svg?react'
import NotStartedSvg from '@/assets/icons/status-not-started.svg?react'
import PendingSvg from '@/assets/icons/status-pending.svg?react'
import SuccessSvg from '@/assets/icons/status-success.svg?react'
import WarningSvg from '@/assets/icons/status-warning.svg?react'

import { cn } from '../utils/utils'

export const StatusEnum = {
  NotStarted: 'not_started',
  InProgress: 'in_progress',
  Pending: 'pending',
  Error: 'error',
  Warning: 'warning',
  Success: 'success',
} as const

export type StatusType = (typeof StatusEnum)[keyof typeof StatusEnum]

type StatusIndicatorProps = {
  status: StatusType
  naked?: boolean
  className?: string
}

const STATUS_ICON_MAPPING: Record<StatusType, React.FC<React.SVGProps<SVGSVGElement>>> = {
  [StatusEnum.NotStarted]: NotStartedSvg,
  [StatusEnum.InProgress]: InProgressSvg,
  [StatusEnum.Pending]: PendingSvg,
  [StatusEnum.Error]: FailedSvg,
  [StatusEnum.Warning]: WarningSvg,
  [StatusEnum.Success]: SuccessSvg,
}

const wrapperColorClasses: Record<StatusType, string> = {
  [StatusEnum.NotStarted]: 'bg-not-started-tertiary border-border-subtle',
  [StatusEnum.InProgress]: 'bg-in-progress-tertiary border-in-progress-secondary',
  [StatusEnum.Pending]: 'bg-interrupted-tertiary border-interrupted-secondary',
  [StatusEnum.Error]: 'bg-failed-tertiary border-failed-secondary',
  [StatusEnum.Warning]: 'bg-aborted-tertiary border-aborted-secondary',
  [StatusEnum.Success]: 'bg-success-secondary border-success-primary',
}

const iconColorClasses: Record<StatusType, string> = {
  [StatusEnum.NotStarted]: 'text-not-started-primary',
  [StatusEnum.InProgress]: 'text-in-progress-primary',
  [StatusEnum.Pending]: 'text-interrupted-primary',
  [StatusEnum.Error]: 'text-failed-secondary',
  [StatusEnum.Warning]: 'text-aborted-primary',
  [StatusEnum.Success]: 'text-success-primary',
}

const StatusIndicator: FC<StatusIndicatorProps> = ({ status, naked = false, className }) => {
  const Icon = STATUS_ICON_MAPPING[status]

  if (naked) {
    return (
      <Icon
        className={cn(
          status === StatusEnum.InProgress && 'animate-spin duration-[20000ms]',
          iconColorClasses[status],
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center min-w-[2rem] w-[2rem] h-[2rem]',
        'rounded-lg border-1 border-border-specific-panel-outline',
        wrapperColorClasses[status],
        iconColorClasses[status],
        className
      )}
    >
      <Icon className={status === StatusEnum.InProgress ? 'animate-spin duration-[20000ms]' : ''} />
    </div>
  )
}

export default StatusIndicator
