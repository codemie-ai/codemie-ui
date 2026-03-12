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

import InfoSvg from '@/assets/icons/info.svg?react'
import { InfoWarningType } from '@/constants'
import { cn } from '@/utils/utils'

interface InfoWarningProps {
  type?: InfoWarningType
  header?: string
  message: string
  className?: string
}

const InfoWarning = ({
  type = InfoWarningType.WARNING,
  header,
  message,
  className,
}: InfoWarningProps) => {
  const typeStyles = {
    'bg-aborted-primary/20 border-aborted-primary': type === InfoWarningType.WARNING,
    'bg-in-progress-tertiary border-in-progress-secondary': type === InfoWarningType.INFO,
    'bg-failed-secondary/20 border-failed-secondary': type === InfoWarningType.ERROR,
  }

  return (
    <div className={cn('flex p-2 rounded-md border text-xs', typeStyles, className)}>
      <div className="flex items-center">
        <InfoSvg className="min-w-[18px] min-h-[18px] mr-2" />
        <div className="flex-row whitespace-pre-line">
          {header && <div className="pb-2 mt-0.5">{header}</div>}
          {message && <div>{message}</div>}
        </div>
      </div>
    </div>
  )
}

export default InfoWarning
