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

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH_CALLBACK_HINT_MESSAGE } from '@/hooks/useAuthCallbackListener'
import { ChatMessage, Conversation } from '@/types/entity/conversation'
import { MCPAuthGateServer } from '@/types/entity/mcpAuth'

import { useChatAuthCallbacks } from '../useChatAuthCallbacks'

interface ListenerHandlers {
  onSuccess?: (authConfigId: string) => void
  onError?: (authConfigId: string, errorCode?: string) => void
  onTimeout?: (authConfigId: string) => void
}

const { listenerCalls, listenerHandlers, mockMarkPromptAuthSuccess, mockRollbackPromptAuthRow } =
  vi.hoisted(() => ({
    listenerCalls: [] as Array<{
      trackedAuthConfigIds: string[]
      liveAuthConfigIds?: string[]
      contextKey?: string
    }>,
    listenerHandlers: {} as {
      onSuccess?: (authConfigId: string) => void
      onError?: (authConfigId: string, errorCode?: string) => void
      onTimeout?: (authConfigId: string) => void
    },
    mockMarkPromptAuthSuccess: vi.fn(),
    mockRollbackPromptAuthRow: vi.fn(),
  }))

vi.mock('@/hooks/useAuthCallbackListener', () => ({
  AUTH_CALLBACK_HINT_MESSAGE:
    'Sign-in is taking longer than usual. It can still complete — or click to try again.',
  useAuthCallbackListener: (
    args: {
      trackedAuthConfigIds: string[]
      liveAuthConfigIds?: string[]
      contextKey?: string
    } & ListenerHandlers
  ) => {
    listenerCalls.push({
      trackedAuthConfigIds: args.trackedAuthConfigIds,
      liveAuthConfigIds: args.liveAuthConfigIds,
      contextKey: args.contextKey,
    })
    listenerHandlers.onSuccess = args.onSuccess
    listenerHandlers.onError = args.onError
    listenerHandlers.onTimeout = args.onTimeout
  },
}))

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: {
    markPromptAuthSuccess: (...args: unknown[]) => mockMarkPromptAuthSuccess(...args),
    rollbackPromptAuthRow: (...args: unknown[]) => mockRollbackPromptAuthRow(...args),
  },
}))

const gateRow = (overrides: Partial<MCPAuthGateServer> = {}): MCPAuthGateServer => ({
  mcp_config_id: 'mcp-1',
  mcp_config_name: 'GitHub',
  mcp_server_name: 'GitHub',
  auth_config_id: 'auth-1',
  auth_type: 'oauth2',
  status: 'authenticating',
  ...overrides,
})

const message = (rows: MCPAuthGateServer[] | null): ChatMessage => ({
  role: 'Assistant',
  createdAt: '2026-08-20T00:00:00.000Z',
  assistant: { id: 'assistant-1', name: 'Assistant' },
  executionId: null,
  mcpAuthPromptRows: rows,
})

const chat = (history: ChatMessage[][], overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'chat-42',
  assistantIds: [],
  assistantData: [],
  history,
  ...overrides,
})

