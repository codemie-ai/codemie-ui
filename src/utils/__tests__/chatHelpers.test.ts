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

import { describe, it, expect } from 'vitest'

import { ROLE_ASSISTANT, ROLE_USER } from '@/constants'
import { transformChatBEtoFE, getChatBEMessageIndex } from '@/utils/chatHelpers'

describe('transformChatBEtoFE', () => {
  it('returns a transformed chat', () => {
    const chat = {
      id: '123',
      conversation_name: 'Test Chat',
      llm_model: 'gpt-4',
      folder: 'default',
      assistant_ids: ['123'],
      initial_assistant_id: '123',
      assistant_data: [],
      history: [],
    }

    const result = transformChatBEtoFE(chat)

    expect(result.id).toEqual('123')
  })
})

describe('getChatBEMessageIndex', () => {
  it('returns the correct BE message index based on FE history and message indexes for user and assistant roles', () => {
    // Create a mock chat object with history
    const chat = {
      history: [
        // First conversation thread (historyIndex 0)
        [
          {
            request: 'User message 1',
            response: 'Assistant response 1',
            createdAt: '2025-08-13T10:45:58.538392',
          },
        ],
        // Second conversation thread (historyIndex 1)
        [
          {
            request: 'User message 2',
            response: 'Assistant response 2',
            createdAt: '2025-08-14T09:20:15.654321',
          },
        ],
        // Third conversation thread (historyIndex 2)
        [
          {
            request: 'User message 3',
            response: 'Assistant response 3',
            createdAt: '2025-08-15T14:30:22.111111',
          },
        ],
      ],
    }

    // Test user message indices (even indices in BE)
    expect(getChatBEMessageIndex(chat, 0, 0, ROLE_USER)).toEqual(0) // First user message
    expect(getChatBEMessageIndex(chat, 1, 0, ROLE_USER)).toEqual(2) // Second user message
    expect(getChatBEMessageIndex(chat, 2, 0, ROLE_USER)).toEqual(4) // Third user message

    // Test assistant message indices (odd indices in BE)
    expect(getChatBEMessageIndex(chat, 0, 0, ROLE_ASSISTANT)).toEqual(1) // First assistant message
    expect(getChatBEMessageIndex(chat, 1, 0, ROLE_ASSISTANT)).toEqual(3) // Second assistant message
    expect(getChatBEMessageIndex(chat, 2, 0, ROLE_ASSISTANT)).toEqual(5) // Third assistant message

    // Default role should be ROLE_ASSISTANT if not specified
    expect(getChatBEMessageIndex(chat, 0, 0)).toEqual(1) // First assistant message

    // Test with invalid indexes
    expect(getChatBEMessageIndex(chat, 3, 0, ROLE_USER)).toEqual(-1) // Invalid historyIndex
    expect(getChatBEMessageIndex(chat, 0, 2, ROLE_ASSISTANT)).toEqual(-1) // Invalid messageIndex

    // Test with null/empty chat
    expect(getChatBEMessageIndex(null as any, 0, 0, ROLE_USER)).toEqual(-1)
    expect(getChatBEMessageIndex({} as any, 0, 0, ROLE_ASSISTANT)).toEqual(-1)
    expect(getChatBEMessageIndex({ history: [] }, 0, 0, ROLE_USER)).toEqual(-1)
  })

  it('handles messages with the same content but different dates', () => {
    const chat = {
      history: [
        [
          {
            request: 'Hello',
            response: 'Hello',
            createdAt: '2025-08-13T10:45:58.538392',
          }, // Same content for user and assistant
        ],
        [
          {
            request: 'Hello',
            response: 'Hi there',
            createdAt: '2025-08-14T09:20:15.654321',
          }, // Same content for user, different for assistant
        ],
      ],
    }

    // Should find the correct message with the same content based on date
    expect(getChatBEMessageIndex(chat, 0, 0, ROLE_USER)).toEqual(0) // First user message
    expect(getChatBEMessageIndex(chat, 0, 0, ROLE_ASSISTANT)).toEqual(1) // First assistant message
    expect(getChatBEMessageIndex(chat, 1, 0, ROLE_USER)).toEqual(2) // Second user message
    expect(getChatBEMessageIndex(chat, 1, 0, ROLE_ASSISTANT)).toEqual(3) // Second assistant message
  })

  it('handles out of order dates', () => {
    // Test with dates not in chronological order
    const chat = {
      history: [
        [
          {
            request: 'Later message',
            response: 'Later response',
            createdAt: '2025-08-15T10:45:58.538392',
          }, // Later message
        ],
        [
          {
            request: 'Earlier message',
            response: 'Earlier response',
            createdAt: '2025-08-13T09:20:15.654321',
          }, // Earlier message
        ],
      ],
    }

    // When sorted by date, the earlier messages should come first in BE indexing

    // User messages
    expect(getChatBEMessageIndex(chat, 1, 0, ROLE_USER)).toEqual(0) // Earlier user message
    expect(getChatBEMessageIndex(chat, 0, 0, ROLE_USER)).toEqual(2) // Later user message

    // Assistant messages
    expect(getChatBEMessageIndex(chat, 1, 0, ROLE_ASSISTANT)).toEqual(1) // Earlier assistant message
    expect(getChatBEMessageIndex(chat, 0, 0, ROLE_ASSISTANT)).toEqual(3) // Later assistant message
  })

  it('correctly calculates BE indices when dealing with multiple messages in a conversation thread', () => {
    const chat = {
      history: [
        // First thread with two message pairs
        [
          {
            request: 'First user message',
            response: 'First assistant response',
            createdAt: '2025-08-10T10:00:00.000000',
          },
          {
            request: 'Second user message',
            response: 'Second assistant response',
            createdAt: '2025-08-10T10:02:00.000000',
          },
        ],
        // Second thread with one message pair
        [
          {
            request: 'Third user message',
            response: 'Third assistant response',
            createdAt: '2025-08-11T15:00:00.000000',
          },
        ],
      ],
    }

    // User messages
    expect(getChatBEMessageIndex(chat, 0, 0, ROLE_USER)).toEqual(0) // First user message
    expect(getChatBEMessageIndex(chat, 0, 1, ROLE_USER)).toEqual(2) // Second user message
    expect(getChatBEMessageIndex(chat, 1, 0, ROLE_USER)).toEqual(4) // Third user message

    // Assistant messages
    expect(getChatBEMessageIndex(chat, 0, 0, ROLE_ASSISTANT)).toEqual(1) // First assistant response
    expect(getChatBEMessageIndex(chat, 0, 1, ROLE_ASSISTANT)).toEqual(3) // Second assistant response
    expect(getChatBEMessageIndex(chat, 1, 0, ROLE_ASSISTANT)).toEqual(5) // Third assistant response
  })
})
