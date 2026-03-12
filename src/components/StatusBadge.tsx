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

interface StatusBadgeProps {
  status: StatusType
  text?: string
}

const statusStyles: Record<
  StatusType,
  {
    container: string
    dot: string
  }
> = {
  [StatusEnum.NotStarted]: {
    container: 'bg-not-started-tertiary text-not-started-primary border-border-subtle',
    dot: 'bg-not-started-primary',
  },
  [StatusEnum.InProgress]: {
    container: 'bg-in-progress-tertiary text-in-progress-primary border-in-progress-secondary',
    dot: 'bg-in-progress-primary animate-pulse',
  },
  [StatusEnum.Pending]: {
    container: 'bg-interrupted-tertiary text-interrupted-primary border-interrupted-secondary',
    dot: 'bg-interrupted-primary',
  },
  [StatusEnum.Error]: {
    container: 'bg-failed-tertiary text-failed-secondary border-failed-secondary',
    dot: 'bg-failed-secondary',
  },
  [StatusEnum.Warning]: {
    container: 'bg-aborted-tertiary text-aborted-primary border-aborted-secondary',
    dot: 'bg-aborted-primary',
  },
  [StatusEnum.Success]: {
    container: 'bg-success-secondary text-success-primary border-success-primary',
    dot: 'bg-success-primary',
  },
}

const StatusBadge: FC<StatusBadgeProps> = ({ status, text }) => {
  const styles = statusStyles[status]

  return (
    <div
      className={cn(
        'flex flex-row items-center gap-1.5 px-2 rounded-full',
        'uppercase font-bold font-geist-mono text-[10px] w-fit select-none',
        'whitespace-nowrap h-[17px] leading-[17px] border',
        styles.container
      )}
    >
      <span className={cn('rounded-full w-[7px] h-[7px] inline-block', styles.dot)} />
      {text}
    </div>
  )
}

export default StatusBadge
