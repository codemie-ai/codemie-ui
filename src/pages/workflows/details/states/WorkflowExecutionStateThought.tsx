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

import { forwardRef, useMemo } from 'react'

import Thought, { ThoughtRef } from '@/components/Thought/Thought'
import { WORKFLOW_OUTPUT_FORMATS } from '@/constants/workflows'
import { Thought as ThoughtType } from '@/types/entity/conversation'

interface WorkflowExecutionStateThoughtProps {
  thought: ThoughtType
  defaultExpanded?: boolean
}

const transformThought = (
  thought: ThoughtType,
  outputFormat: string | null = null
): ThoughtType => {
  const outputArgs = outputFormat ? { output_format: outputFormat } : {}

  return {
    ...thought,
    message: thought.content ?? '',
    children: thought.children?.map((child) => transformThought(child, outputFormat)) || [],
    ...outputArgs,
  }
}

const WorkflowExecutionStateThought = forwardRef<ThoughtRef, WorkflowExecutionStateThoughtProps>(
  ({ thought, defaultExpanded }, ref) => {
    const thoughtWithMessage = useMemo(() => {
      if (!thought) return null
      return transformThought(thought, WORKFLOW_OUTPUT_FORMATS.MARKDOWN)
    }, [thought?.id])

    if (!thoughtWithMessage) return null

    return <Thought ref={ref} thought={thoughtWithMessage} defaultExpanded={defaultExpanded} />
  }
)

WorkflowExecutionStateThought.displayName = 'WorkflowExecutionStateThought'

export default WorkflowExecutionStateThought
