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

import { FC, ReactNode } from 'react'

import { cn } from '@/utils/utils'

interface NameLinkCellProps {
  disabled?: boolean
  children: ReactNode
  onClick: () => void
  tooltip?: string
}

const NameLinkCell: FC<NameLinkCellProps> = ({ children, disabled, onClick, tooltip }) => {
  return (
    <button
      type="button"
      className={cn(
        'text-left font-bold hover:underline break-all cursor-pointer',
        disabled && 'hover:no-underline cursor-default opacity-75 font-medium'
      )}
      onClick={onClick}
      disabled={disabled}
      data-tooltip-id={tooltip ? 'react-tooltip' : undefined}
      data-tooltip-content={tooltip}
    >
      {children}
    </button>
  )
}

export default NameLinkCell
