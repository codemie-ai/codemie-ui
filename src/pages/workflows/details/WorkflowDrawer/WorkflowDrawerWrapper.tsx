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

import { ReactNode, useCallback, useState } from 'react'

import ChevronUpSvg from '@/assets/icons/chevron-up.svg?react'
import Button from '@/components/Button'
import { cn } from '@/utils/utils'

interface DrawerProps {
  expanded?: boolean
  onExpandedChange?: (isExpanded: boolean) => void
  header: ReactNode
  children: ReactNode
}

const Drawer = ({
  expanded: expandedProps,
  onExpandedChange: onExpandedPropsChange,
  header,
  children,
}: DrawerProps) => {
  const [expandedLocal, setIsExpandedLocal] = useState(true)

  const expanded = expandedProps ?? expandedLocal
  const onExpandedChange = useCallback(
    (isExpanded: boolean) => {
      if (onExpandedPropsChange) onExpandedPropsChange(isExpanded)
      else setIsExpandedLocal(isExpanded)
    },
    [onExpandedPropsChange]
  )

  return (
    <div
      className={cn(
        'h-full grow flex flex-col bg-surface-base-sidebar overflow-hidden ',
        expanded ? '' : 'max-h-[50px]'
      )}
    >
      <div
        className={cn(
          'justify-end gap-2 pl-4 flex items-center border-t border-border-primary flex-shrink-0 cursor-pointer',
          expanded && 'border-b'
        )}
        onClick={() => onExpandedChange(!expanded)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center pr-4 h-[50px] gap-2 cursor-default grow"
        >
          {header}
          <Button
            variant="tertiary"
            onClick={() => {
              onExpandedChange(!expanded)
            }}
          >
            <ChevronUpSvg className={cn('size-4 mx-auto', expanded && 'rotate-180')} />
          </Button>
        </div>
      </div>

      <div
        className={cn('h-full flex overflow-hidden min-h-0 pr-4 pl-6', !expanded && 'opacity-0')}
      >
        {children}
      </div>
    </div>
  )
}

export default Drawer
