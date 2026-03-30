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

import Button from '@/components/Button'
import StatusBadge from '@/components/StatusBadge'
import { cn } from '@/utils/utils'

import { useWorkflowContext } from './hooks/useWorkflowContext'

const IssuesPanel = () => {
  const { goToField, issues, isIssueResolved } = useWorkflowContext()

  return (
    <div className="flex flex-col gap-4 pb-4">
      <ul className="flex flex-col gap-2">
        {issues?.map((issue) => {
          const isResolved = isIssueResolved(issue)

          return (
            <li
              key={issue.id}
              className={cn(
                'flex flex-col gap-2 rounded-xl border p-3',
                isResolved ? 'border-border-quaternary opacity-85' : 'border-border-error/50'
              )}
            >
              <div className="flex items-center gap-2">
                {isResolved ? (
                  <StatusBadge status="not_started" text="Resolved" />
                ) : (
                  <StatusBadge status="error" text="Error" />
                )}
                <h4 className={cn('text-sm font-semibold')}>{issue.message}</h4>
              </div>
              {issue.details && <p className="text-xs text-text-quaternary">{issue.details}</p>}
              <div className="mt-1 flex gap-2">
                <Button type="secondary" className="text-xs" onClick={() => goToField(issue)}>
                  Go to Issue
                </Button>
                {/* <Button type="secondary" className="text-xs">
                  Fix Now
                </Button> */}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default IssuesPanel
