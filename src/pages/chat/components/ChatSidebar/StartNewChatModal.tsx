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

import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import CrossSvg from '@/assets/icons/cross.svg?react'
import SearchSvg from '@/assets/icons/search.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Popup from '@/components/Popup/Popup'
import { AvatarType } from '@/constants/avatar'
import { useVueRouter } from '@/hooks/useVueRouter'
import { assistantsStore, MAX_RECENT_ASSISTANTS } from '@/store/assistants'
import { chatsStore } from '@/store/chats'
import { cn } from '@/utils/utils'

type PickedAssistant = { id: string; name: string; icon_url?: string | null }

interface StartNewChatModalProps {
  isVisible: boolean
  onHide: () => void
}

const StartNewChatModal = (props: StartNewChatModalProps) => {
  const { isVisible, onHide } = props
  const router = useVueRouter()
  const { recentAssistants, pinnedAssistants, isRecentAssistantsLoading } =
    useSnapshot(assistantsStore)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PickedAssistant[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (isVisible) {
      assistantsStore.getRecentAssistants()
      assistantsStore.fetchPinnedAssistants()
    } else {
      setQuery('')
      setSearchResults([])
      setIsSearching(false)
    }
  }, [isVisible])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      setSearchResults([])
      setIsSearching(false)
      return () => {}
    }

    let isCurrentSearch = true
    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const results = await assistantsStore.getAllAssistantsOptions(trimmedQuery)
        if (isCurrentSearch) setSearchResults(results ?? [])
      } catch (error) {
        console.error('[StartNewChatModal] failed to search assistants:', error)
        if (isCurrentSearch) setSearchResults([])
      } finally {
        if (isCurrentSearch) setIsSearching(false)
      }
    }, 300)
    return () => {
      isCurrentSearch = false
      clearTimeout(timer)
    }
  }, [query])

  const startAssistantChat = async (assistant: PickedAssistant) => {
    try {
      await chatsStore.startNewChat(assistant.id, assistant.name, false)
      assistantsStore.updateRecentAssistants(assistant)
      router.push({ name: 'new-chat' })
      onHide()
    } catch (error) {
      console.error('[StartNewChatModal] failed to start chat:', error)
    }
  }

  const isSearchMode = query.trim().length > 0

  const searchSkeleton = (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 min-h-11 px-2 animate-pulse">
          <div className="size-8 rounded-full bg-surface-specific-dropdown-hover shrink-0" />
          <div className="h-3 rounded bg-surface-specific-dropdown-hover w-36" />
        </div>
      ))}
    </>
  )

  const assistantRow = (assistant: PickedAssistant) => (
    <button
      key={assistant.id}
      type="button"
      onClick={() => startAssistantChat(assistant)}
      className="group flex items-center gap-3 min-h-11 px-2 rounded-lg text-text-primary hover:bg-surface-specific-dropdown-hover transition-colors w-full text-left"
    >
      <Avatar iconUrl={assistant.icon_url} name={assistant.name} type={AvatarType.SMALL} />
      <span className="text-sm truncate flex-1 min-w-0">{assistant.name}</span>
      <span
        aria-hidden="true"
        className="h-7 px-2 inline-flex items-center rounded-lg border border-border-primary bg-surface-base-secondary font-mono text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
      >
        New Chat
      </span>
    </button>
  )

  return (
    <Popup
      header="Start a new chat"
      visible={isVisible}
      onHide={onHide}
      hideFooter
      className="w-[min(448px,calc(100vw-32px))] h-fit"
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="relative flex items-center">
          <label htmlFor="start-chat-search" className="sr-only">
            Search assistant or workflow
          </label>
          <SearchSvg className="absolute left-3 size-4 text-text-secondary pointer-events-none" />
          <input
            id="start-chat-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assistant, workflow..."
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-border-primary bg-surface-base-content text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-border-focus"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 text-text-secondary hover:text-text-primary"
            >
              <CrossSvg className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {isSearchMode ? (
            (() => {
              if (isSearching) return searchSkeleton
              if (searchResults.length > 0) return searchResults.map((item) => assistantRow(item))
              return <p className="text-sm text-text-secondary px-2 py-2">No results</p>
            })()
          ) : (
            <>
              {(() => {
                if (recentAssistants.length > 0) {
                  return (
                    <>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide px-2 mb-1">
                        Recent Assistants
                      </p>
                      {(recentAssistants as PickedAssistant[])
                        .slice(0, MAX_RECENT_ASSISTANTS)
                        .map((a) => assistantRow(a))}
                    </>
                  )
                }
                if (isRecentAssistantsLoading) return searchSkeleton
                return null
              })()}

              {pinnedAssistants.length > 0 && (
                <>
                  <p
                    className={cn(
                      'text-xs font-semibold text-text-secondary uppercase tracking-wide px-2 mb-1',
                      recentAssistants.length > 0 && 'mt-3'
                    )}
                  >
                    Pinned Assistants
                  </p>
                  <div className="max-h-60 overflow-y-auto show-scroll">
                    <div className="flex flex-col gap-1">
                      {(pinnedAssistants as PickedAssistant[]).map((a) => assistantRow(a))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Popup>
  )
}

export default StartNewChatModal
