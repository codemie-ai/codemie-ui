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

import { FC, ComponentType } from 'react'

import BugIcon from '@/assets/icons/bug.svg?react'
import LightningIcon from '@/assets/icons/lightning.svg?react'

export interface Issue {
  key: string
  title: string
  link: string
  type: string
}

interface IssueListProps {
  type: 'BUG' | 'STORY'
  issues: Issue[]
}

const typeIcons: Record<string, ComponentType<React.SVGProps<SVGSVGElement>>> = {
  BUG: BugIcon,
  STORY: LightningIcon,
}

const IssueList: FC<IssueListProps> = ({ type, issues }) => {
  if (!issues.length) {
    return null
  }

  const Icon = typeIcons[type]

  return (
    <div className="w-full bg-surface-base-chat border border-border-structural rounded-lg px-4 py-4 flex flex-row items-start gap-4">
      <div className="w-8 h-8 rounded-full border flex items-center justify-center border-border-specific-icon-outline bg-surface-interactive-active">
        <Icon aria-label={type} />
      </div>
      <div className="flex flex-col w-full">
        {issues.map((issue, idx) => (
          <div key={issue.key} className={idx !== 0 ? 'mt-2' : ''}>
            <a
              href={issue.link}
              target="_blank"
              rel="noreferrer"
              className="font-mono font-semibold text-base leading-6 text-primary hover:underline"
            >
              {issue.key}
            </a>
            <div className="font-mono text-xs leading-6 text-text-quaternary">{issue.title}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default IssueList
