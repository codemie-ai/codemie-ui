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

import { cn } from '@/utils/utils'

interface ExpandedYamlFrameProps {
  title?: string
  actions?: ReactNode
  invalid?: boolean
  children: ReactNode
}

const ExpandedYamlFrame = ({ title, actions, invalid, children }: ExpandedYamlFrameProps) => {
  const hasHeader = Boolean(title || actions)

  return (
    <div className="expanded-yaml-frame flex min-h-0 flex-1 flex-col">
      {hasHeader && (
        <div
          className={cn(
            'code-block-header flex justify-between items-center gap-x-4 gap-y-2 flex-wrap py-2 !pl-4 !pr-2 !m-0 bg-surface-base-tertiary shadow-block border border-border-specific-panel-outline rounded-t-lg',
            invalid && '!border-failed-secondary'
          )}
        >
          <p className="text-sm">{title}</p>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
      )}

      <div
        className={cn(
          'flex-1 min-h-0 overflow-hidden p-4 rounded-b-lg border !bg-surface-base-secondary',
          hasHeader ? '!border-t-0' : 'rounded-t-lg',
          invalid ? '!border-failed-secondary' : '!border-border-specific-panel-outline'
        )}
      >
        {children}
      </div>
    </div>
  )
}

export default ExpandedYamlFrame
