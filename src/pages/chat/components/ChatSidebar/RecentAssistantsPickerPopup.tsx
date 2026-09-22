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

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import SearchSvg from '@/assets/icons/search.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { AvatarType } from '@/constants/avatar'
import { assistantsStore } from '@/store/assistants'
import { Assistant } from '@/types/entity/assistant'

interface RecentAssistantsPickerPopupProps {
  isVisible: boolean
  onHide: () => void
}

const ASSISTANTS_PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 250

const RecentAssistantsPickerPopup = ({ isVisible, onHide }: RecentAssistantsPickerPopupProps) => {
  const { recentAssistants } = useSnapshot(assistantsStore)
  const [availableAssistants, setAvailableAssistants] = useState<Assistant[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const requestSequenceRef = useRef(0)

  useEffect(() => {
    if (isVisible) return
    setSearch('')
    setAvailableAssistants([])
    setIsLoading(false)
  }, [isVisible])

  useEffect(() => {
    requestSequenceRef.current += 1
    const requestId = requestSequenceRef.current
    if (!isVisible) return () => undefined
    setPage(0)
    setHasMore(false)

    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      assistantsStore
        .getAssistantOptions(
          search.trim(),
          { page: 0, per_page: ASSISTANTS_PAGE_SIZE },
          ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER
        )
        .then((assistants) => {
          if (requestSequenceRef.current !== requestId) return
          setAvailableAssistants(assistants)
          setHasMore(assistants.length === ASSISTANTS_PAGE_SIZE)
        })
        .catch((error) => {
          if (requestSequenceRef.current !== requestId) return
          console.error('[RecentAssistantsPickerPopup] failed to load assistants:', error)
          setAvailableAssistants([])
        })
        .finally(() => {
          if (requestSequenceRef.current === requestId) setIsLoading(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isVisible, search])

  const recentIds = useMemo(
    () => new Set(recentAssistants.map((assistant) => assistant.id)),
    [recentAssistants]
  )
  const selectableAssistants = availableAssistants.filter(
    (assistant) => !recentIds.has(assistant.id)
  )

  const handleAddAssistant = (assistant: Assistant) => {
    assistantsStore.updateRecentAssistants(assistant)
  }

  const handleLoadMore = async () => {
    requestSequenceRef.current += 1
    const requestId = requestSequenceRef.current
    const nextPage = page + 1
    setIsLoading(true)
    try {
      const assistants = await assistantsStore.getAssistantOptions(
        search.trim(),
        { page: nextPage, per_page: ASSISTANTS_PAGE_SIZE },
        ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER
      )
      if (requestSequenceRef.current !== requestId) return
      setAvailableAssistants((current) => {
        const byId = new Map(current.map((assistant) => [assistant.id, assistant]))
        for (const assistant of assistants) byId.set(assistant.id, assistant)
        return Array.from(byId.values())
      })
      setPage(nextPage)
      setHasMore(assistants.length === ASSISTANTS_PAGE_SIZE)
    } catch (error) {
      if (requestSequenceRef.current === requestId) {
        console.error('[RecentAssistantsPickerPopup] failed to load more assistants:', error)
      }
    } finally {
      if (requestSequenceRef.current === requestId) setIsLoading(false)
    }
  }

  return (
    <Popup
      visible={isVisible}
      header="Add assistant"
      onHide={onHide}
      hideFooter
      className="w-full max-w-md"
    >
      <div className="flex flex-col gap-3 pb-2">
        <div className="relative">
          <SearchSvg
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search assistants"
            placeholder="Search assistants..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-full rounded-lg border border-border-primary bg-surface-base-content py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-border-accent"
          />
        </div>
        <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
          {selectableAssistants.map((assistant) => (
            <button
              key={assistant.id}
              type="button"
              className="flex min-h-10 items-center gap-3 rounded-lg px-2 text-left hover:bg-surface-specific-dropdown-hover"
              onClick={() => handleAddAssistant(assistant)}
            >
              <Avatar
                iconUrl={assistant.icon_url}
                name={assistant.name}
                type={AvatarType.SMALL}
                className="shrink-0"
              />
              <span className="min-w-0 grow truncate text-sm text-text-primary">
                {assistant.name}
              </span>
            </button>
          ))}
          {hasMore && (
            <Button disabled={isLoading} isLoading={isLoading} onClick={handleLoadMore}>
              Load more
            </Button>
          )}
          {!isLoading && selectableAssistants.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-text-tertiary">
              {search ? 'No assistants found' : 'No assistants available to add'}
            </p>
          )}
        </div>
      </div>
    </Popup>
  )
}

export default RecentAssistantsPickerPopup
