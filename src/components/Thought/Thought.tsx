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

import { useState, useImperativeHandle, forwardRef } from 'react'

import TextBlock from '@/components/markdown/TextBlock'
import { Thought as ThoughtType } from '@/types/entity/conversation'
import { cn } from '@/utils/utils'

import ThoughtHeader from './ThoughtHeader'
import ThoughtMessage from './ThoughtMessage'

interface ThoughtProps {
  thought: ThoughtType
  isEmbedded?: boolean
  defaultExpanded?: boolean
}

export interface ThoughtRef {
  expand: () => void
  collapse: () => void
}

const Thought = forwardRef<ThoughtRef, ThoughtProps>(
  ({ thought, isEmbedded, defaultExpanded = false }, ref) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)

    useImperativeHandle(ref, () => ({
      expand: () => setIsExpanded(true),
      collapse: () => setIsExpanded(false),
    }))

    const isInProgress = thought.in_progress

    return (
      <div className="flex flex-col">
        <ThoughtHeader
          thought={thought}
          isExpanded={isExpanded}
          isEmbedded={isEmbedded}
          isInProgress={isInProgress}
          setIsExpanded={setIsExpanded}
        />

        {(isExpanded || isInProgress) && (
          <div
            className={cn(
              'flex flex-col gap-4 p-4 border shadow-sm border-t-border-structural/50 border-border-structural bg-surface-base-primary rounded-b-lg',
              (isExpanded || isInProgress) && 'border-t-0',
              isEmbedded && 'bg-surface-base-secondary'
            )}
          >
            {!!thought.children?.length && (
              <div className="flex flex-col gap-2">
                {thought.children.map((thought) => (
                  <Thought isEmbedded key={thought.id} thought={thought} />
                ))}
              </div>
            )}

            {thought.input_text && (
              <div className="flex flex-col gap-2 text-sm">
                <div className="text-text-quaternary font-medium">Input:</div>
                <div className="bg-surface-base-secondary p-3 rounded-lg border break-words">
                  <TextBlock text={thought.input_text} />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 text-sm">
              <div className="text-text-quaternary font-medium">Result:</div>
              <ThoughtMessage thought={thought} />
            </div>
          </div>
        )}
      </div>
    )
  }
)

export default Thought
