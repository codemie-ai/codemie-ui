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

import React from 'react'

import { cn } from '@/utils/utils'

export const StatusEnum = {
  NotStarted: 'not_started',
  InProgress: 'in_progress',
  Pending: 'pending',
  Error: 'error',
  Warning: 'warning',
  Success: 'success',
} as const

export type StatusType = (typeof StatusEnum)[keyof typeof StatusEnum]

interface StatusBadgeProps {
  status: StatusType
  text?: string
  className?: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, className }) => {
  const badgeClasses = cn(
    'flex flex-row items-center gap-1.5 border-1',
    'px-2 rounded-full border-0.5 uppercase font-bold text-xs-1 w-fit',
    'min-w-fit select-none whitespace-nowrap h-[17px] leading-[17px]',
    {
      'bg-not-started-tertiary text-not-started-primary border border-border-subtle':
        status === StatusEnum.NotStarted,
      'bg-in-progress-tertiary text-in-progress-primary border border-in-progress-secondary':
        status === StatusEnum.InProgress,
      'bg-interrupted-tertiary text-interrupted-primary border border-interrupted-secondary':
        status === StatusEnum.Pending,
      'bg-failed-tertiary text-failed-secondary border border-failed-secondary': status === StatusEnum.Error,
      'bg-aborted-tertiary text-aborted-primary border border-aborted-secondary':
        status === StatusEnum.Warning,
      'bg-success-secondary text-success-primary border border-success-primary':
        status === StatusEnum.Success,
    },
    className
  )

  const dotClasses = cn('rounded-full w-[7px] h-[7px] inline-block', {
    'bg-not-started-primary': status === StatusEnum.NotStarted,
    'bg-in-progress-primary animate-pulse': status === StatusEnum.InProgress,
    'bg-interrupted-primary': status === StatusEnum.Pending,
    'bg-failed-secondary': status === StatusEnum.Error,
    'bg-aborted-primary': status === StatusEnum.Warning,
    'bg-success-primary': status === StatusEnum.Success,
  })

  return (
    <div className={badgeClasses}>
      <div className={dotClasses}></div>
      {text}
    </div>
  )
}

export default StatusBadge