describe('useChatAuthCallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listenerCalls.length = 0
    listenerHandlers.onSuccess = undefined
    listenerHandlers.onError = undefined
    listenerHandlers.onTimeout = undefined
  })

  it('tracks de-duplicated authenticating rows carrying a non-empty auth_config_id across history groups', () => {
    const testChat = chat([
      [
        message([
          gateRow({ auth_config_id: 'auth-1' }),
          gateRow({
            mcp_config_id: 'mcp-2',
            auth_config_id: 'auth-2',
            status: 'authentication_required',
          }),
          gateRow({ mcp_config_id: 'mcp-empty', auth_config_id: '' }),
        ]),
      ],
      [
        message(null),
        message([gateRow({ mcp_config_id: 'mcp-3', auth_config_id: 'auth-1' })]),
        message([gateRow({ mcp_config_id: 'mcp-4', auth_config_id: 'auth-4' })]),
      ],
    ])

    renderHook(() => useChatAuthCallbacks(testChat))

    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual(['auth-1', 'auth-4'])
  })

  it('reports every prompt row id as live, scoped to the chat that owns it', () => {
    const testChat = chat([
      [
        message([
          gateRow({ auth_config_id: 'auth-1' }),
          gateRow({
            mcp_config_id: 'mcp-2',
            auth_config_id: 'auth-2',
            status: 'authentication_required',
          }),
          gateRow({ mcp_config_id: 'mcp-empty', auth_config_id: '' }),
        ]),
      ],
      [message(null), message([gateRow({ mcp_config_id: 'mcp-3', auth_config_id: 'auth-1' })])],
    ])

    renderHook(() => useChatAuthCallbacks(testChat))

    // A row rolled back by the hint expiry is still live: its sign-in may yet complete.
    expect(listenerCalls.at(-1)?.liveAuthConfigIds).toEqual(['auth-1', 'auth-2'])
    expect(listenerCalls.at(-1)?.contextKey).toBe('chat-42')
  })

  it('reports no live ids for a chat it does not drive, leaving another chat flow alone', () => {
    renderHook(() => useChatAuthCallbacks(null))

    expect(listenerCalls.at(-1)?.liveAuthConfigIds).toBeUndefined()
  })

  it('tracks nothing and passes callable no-op handlers for a workflow chat', () => {
    const workflowChat = chat([[message([gateRow()])]], { isWorkflow: true })

    renderHook(() => useChatAuthCallbacks(workflowChat))

    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual([])
    expect(typeof listenerHandlers.onSuccess).toBe('function')
    expect(typeof listenerHandlers.onError).toBe('function')
    expect(typeof listenerHandlers.onTimeout).toBe('function')

    listenerHandlers.onSuccess?.('auth-1')
    listenerHandlers.onError?.('auth-1', 'err')
    listenerHandlers.onTimeout?.('auth-1')

    expect(mockMarkPromptAuthSuccess).not.toHaveBeenCalled()
    expect(mockRollbackPromptAuthRow).not.toHaveBeenCalled()
  })

  it('tracks nothing and passes callable no-op handlers for a null chat', () => {
    renderHook(() => useChatAuthCallbacks(null))

    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual([])
    expect(typeof listenerHandlers.onSuccess).toBe('function')
    expect(typeof listenerHandlers.onError).toBe('function')
    expect(typeof listenerHandlers.onTimeout).toBe('function')

    listenerHandlers.onSuccess?.('auth-1')
    listenerHandlers.onError?.('auth-1', 'err')
    listenerHandlers.onTimeout?.('auth-1')

    expect(mockMarkPromptAuthSuccess).not.toHaveBeenCalled()
    expect(mockRollbackPromptAuthRow).not.toHaveBeenCalled()
  })

  it('calls markPromptAuthSuccess with the chat id and auth_config_id on success', () => {
    const testChat = chat([[message([gateRow({ auth_config_id: 'auth-1' })])]])

    renderHook(() => useChatAuthCallbacks(testChat))
    listenerHandlers.onSuccess?.('auth-1')

    expect(mockMarkPromptAuthSuccess).toHaveBeenCalledWith('chat-42', 'auth-1')
  })

  it('calls rollbackPromptAuthRow with the error code on error', () => {
    const testChat = chat([[message([gateRow({ auth_config_id: 'auth-1' })])]])

    renderHook(() => useChatAuthCallbacks(testChat))
    listenerHandlers.onError?.('auth-1', 'access_denied')

    expect(mockRollbackPromptAuthRow).toHaveBeenCalledWith('chat-42', 'auth-1', 'access_denied')
  })

  it('falls back to null when onError receives no error code', () => {
    const testChat = chat([[message([gateRow({ auth_config_id: 'auth-1' })])]])

    renderHook(() => useChatAuthCallbacks(testChat))
    listenerHandlers.onError?.('auth-1', undefined)

    expect(mockRollbackPromptAuthRow).toHaveBeenCalledWith('chat-42', 'auth-1', null)
  })

  it('calls rollbackPromptAuthRow with the hint message on timeout', () => {
    const testChat = chat([[message([gateRow({ auth_config_id: 'auth-1' })])]])

    renderHook(() => useChatAuthCallbacks(testChat))
    listenerHandlers.onTimeout?.('auth-1')

    expect(mockRollbackPromptAuthRow).toHaveBeenCalledWith(
      'chat-42',
      'auth-1',
      AUTH_CALLBACK_HINT_MESSAGE
    )
  })

  it('still applies a success delivered after onTimeout rolled the row back (late-callback contract)', () => {
    const testChat = chat([[message([gateRow({ auth_config_id: 'auth-1' })])]])

    renderHook(() => useChatAuthCallbacks(testChat))
    listenerHandlers.onTimeout?.('auth-1')
    listenerHandlers.onSuccess?.('auth-1')

    expect(mockRollbackPromptAuthRow).toHaveBeenCalledWith(
      'chat-42',
      'auth-1',
      AUTH_CALLBACK_HINT_MESSAGE
    )
    expect(mockMarkPromptAuthSuccess).toHaveBeenCalledWith('chat-42', 'auth-1')
  })
})
