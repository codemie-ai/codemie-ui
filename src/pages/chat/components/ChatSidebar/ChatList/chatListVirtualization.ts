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

import { createContext } from 'react'

// undefined: no scrolling ancestor provides one, so the list renders plainly.
// null: the provider's element is not attached yet.
export const ChatListScrollElementContext = createContext<HTMLDivElement | null | undefined>(
  undefined
)

// A virtualized sidebar list, so navigation can bring a row into the DOM before looking it up.
// Each method returns false when the list does not hold the target.
export interface ChatListScroller {
  listId?: string
  scrollToChat?: (chatId: string, align: 'auto' | 'center') => boolean
  scrollToFolder?: (folderKey: string, align: 'start' | 'center') => boolean
}

export const getFolderChatListId = (folderKey: string) =>
  `chat-tree-folder-group-${encodeURIComponent(folderKey)}`

export type RegisterChatListScroller = (scroller: ChatListScroller) => () => void

export const ChatListScrollerRegistryContext = createContext<RegisterChatListScroller | null>(null)
