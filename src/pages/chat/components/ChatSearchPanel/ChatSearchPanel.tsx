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

import { Command } from 'cmdk'
import { useState, useEffect, useRef, RefObject } from 'react'

import CrossSvg from '@/assets/icons/cross.svg?react'
import SearchSvg from '@/assets/icons/search.svg?react'
import Popup from '@/components/Popup/Popup'
import Spinner from '@/components/Spinner/Spinner'
import { TIME_PERIOD_LABELS } from '@/constants/chats'
import useSearchHistory from '@/hooks/useSearchHistory'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { SearchResultItem as SearchItem } from '@/types/chats'
import { cn } from '@/utils/utils'

import SearchResultItem from './SearchResultItem'
import { useRecentChats } from './useRecentChats'
import { ChatSidebarListsRef } from '../ChatSidebar/ChatSidebarLists/ChatSidebarLists'

export const SEARCH_TRIGGER_LENGTH = 3

interface ChatSearchPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sidebarListsRef: RefObject<ChatSidebarListsRef | null>
}

const ChatSearchPanel = ({ open, onOpenChange, sidebarListsRef }: ChatSearchPanelProps) => {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchItem[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const commandListRef = useRef<HTMLDivElement>(null)

  const { history, addToHistory } = useSearchHistory()
  const { recentChats, groupedChats } = useRecentChats({ open })
  const router = useVueRouter()

  useEffect(() => {
    if (open) {
      setQuery('')
      setSearchResults(null)
    }
  }, [open])

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (query.length < SEARCH_TRIGGER_LENGTH) {
      setSearchResults(null)
      setIsLoading(false)
      return () => {}
    }

    setIsLoading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    const timeoutId = setTimeout(async () => {
      try {
        const results = await chatsStore.searchChats(query, controller.signal)
        setSearchResults(results)
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Search error:', err)
        }
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [query])

  const handleSelectResult = (item: SearchItem) => {
    addToHistory(query)

    if (item.type === 'chat') {
      router.push({ name: 'chats', params: { id: item.id } })
      sidebarListsRef.current?.scrollToChat(item.id, item.folder)
    } else if (item.type === 'folder') {
      sidebarListsRef.current?.expandFolder(item.name)
    }

    onOpenChange(false)
  }

  const hasRecentChats = !!recentChats.length

  return (
    <Popup
      visible={open}
      onHide={() => onOpenChange(false)}
      header="Search Chats"
      hideHeader
      hideFooter
      className="w-[40rem]"
      bodyClassName="p-0"
    >
      <Command loop shouldFilter={false} className="h-full max-h-full flex flex-col">
        <div className="p-4 border-b border-border-primary">
          <div className="flex h-8 items-center gap-2 pr-2 border border-border-primary rounded-lg bg-surface-base-primary">
            <label
              className={cn(
                'pl-2 text-text-quaternary transition-colors hover:text-text-secondary focus-within:text-text-secondary flex gap-2 items-center grow',
                query && 'text-text-primary'
              )}
            >
              <SearchSvg />
              <Command.Input
                autoFocus
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Search"
                className="w-full bg-transparent text-sm outline-none placeholder-inherit"
              />
            </label>

            {query && (
              <button
                type="button"
                className="text-text-secondary hover:text-text-primary"
                onClick={() => {
                  setQuery('')
                  setTimeout(() => commandListRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
                }}
              >
                <CrossSvg />
              </button>
            )}
          </div>
        </div>

        <Command.List
          ref={commandListRef}
          className="flex flex-col overflow-y-auto py-3 px-2 min-h-[26rem] max-h-[26rem] [&>cmdk-list-size]:focus:outline-none"
        >
          {/* Default state: show history and recent chats */}
          {query.length < SEARCH_TRIGGER_LENGTH && (
            <>
              {history.length > 0 && (
                <Command.Group
                  heading="Last Search"
                  className="p-1 [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:mb-1 [&>[cmdk-group-heading]]:text-text-quaternary [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:pl-1"
                >
                  {history.map((item) => (
                    <Command.Item
                      key={item.value}
                      onSelect={() => setQuery(item.value)}
                      className="cursor-pointer flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-specific-dropdown-hover data-[selected=true]:bg-surface-specific-dropdown-hover"
                    >
                      <SearchSvg className="h-[1.12rem] w-[1.12rem]" />
                      {item.value}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {hasRecentChats && (
                <div className="font-semibold text-xs uppercase text-text-quaternary ml-2 mt-3 mb-2">
                  Recent Chats
                </div>
              )}
              {TIME_PERIOD_LABELS.map(({ label, key }) => {
                const chats = groupedChats[key]
                if (chats.length === 0) return null

                return (
                  <Command.Group
                    key={key}
                    heading={label}
                    className="p-1 pt-0 command-group [&~.command-group]:mt-5 [&>[cmdk-group-heading]]:mb-1 [&>[cmdk-group-heading]]:text-text-quaternary [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:pl-1"
                  >
                    {chats.map((chat) => (
                      <SearchResultItem
                        key={chat.id}
                        item={{
                          id: chat.id,
                          name: chat.name || 'New chat',
                          type: 'chat',
                          updated_at: '',
                          folder: chat.folder,
                        }}
                        onSelect={handleSelectResult}
                      />
                    ))}
                  </Command.Group>
                )
              })}

              {history.length === 0 && Object.values(groupedChats).every((g) => g.length === 0) && (
                <div className="px-3 py-8 text-center text-sm text-text-secondary">
                  Start typing to search chats and folders...
                </div>
              )}
            </>
          )}

          {/* Loading state - only show if no previous results */}
          {query.length >= SEARCH_TRIGGER_LENGTH && isLoading && !searchResults && (
            <div className="flex justify-center py-8">
              <Spinner inline />
            </div>
          )}

          {/* Search results */}
          {query.length >= SEARCH_TRIGGER_LENGTH && searchResults && (
            <>
              {searchResults.length > 0 ? (
                <Command.Group>
                  {searchResults.map((item) => (
                    <SearchResultItem
                      key={item.id ?? item.name}
                      item={item}
                      query={query}
                      onSelect={handleSelectResult}
                    />
                  ))}
                </Command.Group>
              ) : (
                <Command.Empty className="px-3 py-8 text-center text-sm text-text-secondary">
                  No chats or folders found
                </Command.Empty>
              )}
            </>
          )}
        </Command.List>
      </Command>
    </Popup>
  )
}

export default ChatSearchPanel
