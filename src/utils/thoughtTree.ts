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

import type { ToolCallAction } from '@/types/chatGeneration'
import type { ChatMessage, Thought } from '@/types/entity/conversation'

export function findPath(thoughts: Thought[] | undefined, id: string | undefined): Thought[] {
  if (!thoughts || !id) return []
  for (const thought of thoughts) {
    if (thought.id === id) return [thought]
    const sub = findPath(thought.children, id)
    if (sub.length) return [thought, ...sub]
  }
  return []
}

export function findThought(thoughts: Thought[] | undefined, id: string): Thought | null {
  const path = findPath(thoughts, id)
  return path.length ? path[path.length - 1] : null
}

// The waiting steps of a pause (spec rule 1): every interrupted step at any depth, depth-first.
// The single source for the buttons, the scroll order, the batch body and the on-send update.
export function collectWaitingSteps(thoughts?: Thought[], out: Thought[] = []): Thought[] {
  thoughts?.forEach((thought) => {
    if (thought.interrupted === true) out.push(thought)
    collectWaitingSteps(thought.children, out)
  })
  return out
}

// The next waiting step after `afterId` without a local choice, wrapping to the top (spec rule 3).
export function nextUndecidedStep(
  waiting: Thought[],
  choices: Record<string, ToolCallAction>,
  afterId: string
): Thought | null {
  const start = waiting.findIndex((step) => step.id === afterId)
  const rotated = [...waiting.slice(start + 1), ...waiting.slice(0, start + 1)]
  return rotated.find((step) => step.id !== afterId && !(step.id in choices)) ?? null
}

// Allow/Deny are inactive only while this tab reads a live stream of the answer (spec rule 4).
export const canDecide = (message: ChatMessage) => !message.stream && !message.inProgress
