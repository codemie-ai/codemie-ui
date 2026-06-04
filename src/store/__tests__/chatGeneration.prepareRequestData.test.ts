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

import { describe, it, expect, vi } from 'vitest'

import { chatGenerationStore } from '../chatGeneration'

vi.mock('valtio', () => ({
  proxy: vi.fn((obj) => obj),
  ref: vi.fn((v) => v),
}))
vi.mock('@/utils/api', () => ({
  default: { stream: vi.fn(), put: vi.fn(), get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ABORT_ERROR: 'AbortError',
  DEFAULT_ERROR_MESSAGE: 'Error',
}))
vi.mock('@/store/assistants', () => ({
  assistantsStore: { getAssistant: vi.fn(), updateRecentAssistants: vi.fn() },
}))
vi.mock('@/store/chats', () => ({ chatsStore: { currentChat: null } }))
vi.mock('@/store/user', () => ({ userStore: { user: null } }))
vi.mock('@/store/workflowExecutions', () => ({ workflowExecutionsStore: {} }))
vi.mock('@/utils/storage', () => ({ default: { put: vi.fn(), get: vi.fn() } }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))
vi.mock('@/utils/stream', () => ({ default: vi.fn(), streamChunkToObject: vi.fn() }))
vi.mock('@/utils/chatHelpers', () => ({ transformChatHistoryFEtoBE: vi.fn(() => []) }))
vi.mock('@/utils/helpers', () => ({ fileToBase64: vi.fn() }))
vi.mock('@/utils/mcpAuth', () => ({ parseMCPAuthRequiredErrorPayload: vi.fn() }))
vi.mock('@/constants', () => ({ ROLE_USER: 'User' }))

const workflowChat = { id: 'chat-1', isWorkflow: true, history: [] } as any

describe('chatGenerationStore._prepareRequestData resume branch', () => {
  it('includes file_names when resumeExecutionFileNames is set', () => {
    const data = {
      resumeExecution: true,
      workflowId: 'wf-1',
      executionId: 'exec-1',
      resumeExecutionInput: 'hello',
      resumeExecutionFileNames: ['encoded-url-1', 'encoded-url-2'],
    } as any

    const result = chatGenerationStore._prepareRequestData(workflowChat, 'wf-1', data)

    expect(result.requestData).toEqual({
      user_input: 'hello',
      file_names: ['encoded-url-1', 'encoded-url-2'],
    })
  })

  it('omits file_names when resumeExecutionFileNames is empty', () => {
    const data = {
      resumeExecution: true,
      workflowId: 'wf-1',
      executionId: 'exec-1',
      resumeExecutionInput: 'hello',
      resumeExecutionFileNames: [],
    } as any

    const result = chatGenerationStore._prepareRequestData(workflowChat, 'wf-1', data)

    expect(result.requestData).toEqual({ user_input: 'hello' })
    expect(result.requestData).not.toHaveProperty('file_names')
  })

  it('sends undefined body when neither input nor files provided', () => {
    const data = {
      resumeExecution: true,
      workflowId: 'wf-1',
      executionId: 'exec-1',
    } as any

    const result = chatGenerationStore._prepareRequestData(workflowChat, 'wf-1', data)

    expect(result.requestData).toBeUndefined()
  })

  it('sends only file_names body when no user input but files provided', () => {
    const data = {
      resumeExecution: true,
      workflowId: 'wf-1',
      executionId: 'exec-1',
      resumeExecutionFileNames: ['encoded-url-1'],
    } as any

    const result = chatGenerationStore._prepareRequestData(workflowChat, 'wf-1', data)

    expect(result.requestData).toEqual({ file_names: ['encoded-url-1'] })
  })
})
