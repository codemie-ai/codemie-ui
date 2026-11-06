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

import type { HistoryItemBackend, Thought } from '@/types/entity/conversation'

// Trimmed backend fixtures for EPMCDME-16463 tool-call resume (only fields the UI reads).
// Sources are under codemie/local/EPMCDME-16463-live/evidence/ in the backend repo.

const step = (fields: Partial<Thought> & { id: string }): any => ({
  parent_id: null,
  message: '',
  interrupted: false,
  in_progress: false,
  children: [],
  ...fields,
})

// Source: b317c7-s1-nested-allow/04-chat.json (stream chunks of POST /model)
export const s1DelegationId = '0be5bafd-0cf3-53f0-94ef-30b1f32ee3ea'
export const s1WaitingId = '9f186b07-6789-541e-9ec0-08d8e9715a97'
export const s1Chunks = [
  {
    last: false,
    thought: step({ id: s1DelegationId, author_name: 'S-Ask-B317C7', in_progress: true }),
  },
  {
    last: false,
    thought: step({
      id: s1WaitingId,
      parent_id: s1DelegationId,
      author_name: 'Generic Jira Tool',
      in_progress: true,
    }),
  },
  {
    last: true,
    thought: step({
      id: s1WaitingId,
      parent_id: s1DelegationId,
      author_name: 'Generic Jira Tool',
      message: 'Tool call is waiting for user approval.',
      interrupted: true,
    }),
  },
]

// Source: b317c7-s5-parallel-siblings/07-get-conversation-paused.json (history[1].thoughts)
export const s5S1ContainerId = 'e7fee3a4-4c6d-555a-b5cc-954317dc2f18'
export const s5FirstPendingId = 'e7207853-919d-53ef-9598-902beed8c207'
export const s5S2ContainerId = '22427873-a68a-5d47-83bf-d88b4f3b2611'
export const s5SecondStepId = '7b0233cd-8efa-5a31-8cef-42f6e8aec1c4'
export const s5PausedConversation = {
  thoughts: [
    step({ id: 'd862cdce-7de3-4b37-99ff-699fd86375a7', author_name: 'Codemie Thoughts' }),
    step({
      id: s5S1ContainerId,
      author_name: 'S1-Ask-B317C7',
      children: [
        step({
          id: s5FirstPendingId,
          parent_id: s5S1ContainerId,
          author_name: 'Generic Jira Tool',
          message: 'Tool call is waiting for user approval.',
          interrupted: true,
        }),
      ],
    }),
    step({
      id: s5S2ContainerId,
      author_name: 'S2-Ask-B317C7',
      children: [
        step({ id: s5SecondStepId, parent_id: s5S2ContainerId, author_name: 'Generic Jira Tool' }),
      ],
    }),
  ],
}

// Storage-rework batch pause (EPMCDME-16463 handoff): both S5 steps wait at once, decided together.
export const s5BatchPausedConversation = {
  thoughts: [
    step({ id: 'd862cdce-7de3-4b37-99ff-699fd86375a7', author_name: 'Codemie Thoughts' }),
    step({
      id: s5S1ContainerId,
      author_name: 'S1-Ask-B317C7',
      children: [
        step({
          id: s5FirstPendingId,
          parent_id: s5S1ContainerId,
          author_name: 'Generic Jira Tool',
          message: 'Tool call is waiting for user approval.',
          interrupted: true,
        }),
      ],
    }),
    step({
      id: s5S2ContainerId,
      author_name: 'S2-Ask-B317C7',
      children: [
        step({
          id: s5SecondStepId,
          parent_id: s5S2ContainerId,
          author_name: 'Generic Jira Tool',
          message: 'Tool call is waiting for user approval.',
          interrupted: true,
        }),
      ],
    }),
  ],
}

