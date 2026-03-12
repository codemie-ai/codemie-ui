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

import DiagramSvg from '@/assets/icons/diagram.svg?react'
import NotSharedSvg from '@/assets/icons/shared-no.svg?react'
import SharedSvg from '@/assets/icons/shared-yes.svg?react'
import { Assistant } from '@/types/entity/assistant'

interface StatusLabelProps {
  assistant: Assistant
  isShared?: boolean
  isOwned?: boolean
}

const STATUS_TEXT = {
  GLOBAL: 'total uses',
  SHARED: 'Shared with Project',
  OWNED: 'Visible only for me',
  NOT_SHARED: 'Not shared',
  UNKNOWN: 'Unknown',
}

enum StatusType {
  GLOBAL = 'global',
  SHARED = 'shared',
  OWNED = 'owned',
  NOT_SHARED = 'not_shared',
}

const StatusLabel: React.FC<StatusLabelProps> = ({ assistant, isShared, isOwned }) => {
  const getStatusType = (): StatusType => {
    if (assistant.is_global) return StatusType.GLOBAL
    if (isShared) return StatusType.SHARED
    if (isOwned) return StatusType.OWNED

    return StatusType.NOT_SHARED
  }

  const statusType = getStatusType()

  const getStatusText = (type: StatusType): string => {
    switch (type) {
      case StatusType.GLOBAL:
        return `${assistant.unique_users_count ?? 0} ${STATUS_TEXT.GLOBAL}`
      case StatusType.SHARED:
        return STATUS_TEXT.SHARED
      case StatusType.OWNED:
      case StatusType.NOT_SHARED:
        return STATUS_TEXT.NOT_SHARED
      default:
        return STATUS_TEXT.UNKNOWN
    }
  }

  const getStatusIcon = () => {
    if (statusType === StatusType.GLOBAL) {
      return <DiagramSvg />
    }

    if (statusType === StatusType.SHARED) {
      return <SharedSvg />
    }
    return <NotSharedSvg />
  }

  return (
    <div
      role="status"
      aria-label={getStatusText(statusType)}
      className="flex flex-row items-center text-xs gap-3 whitespace-nowrap"
    >
      {getStatusIcon()}
      {getStatusText(statusType)}
    </div>
  )
}

export default React.memo(StatusLabel)
