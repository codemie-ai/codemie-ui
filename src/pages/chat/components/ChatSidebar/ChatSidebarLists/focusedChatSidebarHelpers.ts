// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ChatListItem } from '@/types/entity/conversation'

export type FocusedView =
  | { type: 'root'; targetChatId?: string }
  | {
      type: 'assistant'
      id: string
      name?: string
      iconUrl?: string | null
      targetChatId?: string
    }
  | { type: 'folder'; name: string; targetChatId?: string }

export const getChatDisplayName = (chat: ChatListItem) =>
  chat.name?.trim() || chat.assistantNames?.[0]?.trim() || 'New chat'

export const getFocusedViewKey = (view: FocusedView) => {
  if (view.type === 'assistant') return `assistant:${view.id}`
  if (view.type === 'folder') return `folder:${view.name}`
  return 'root'
}

export const createEmptyAssistantChat = (
  view: Extract<FocusedView, { type: 'assistant' }>
): ChatListItem => ({
  id: `assistant-history:${view.id}`,
  name: null,
  folder: null,
  pinned: false,
  date: '',
  assistantIds: [view.id],
  initialAssistantId: view.id,
  initialWorkflowId: null,
  isGroup: false,
  isWorkflow: false,
  iconUrl: view.iconUrl,
  assistantNames: view.name ? [view.name] : undefined,
})
