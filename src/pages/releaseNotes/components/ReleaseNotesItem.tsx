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

import { FC } from 'react'

import { Item } from '../types'
import { IssueLink } from './IssueLink'

interface ReleaseNotesItemProps {
  item: Item
  isHighlight?: boolean
}

export const ReleaseNotesItem: FC<ReleaseNotesItemProps> = ({ item, isHighlight }) => {
  return (
    <article
      className={
        isHighlight
          ? 'w-full h-full bg-surface-specific-card border border-border-structural rounded-xl px-4 py-4 flex flex-col gap-2'
          : 'w-full py-4 border-b border-border-structural flex flex-col gap-1 last:border-b-0'
      }
    >
      <div className="font-geist-mono font-semibold text-base leading-6 text-text-primary">
        {item.title}
      </div>
      {item.description && (
        <div className="font-geist-mono text-sm leading-5 text-text-quaternary">
          {item.description}
        </div>
      )}
      {(item.issues?.length ?? 0) > 0 && (
        <div className={`${isHighlight ? 'mt-auto' : ''} flex flex-wrap gap-x-4 gap-y-1`}>
          {item.issues.map((issue) => (
            <IssueLink key={issue.key} issue={issue} />
          ))}
        </div>
      )}
    </article>
  )
}
