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

import { type ChatListItem } from '@/types/entity/conversation'

import { resolveChatAvatar } from '../useChatItemAvatar'

const baseChat: ChatListItem = {
  id: 'chat-1',
  name: null,
  folder: '',
  pinned: false,
  date: '2026-01-01',
  assistantIds: [],
  initialAssistantId: null,
  initialWorkflowId: null,
  isGroup: false,
  isWorkflow: false,
  iconUrl: null,
  assistantNames: [],
}

const emptyStores = {
  assistants: [],
  recentAssistants: [],
  pinnedAssistants: [],
  workflows: [],
  recentWorkflows: [],
  chatWorkflows: [],
}

describe('resolveChatAvatar', () => {
  describe('chat has backend data', () => {
    it('returns iconUrl and first assistantName when both present', () => {
      const chat = { ...baseChat, iconUrl: 'https://cdn/icon.png', assistantNames: ['FAQ'] }
      expect(resolveChatAvatar(chat, emptyStores)).toEqual({
        iconUrl: 'https://cdn/icon.png',
        name: 'FAQ',
      })
    })

    it('returns iconUrl with undefined name when assistantNames empty', () => {
      const chat = { ...baseChat, iconUrl: 'https://cdn/icon.png', assistantNames: [] }
      expect(resolveChatAvatar(chat, emptyStores)).toEqual({
        iconUrl: 'https://cdn/icon.png',
        name: undefined,
      })
    })

    it('returns null iconUrl with name when only assistantNames present', () => {
      const chat = { ...baseChat, iconUrl: null, assistantNames: ['Chatbot'] }
      expect(resolveChatAvatar(chat, emptyStores)).toEqual({
        iconUrl: null,
        name: 'Chatbot',
      })
    })
  })

  describe('assistant chat — store lookup', () => {
    const stores = {
      ...emptyStores,
      assistants: [{ id: 'a-1', icon_url: 'https://cdn/a1.png', name: 'My Assistant' }],
      recentAssistants: [{ id: 'a-2', icon_url: 'https://cdn/a2.png', name: 'Recent Assistant' }],
      pinnedAssistants: [],
    }

    it('resolves from assistants list', () => {
      const chat = { ...baseChat, initialAssistantId: 'a-1' }
      expect(resolveChatAvatar(chat, stores)).toEqual({
        iconUrl: 'https://cdn/a1.png',
        name: 'My Assistant',
      })
    })

    it('falls back to recentAssistants when not in main list', () => {
      const chat = { ...baseChat, initialAssistantId: 'a-2' }
      expect(resolveChatAvatar(chat, stores)).toEqual({
        iconUrl: 'https://cdn/a2.png',
        name: 'Recent Assistant',
      })
    })

    it('returns null when assistant not found in any list', () => {
      const chat = { ...baseChat, initialAssistantId: 'unknown' }
      expect(resolveChatAvatar(chat, stores)).toEqual({ iconUrl: null, name: undefined })
    })

    it('returns null when initialAssistantId is null', () => {
      expect(resolveChatAvatar(baseChat, stores)).toEqual({ iconUrl: null, name: undefined })
    })
  })

  describe('workflow chat — store lookup', () => {
    const stores = {
      ...emptyStores,
      workflows: [{ id: 'w-1', icon_url: 'https://cdn/w1.png', name: 'My Workflow' }],
      recentWorkflows: [{ id: 'w-2', icon_url: 'https://cdn/w2.png', name: 'Recent Workflow' }],
    }

    it('resolves from workflows list', () => {
      const chat = { ...baseChat, isWorkflow: true, initialWorkflowId: 'w-1' }
      expect(resolveChatAvatar(chat, stores)).toEqual({
        iconUrl: 'https://cdn/w1.png',
        name: 'My Workflow',
      })
    })

    it('falls back to recentWorkflows when not in main list', () => {
      const chat = { ...baseChat, isWorkflow: true, initialWorkflowId: 'w-2' }
      expect(resolveChatAvatar(chat, stores)).toEqual({
        iconUrl: 'https://cdn/w2.png',
        name: 'Recent Workflow',
      })
    })

    it('falls back to chatWorkflows when workflow is outside the recent list', () => {
      const storesWithChatWorkflow = {
        ...emptyStores,
        chatWorkflows: [
          { id: 'w-3', icon_url: 'https://cdn/w3.png', name: 'Cached Chat Workflow' },
        ],
      }
      const chat = { ...baseChat, isWorkflow: true, initialWorkflowId: 'w-3' }

      expect(resolveChatAvatar(chat, storesWithChatWorkflow)).toEqual({
        iconUrl: 'https://cdn/w3.png',
        name: 'Cached Chat Workflow',
      })
    })

    it('returns null iconUrl when workflow has no icon_url', () => {
      const storesNoIcon = {
        ...emptyStores,
        workflows: [{ id: 'w-1', name: 'No Icon Workflow' }],
        recentWorkflows: [],
      }
      const chat = { ...baseChat, isWorkflow: true, initialWorkflowId: 'w-1' }
      expect(resolveChatAvatar(chat, storesNoIcon)).toEqual({
        iconUrl: null,
        name: 'No Icon Workflow',
      })
    })

    it('returns undefined name when workflow name is null', () => {
      const storesNullName = {
        ...emptyStores,
        workflows: [{ id: 'w-1', icon_url: 'https://cdn/w1.png', name: null }],
        recentWorkflows: [],
      }
      const chat = { ...baseChat, isWorkflow: true, initialWorkflowId: 'w-1' }
      expect(resolveChatAvatar(chat, storesNullName)).toEqual({
        iconUrl: 'https://cdn/w1.png',
        name: undefined,
      })
    })

    it('returns null when workflow not found', () => {
      const chat = { ...baseChat, isWorkflow: true, initialWorkflowId: 'unknown' }
      expect(resolveChatAvatar(chat, stores)).toEqual({ iconUrl: null, name: undefined })
    })

    it('returns null when initialWorkflowId is null', () => {
      const chat = { ...baseChat, isWorkflow: true, initialWorkflowId: null }
      expect(resolveChatAvatar(chat, stores)).toEqual({ iconUrl: null, name: undefined })
    })
  })

  describe('no data at all', () => {
    it('returns null for chat with no ids and empty stores', () => {
      expect(resolveChatAvatar(baseChat, emptyStores)).toEqual({ iconUrl: null, name: undefined })
    })
  })
})