// Stream of the batch resume after Allow on the first step: the allowed step runs, then its
// output, then the terminal chunk.
export const s5ResumeChunks = [
  {
    last: false,
    thought: step({
      id: s5FirstPendingId,
      parent_id: s5S1ContainerId,
      author_name: 'Generic Jira Tool',
      in_progress: true,
    }),
  },
  {
    last: false,
    thought: step({
      id: s5FirstPendingId,
      parent_id: s5S1ContainerId,
      author_name: 'Generic Jira Tool',
      message: 'Issue EPMCDME-1 created.',
      in_progress: false,
    }),
  },
  { last: true },
]

// Refetched after a 404: the backend marked every waiting step Cancelled (tool_step_states.py).
export const TOOL_CALL_CANCELLED_MESSAGE = 'Tool call was cancelled without a decision.'
export const cancelledPausedConversation = {
  thoughts: [
    step({
      id: s5S1ContainerId,
      author_name: 'S1-Ask-B317C7',
      children: [
        step({
          id: s5FirstPendingId,
          parent_id: s5S1ContainerId,
          author_name: 'Generic Jira Tool',
          message: TOOL_CALL_CANCELLED_MESSAGE,
          aborted: true,
          interrupted: false,
        }),
      ],
    }),
    step({
      id: s5S2ContainerId,
      author_name: 'S2-Ask-B317C7',
      children: [
        step({
          id: s5SecondStepId,
          parent_id: s5S2ContainerId,
          author_name: 'Generic Jira Tool',
          message: TOOL_CALL_CANCELLED_MESSAGE,
          aborted: true,
          interrupted: false,
        }),
      ],
    }),
  ],
}

// A call needing confirmation in a run that cannot pause (tool_step_states.py `unavailable`).
export const TOOL_CALL_UNAVAILABLE_MESSAGE =
  'Tool call needs user confirmation, which is not available in this channel. The tool was not run.'
export const unavailableStepId = '5d1c0b2a-7e3f-5a4b-9c8d-1e2f3a4b5c6d'
export const unavailableStep = step({
  id: unavailableStepId,
  author_name: 'Generic Jira Tool',
  message: TOOL_CALL_UNAVAILABLE_MESSAGE,
  aborted: true,
  interrupted: false,
})

// GET /v1/conversations/{id}: a paused answer is saved with in_progress=false (AC15).
export const pausedHistoryItemBackend: HistoryItemBackend = {
  historyIndex: 1,
  message: '',
  date: '2026-01-01T00:00:00.000Z',
  assistantId: 'assistant-1',
  executionId: null,
  in_progress: false,
  thoughts: s5BatchPausedConversation.thoughts,
}

// Source: codemie/src/codemie/rest_api/handlers/tool_call_resume.py:62-68 (status and message).
export const RESUME_ERRORS = {
  NO_PENDING: { status: 404, message: 'No pending tool call found for this conversation.' },
  DECISIONS_MISMATCH: {
    status: 409,
    message:
      'The decisions do not match the tool calls waiting for a decision. Please reload the conversation.',
  },
  OTHER_ROOT_ASSISTANT: {
    status: 409,
    message: 'This tool call is waiting for another assistant of the conversation.',
  },
  UNSUPPORTED: {
    status: 422,
    message: 'Tool call confirmation is not supported for this assistant.',
  },
  NOT_STREAMED: {
    status: 422,
    message: 'A tool call resume is always streamed; stream=false is not supported.',
  },
} as const

// Source: 242575-s6-depth2/08-get-conversation-paused.json (O2 -> S -> waiting step)
export const s6O2Id = '1952dd8c-d5f2-5e18-8dbf-d5f17b0497f6'
export const s6SId = '91a9f5bd-df2e-5f7d-86b6-98d15156fd7c'
export const s6WaitingId = '0be2f14b-e91f-5470-8563-bd99f77f1e5a'
export const s6PausedConversation = {
  thoughts: [
    step({
      id: s6O2Id,
      author_name: 'O2-Mid-242575',
      children: [
        step({
          id: s6SId,
          parent_id: s6O2Id,
          author_name: 'Sask242575',
          children: [
            step({
              id: s6WaitingId,
              parent_id: s6SId,
              author_name: 'Generic Jira Tool',
              message: 'Tool call is waiting for user approval.',
              interrupted: true,
            }),
          ],
        }),
      ],
    }),
  ],
}
