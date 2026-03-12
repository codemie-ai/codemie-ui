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

import { FC, ReactNode, useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import ChevronUpSvg from '@/assets/icons/chevron-up.svg?react'
import { cn } from '@/utils/utils'

type ThoughtDocumentProps = {
  title?: string
  content?: string | ReactNode
}

const ThoughtDocument: FC<ThoughtDocumentProps> = ({ title = '', content = '' }) => {
  const [collapsed, setCollapsed] = useState(true)

  const toggleCollapse = () => setCollapsed((prev) => !prev)

  return (
    <div
      className={cn(
        'text-sm leading-6 font-geist',
        'overflow-x-auto [word-break:break-word] mt-2',
        'rounded-lg border border-border-specific-panel-outline bg-surface-base-chat shadow-sm transition hover:border-border-specific-interactive-outline',
        !collapsed && 'border-border-specific-interactive-outline'
      )}
    >
      <button
        type="button"
        className="font-geist p-3 w-full text-sm leading-6 text-text-quaternary hover:text-text-primary transition text-left gap-2 cursor-pointer flex items-center justify-between"
        onClick={(e) => {
          e.stopPropagation()
          toggleCollapse()
        }}
      >
        {title}
        {collapsed ? (
          <ChevronDownSvg className="basis-4 grow-0 shrink-0" />
        ) : (
          <ChevronUpSvg className="basis-4 grow-0 shrink-0" />
        )}
      </button>
      {!collapsed && <div className="p-3 pt-0">{content}</div>}
    </div>
  )
}

export default ThoughtDocument
