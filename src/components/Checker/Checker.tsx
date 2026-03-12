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

import React, { FC, useMemo } from 'react'

import CheckSvg from '@/assets/icons/check.svg?react'
import ConnectionSvg from '@/assets/icons/connection.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import RingSvg from '@/assets/icons/ring.svg?react'
import { CHECKER_STATUSES } from '@/constants/common'
import { cn } from '@/utils/utils'

import Button from '../Button'

interface CheckerProps {
  label?: string
  status?: string
  onCheck: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  classNames?: string
  testIcon?: 'connection'
}

const Checker: FC<CheckerProps> = ({
  label = 'Test Integration',
  status = CHECKER_STATUSES.UNDEFINED,
  classNames,
  onCheck,
  testIcon = 'connection',
}) => {
  const isUndefined = useMemo(() => status === CHECKER_STATUSES.UNDEFINED, [status])
  const isInProgress = useMemo(() => status === CHECKER_STATUSES.IN_PROGRESS, [status])
  const isFailed = useMemo(() => status === CHECKER_STATUSES.FAILED, [status])
  const isSuccess = useMemo(() => status === CHECKER_STATUSES.SUCCESS, [status])
  const TestIconComponent = ConnectionSvg
  const commonIconClasses = 'w-[18px] h-[18px]'

  const StatusIcon = useMemo(() => {
    if (isUndefined) return <TestIconComponent className={`${commonIconClasses}`} />
    if (isInProgress) return <RingSvg className={commonIconClasses} />
    if (isSuccess) return <CheckSvg className={commonIconClasses} />
    if (isFailed) return <CrossSvg className={commonIconClasses} />
    return null
  }, [status, isUndefined, isInProgress, isSuccess, isFailed, commonIconClasses, testIcon])

  const content = (
    <>
      <span className="w-[18px]">{StatusIcon}</span>
      <span className="text-leff">{label}</span>
    </>
  )

  return (
    <Button
      variant="secondary"
      className={cn(classNames)}
      disabled={isInProgress}
      onClick={onCheck}
    >
      {content}
    </Button>
  )
}

export default Checker
