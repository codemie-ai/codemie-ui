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

import CheckSvg from '@/assets/icons/check.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import Button from '@/components/Button'
import { StatusEnum } from '@/components/StatusIndicator'
import { ThoughtView } from '@/components/Thought/Thought'
import { ThoughtStatus, WAITING_THOUGHT_STATUS } from '@/components/Thought/ThoughtHeader'
import { ButtonSize, ButtonType } from '@/constants'
import { chatGenerationStore } from '@/store/chatGeneration'
import { ToolCallAction } from '@/types/chatGeneration'
import { ChatMessage, Thought } from '@/types/entity/conversation'
import { canDecide, collectWaitingSteps, findPath, nextUndecidedStep } from '@/utils/thoughtTree'

interface ThoughtViewOptions {
  message: ChatMessage
  hideToolOutputs: boolean
  // False on shared pages, in workflow chats and on any message other than the last history
  // item, which is the only one decideToolCall can decide
  canShowDecision: boolean
  // Local Allow/Deny choices per waiting step id, before the batch is sent
  choices: Record<string, ToolCallAction>
}

// Labels for a locally chosen step before the send: a view override, so the workflow drawer and
// getThoughtStatus are unaffected (spec rule 7)
const CHOSEN_THOUGHT_STATUS: Record<ToolCallAction, ThoughtStatus> = {
  [ToolCallAction.ALLOW]: { status: StatusEnum.NotStarted, label: 'Allowed' },
  [ToolCallAction.DENY]: { status: StatusEnum.NotStarted, label: 'Denied' },
}

// An ancestor of a step still running inside the in-progress entry, such as a sent allowed step
// (spec rule 6): its own in_progress was cleared when the pause ended
const RUNNING_ANCESTOR_STATUS: ThoughtStatus = {
  status: StatusEnum.InProgress,
  label: 'In Progress',
}

// Ids of the ancestors of every running step of an in-progress entry
const collectRunningAncestorIds = (
  thoughts: Thought[] | undefined,
  path: string[] = [],
  out = new Set<string>()
): Set<string> => {
  thoughts?.forEach((thought) => {
    if (thought.in_progress) path.forEach((id) => out.add(id))
    collectRunningAncestorIds(thought.children, [...path, thought.id], out)
  })
  return out
}

// Brings the next undecided step into view after a click; a no-op when there is none. The id is
// backend-supplied, so it is compared as an attribute value and never interpolated into a selector
const scrollToThought = (id: string | undefined): void => {
  if (!id) return
  Array.from(document.querySelectorAll<HTMLElement>('[data-thought-id]'))
    .find((element) => element.dataset.thoughtId === id)
    ?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
}

const DecisionButtons = ({
  step,
  disabled,
  onDecide,
}: {
  step: Thought
  disabled: boolean
  onDecide: (step: Thought, action: ToolCallAction) => void
}) => (
  <div className="flex justify-end gap-2">
    <Button
      type={ButtonType.DELETE}
      size={ButtonSize.MEDIUM}
      disabled={disabled}
      onClick={() => onDecide(step, ToolCallAction.DENY)}
    >
      <CrossSvg className="w-4 h-4" />
      Deny
    </Button>
    <Button
      type={ButtonType.PRIMARY}
      size={ButtonSize.MEDIUM}
      disabled={disabled}
      onClick={() => onDecide(step, ToolCallAction.ALLOW)}
    >
      <CheckSvg className="w-4 h-4" />
      Allow
    </Button>
  </div>
)

export const createThoughtView = ({
  message,
  hideToolOutputs,
  canShowDecision,
  choices,
}: ThoughtViewOptions): ((thought: Thought) => ThoughtView) => {
  const { thoughts } = message
  const waiting = collectWaitingSteps(thoughts)

  // Every waiting step keeps its ancestor chain visible and Waiting
  const waitingIds = new Set(waiting.map((step) => step.id))
  const waitingPathIds = new Set<string>()
  const waitingAncestorIds = new Set<string>()
  waiting.forEach((step) => {
    const stepPath = findPath(thoughts, step.id)
    stepPath.forEach((t) => waitingPathIds.add(t.id))
    stepPath.slice(0, -1).forEach((ancestor) => waitingAncestorIds.add(ancestor.id))
  })

  // A sent step's chain stays open and not Success while the step runs; then normal statuses apply
  const runningAncestorIds = message.inProgress ? collectRunningAncestorIds(thoughts) : new Set()

  // The click that leaves no undecided step sends the batch (store); the view scrolls on
  const onDecide = (step: Thought, action: ToolCallAction) => {
    const next = nextUndecidedStep(waiting, choices, step.id)
    chatGenerationStore.decideToolCall(step.id, action).catch(console.error)
    scrollToThought(next?.id)
  }

  return (thought) => {
    const view: ThoughtView = {}
    // Every waiting chain stays open until the batch is sent, so a chosen step keeps showing
    // Allowed or Denied instead of collapsing into its container
    const isOnWaitingPath = waitingPathIds.has(thought.id)

    if (isOnWaitingPath || runningAncestorIds.has(thought.id)) view.forceExpanded = true
    if (hideToolOutputs) view.hidden = !isOnWaitingPath

    const choice = waitingIds.has(thought.id) ? choices[thought.id] : undefined
    if (canShowDecision && waitingIds.has(thought.id)) {
      if (choice) {
        view.status = CHOSEN_THOUGHT_STATUS[choice]
      } else {
        view.footer = (
          <DecisionButtons step={thought} disabled={!canDecide(message)} onDecide={onDecide} />
        )
      }
    }

    // Waiting replaces only Success: a running, failed or aborted step keeps its own status; the
    // collector's result is the only source of "a pause is live" (spec rule 1)
    const hasOwnStatus = thought.in_progress || thought.error || thought.aborted
    if (runningAncestorIds.has(thought.id) && !hasOwnStatus) view.status = RUNNING_ANCESTOR_STATUS

    if (
      waiting.length > 0 &&
      !choice &&
      !hasOwnStatus &&
      (waitingAncestorIds.has(thought.id) || !thought.message)
    ) {
      view.status = WAITING_THOUGHT_STATUS
    }

    return view
  }
}
