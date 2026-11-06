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

import React, { useState, useEffect, useRef } from 'react'

import Button from '@/components/Button/Button'
import MultiSelect, { MultiSelectOptionType } from '@/components/form/MultiSelect/MultiSelect'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import UserAvatar from '@/pages/settings/administration/usersManagement/components/UserAvatar'
import { assistantsStore } from '@/store/assistants'
import { userStore } from '@/store/user'
import { Assistant } from '@/types/entity/assistant'
import { SharableUser, SharedWithUser } from '@/types/entity/sharing'
import { isOwner } from '@/utils/entity'
import toaster from '@/utils/toaster'

interface ShareAssistantPopupProps {
  visible: boolean
  assistant: Assistant | null
  onHide: () => void
}

const reconcileSelectedUsers = (
  ids: string[],
  prev: SharableUser[],
  searchOptions: MultiSelectOptionType[]
): SharableUser[] => {
  const kept = prev.filter((u) => ids.includes(u.id))
  const addedIds = ids.filter((id) => !prev.some((u) => u.id === id))
  const added = addedIds.flatMap((id) => {
    const opt = searchOptions.find((o) => o.value === id)
    if (!opt || typeof opt.label !== 'string') return []
    return [
      {
        id,
        name: opt.label,
        email: typeof opt.email === 'string' ? opt.email : '',
        picture: opt.picture as string | undefined,
      },
    ]
  })
  return [...kept, ...added]
}

const ShareAssistantPopup: React.FC<ShareAssistantPopupProps> = ({
  visible,
  assistant,
  onHide,
}) => {
  const [sharedWith, setSharedWith] = useState<SharedWithUser[]>([])
  const [loadError, setLoadError] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<SharableUser[]>([])
  const [searchOptions, setSearchOptions] = useState<MultiSelectOptionType[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRequestIdRef = useRef(0)
  // Mirrors sharedWith so the debounced search callback reads the current value when it
  // fires, rather than the value captured when the debounce timer was scheduled.
  const sharedIdsRef = useRef<Set<string>>(new Set())

  const renderSelectedItem = (id: string) => (
    <span>{selectedUsers.find((u) => u.id === id)?.name ?? id}</span>
  )

  useEffect(() => {
    sharedIdsRef.current = new Set(sharedWith.map((u) => u.id))
  }, [sharedWith])

  const loadSharedWith = () => {
    if (!assistant || !isOwner(assistant, userStore.user?.userId)) return
    setLoadError(false)
    assistantsStore
      .getSharedWith(assistant.id)
      .then((users) => {
        const currentUserId = userStore.user?.userId
        if (!currentUserId) {
          setSharedWith(users)
          return
        }
        setSharedWith(users.filter((u) => u.id !== currentUserId))
      })
      .catch(() => setLoadError(true))
  }

  useEffect(() => {
    if (!visible || !assistant) return
    setSharedWith([])
    setSelectedUsers([])
    setSearchOptions([])
    setShareError(null)
    loadSharedWith()
  }, [visible, assistant])

  // Depends on `visible` so the pending debounce timer is cleared when the popup hides,
  // not just on unmount.
  useEffect(() => {
    if (!visible) {
      searchRequestIdRef.current += 1
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [visible])

  const handleFilter = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.length < 2 || !assistant) {
      // Invalidate any in-flight request so it cannot repopulate the cleared options.
      searchRequestIdRef.current += 1
      setSearchOptions([])
      return
    }
    const requestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = requestId
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await assistantsStore.getSharableUsers(assistant.id, query)
        if (requestId !== searchRequestIdRef.current) return
        const currentUserId = userStore.user?.userId
        const filtered = results.filter(
          (u) => !sharedIdsRef.current.has(u.id) && u.id !== currentUserId
        )
        setSearchOptions(
          filtered.map((u) => ({ label: u.name, value: u.id, email: u.email, picture: u.picture }))
        )
      } catch {
        if (requestId !== searchRequestIdRef.current) return
        toaster.error('User search failed. Please try again.')
        setSearchOptions([])
      }
    }, 300)
  }

  const handleRemove = async (userId: string) => {
    if (!assistant) return
    const removedUser = sharedWith.find((u) => u.id === userId)
    setSharedWith((prev) => prev.filter((u) => u.id !== userId))
    setRemovingId(userId)
    try {
      await assistantsStore.removeShare(assistant.id, [userId])
      toaster.success('User removed from sharing.')
    } catch {
      toaster.error('Failed to remove user. Please try again.')
      if (removedUser) {
        setSharedWith((prev) => [...prev, removedUser])
      }
    } finally {
      setRemovingId(null)
    }
  }

  const handleShare = async () => {
    if (!assistant || selectedUsers.length === 0) return
    setShareError(null)
    setIsSaving(true)
    try {
      await assistantsStore.shareWith(
        assistant.id,
        selectedUsers.map((u) => u.id)
      )
      toaster.success('Assistant sharing updated.')
      onHide()
    } catch (error) {
      const message =
        (error as { parsedError?: { message?: string } })?.parsedError?.message ??
        'Failed to add some users. Please try again.'
      setShareError(message)
      toaster.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const canShare = selectedUsers.length > 0

  const selectedIds = selectedUsers.map((u) => u.id)

  const handlePopupHide = () => {
    if (isSaving || removingId) return
    onHide()
  }

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button variant={ButtonType.BASE} onClick={handlePopupHide} disabled={isSaving}>
        Cancel
      </Button>
      <Button
        variant={ButtonType.PRIMARY}
        onClick={handleShare}
        disabled={!canShare || isSaving}
        isLoading={isSaving}
      >
        {isSaving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )

  return (
    <Popup
      visible={visible}
      onHide={handlePopupHide}
      header="Share assistant"
      headerDescription="Can chat and view setup; cannot edit"
      footerContent={footerContent}
      className="w-[560px]"
    >
      <div className="flex flex-col gap-4">
        <MultiSelect
          display="chip"
          placeholder="Search users by name or email"
          options={searchOptions}
          value={selectedIds}
          optionLabel="label"
          optionValue="value"
          onFilter={handleFilter}
          serverSideFilter
          emptyFilterMessage="Type to search users"
          selectedItemTemplate={renderSelectedItem}
          onChange={(e) => {
            const ids: string[] = e.value
            setSelectedUsers((prev) => reconcileSelectedUsers(ids, prev, searchOptions))
          }}
          fullWidth
        />

        {loadError && (
          <div className="flex items-center justify-between gap-3 text-xs text-red-500">
            <span>Failed to load the people with access. Please try again.</span>
            <Button variant={ButtonType.BASE} onClick={loadSharedWith}>
              Retry
            </Button>
          </div>
        )}

        {!loadError && sharedWith.length > 0 && (
          <div>
            <p className="text-xs text-text-quaternary mb-2">People With Access</p>
            <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto show-scroll pr-2 -mr-2">
              {sharedWith.map((user) => (
                <li key={user.id} className="flex items-center gap-3">
                  <UserAvatar src={user.picture} name={user.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-text-secondary truncate">{user.email}</p>
                  </div>
                  <Button
                    variant={ButtonType.BASE}
                    onClick={() => handleRemove(user.id)}
                    disabled={removingId === user.id}
                    aria-label={`Remove ${user.name}`}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {shareError && <p className="text-xs text-red-500">{shareError}</p>}
      </div>
    </Popup>
  )
}

export default ShareAssistantPopup
