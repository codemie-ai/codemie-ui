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
import SharedWithList from '@/components/sharing/SharedWithList'
import { ButtonType } from '@/constants'
import { SharableUser, SharedWithUser } from '@/types/entity/sharing'
import toaster from '@/utils/toaster'

export interface SharePopupProps {
  visible: boolean
  onHide: () => void
  header: string
  headerDescription?: string
  searchUsers: (query: string) => Promise<SharableUser[]>
  share: (ids: string[]) => Promise<void>
  unshare: (ids: string[]) => Promise<void>
  loadSharedWith?: () => Promise<SharedWithUser[]>
  /** Identifies the shared entity; a change while visible reloads the people with access. */
  entityKey?: string
  /** A change while visible reloads the people with access, keeping the current selection. */
  refreshKey?: number
  canGrant: boolean
  texts: {
    shared: string
    shareFailed: string
    unshared: string
    unshareFailed: string
    viaLinkNote?: string
  }
  extra?: React.ReactNode
  /** A short explanation shown above the user picker, e.g. why granting is unavailable. */
  notice?: React.ReactNode
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

const SharePopup: React.FC<SharePopupProps> = ({
  visible,
  onHide,
  header,
  headerDescription,
  searchUsers,
  share,
  unshare,
  loadSharedWith: loadSharedWithProp,
  entityKey,
  refreshKey,
  canGrant,
  texts,
  extra,
  notice,
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
  // Only the latest shared-with load may write the list; superseded responses are dropped.
  const loadIdRef = useRef(0)
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
    loadIdRef.current += 1
    const loadId = loadIdRef.current
    if (!loadSharedWithProp) return
    setLoadError(false)
    loadSharedWithProp()
      .then((users) => loadId === loadIdRef.current && setSharedWith(users))
      .catch(() => loadId === loadIdRef.current && setLoadError(true))
  }

  useEffect(() => {
    if (!visible) {
      loadIdRef.current += 1
      return
    }
    setSharedWith([])
    setSelectedUsers([])
    setSearchOptions([])
    setShareError(null)
    loadSharedWith()
  }, [visible, entityKey])

  // Skips the first render: the effect above already loads the list when the popup opens.
  const refreshKeyRef = useRef(refreshKey)
  useEffect(() => {
    if (refreshKeyRef.current === refreshKey) return
    refreshKeyRef.current = refreshKey
    if (visible) loadSharedWith()
  }, [refreshKey])

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
    if (!query || query.length < 2 || !canGrant) {
      // Invalidate any in-flight request so it cannot repopulate the cleared options.
      searchRequestIdRef.current += 1
      setSearchOptions([])
      return
    }
    const requestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = requestId
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(query)
        if (requestId !== searchRequestIdRef.current) return
        const filtered = results.filter((u) => !sharedIdsRef.current.has(u.id))
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
    // A list load already in flight predates this removal and would bring the person back.
    loadIdRef.current += 1
    const removedUser = sharedWith.find((u) => u.id === userId)
    setSharedWith((prev) => prev.filter((u) => u.id !== userId))
    setRemovingId(userId)
    try {
      await unshare([userId])
      toaster.success(texts.unshared)
    } catch {
      toaster.error(texts.unshareFailed)
      if (removedUser) {
        setSharedWith((prev) => [...prev, removedUser])
      }
    } finally {
      setRemovingId(null)
    }
  }

  const handleShare = async () => {
    if (!canGrant || selectedUsers.length === 0) return
    setShareError(null)
    setIsSaving(true)
    try {
      await share(selectedUsers.map((u) => u.id))
      toaster.success(texts.shared)
      onHide()
    } catch (error) {
      const message =
        (error as { parsedError?: { message?: string } })?.parsedError?.message ?? texts.shareFailed
      setShareError(message)
      toaster.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const canShare = canGrant && selectedUsers.length > 0

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
      header={header}
      headerDescription={headerDescription}
      footerContent={footerContent}
      className="w-[560px]"
    >
      <div className="flex flex-col gap-4">
        {notice && <p className="text-xs text-text-quaternary">{notice}</p>}
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
          disabled={!canGrant}
          fullWidth
        />

        {extra}

        {loadError && (
          <div className="flex items-center justify-between gap-3 text-xs text-red-500">
            <span>Failed to load the people with access. Please try again.</span>
            <Button variant={ButtonType.BASE} onClick={loadSharedWith}>
              Retry
            </Button>
          </div>
        )}

        {!loadError && sharedWith.length > 0 && (
          <SharedWithList
            users={sharedWith}
            onRemove={handleRemove}
            removingId={removingId}
            viaLinkNote={texts.viaLinkNote}
          />
        )}

        {shareError && <p className="text-xs text-red-500">{shareError}</p>}
      </div>
    </Popup>
  )
}

export default SharePopup
