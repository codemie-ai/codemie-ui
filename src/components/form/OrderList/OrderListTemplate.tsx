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

import { ReactNode } from 'react'

import HamburgerSvg from '@/assets/icons/hamburger.svg?react'
import { cn } from '@/utils/utils'

interface OrderListTemplateProps {
  name?: string
  description?: string
  children?: ReactNode
  actions?: ReactNode
  className?: string
}

const OrderListTemplate = ({
  name,
  description,
  children,
  actions,
  className,
}: OrderListTemplateProps) => {
  return (
    <div
      className={cn(
        'group/item border rounded-lg transition duration-75 bg-surface-base-primary border-border-primary pl-3 pr-1 py-1 text-sm flex items-center hover:border-border-secondary cursor-grab',
        className
      )}
    >
      <HamburgerSvg className="opacity-75 group-hover/item:opacity-100 transition duration-75 shrink-0" />

      <div className="flex grow gap-2 ml-4 mr-1 min-w-0">
        {name && (
          <p className="truncate shrink max-w-full group-hover/item:text-text-primary text-text-tertiary transition duration-75">
            {name}
          </p>
        )}
        {description && (
          <p className="flex-1 min-w-32 truncate text-xs text-text-quaternary mt-0.5">
            {description}
          </p>
        )}
        {children}
      </div>

      <div className="flex items-center ml-auto">{actions}</div>
    </div>
  )
}

export default OrderListTemplate
