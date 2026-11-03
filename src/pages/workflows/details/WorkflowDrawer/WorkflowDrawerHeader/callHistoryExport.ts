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

import { Thought, WorkflowExecutionState } from '@/types/entity'
import { tryParseJsonObjectOrArray } from '@/utils/jsonHelpers'

export interface CallHistoryCall {
  index: number
  id: string
  author_name?: string
  tool_name?: string
  author_type?: string
  input_text?: string
  message: string
  error?: boolean | string
  children?: Thought[]
  content?: Record<string, unknown> | unknown[] | string
  date?: string
}

export interface CallHistoryExport {
  execution_id: string
  state_id: string
  node: string
  status: string
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
  calls: CallHistoryCall[]
}

const getDurationSeconds = (start: string | null, end: string | null): number | null => {
  if (!start || !end) return null
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Number.isNaN(diff) ? null : diff / 1000
}

export const buildCallHistoryExport = (
  state: WorkflowExecutionState,
  thoughts: Thought[]
): CallHistoryExport | null => {
  if (!thoughts.length) return null

  return {
    execution_id: state.execution_id,
    state_id: state.id,
    node: state.name,
    status: state.status,
    started_at: state.started_at,
    completed_at: state.completed_at,
    duration_seconds: getDurationSeconds(state.started_at, state.completed_at),
    calls: thoughts.map((thought, i) => {
      const rawContent = thought.content ?? ''
      return {
        index: i + 1,
        id: thought.id,
        author_name: thought.author_name,
        tool_name: thought.tool_name,
        author_type: thought.author_type,
        input_text: thought.input_text,
        message: rawContent,
        error: thought.error,
        children: thought.children,
        content: tryParseJsonObjectOrArray(rawContent) ?? rawContent,
        date: thought.date,
      }
    }),
  }
}

export const formatCallHistoryJson = (exp: CallHistoryExport): string =>
  JSON.stringify(exp, null, 2)

export const getCallHistoryFilename = (state: WorkflowExecutionState): string => {
  const slug = (state.name || 'node')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '')
    .toLowerCase()
  return `call-history-${slug || 'node'}-${state.execution_id}`
}
