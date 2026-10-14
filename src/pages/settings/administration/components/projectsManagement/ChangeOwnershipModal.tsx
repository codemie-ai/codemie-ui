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

import { FC, useState, useCallback, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'

import MultiSelect from '@/components/form/MultiSelect'
import Popup from '@/components/Popup'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { userStore } from '@/store/user'
import toaster from '@/utils/toaster'

export interface ChangeOwnershipModalProps {
  visible: boolean
  onHide: () => void
  currentOwnerId: string | null | undefined
  onSubmit: (newOwnerId: string, newOwnerName: string) => Promise<void>
}

const MIN_SEARCH_LENGTH = 1
const SEARCH_RESULTS_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 500

const ERROR_MESSAGES = {
  SAME_OWNER: 'This user is already the project owner',
}

const unknownOwnerLabel = (ownerId: string | null | undefined) =>
  ownerId ? `Unknown (id: ${ownerId})` : 'Unknown'

const ChangeOwnershipModal: FC<ChangeOwnershipModalProps> = ({
  visible,
  onHide,
  currentOwnerId,
  onSubmit,
}) => {
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useForm()

  const [currentOwnerLabel, setCurrentOwnerLabel] = useState('')
  const [userOptions, setUserOptions] = useState<
    Array<{ label: string; value: string; name: string }>
  >([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [userIdError, setUserIdError] = useState('')

  const requestIdRef = useRef(0)

  const resetFormState = useCallback(() => {
    requestIdRef.current += 1
    setIsLoadingUsers(false)
    setSelectedUserId('')
    setUserOptions([])
    setUserIdError('')
    setUserQuery('')
  }, [])

  useEffect(() => {
    let cancelled = false

    if (visible) {
      if (!currentOwnerId) {
        setCurrentOwnerLabel(unknownOwnerLabel(currentOwnerId))
      } else {
        userStore
          .getUserById(currentOwnerId)
          .then((user) => {
            if (cancelled) return
            setCurrentOwnerLabel(`${user.name ?? user.username} (${user.email})`)
          })
          .catch((error) => {
            console.error('Failed to resolve current owner:', error)
            if (cancelled) return
            setCurrentOwnerLabel(unknownOwnerLabel(currentOwnerId))
          })
      }
    }

    return () => {
      cancelled = true
    }
  }, [visible, currentOwnerId])

  const runSearch = useCallback(async (query: string) => {
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    setIsLoadingUsers(true)
    try {
      const users = await userStore.searchUsers(query, SEARCH_RESULTS_LIMIT)
      if (requestId !== requestIdRef.current) return
      setUserOptions(
        users.map((u) => ({ label: `${u.name} (${u.email})`, value: u.id, name: u.name || '' }))
      )
    } catch (error: any) {
      if (requestId !== requestIdRef.current) return
      console.error('Failed to search users:', error)
      toaster.error(error?.parsedError?.message || error?.message || 'Failed to search users')
      setUserOptions([])
    } finally {
      if (requestId === requestIdRef.current) setIsLoadingUsers(false)
    }
  }, [])

  const handleUserSearch = useCallback((query: string) => {
    setSelectedUserId('')
    setUserIdError('')
    setUserQuery(query)

    if (query.length < MIN_SEARCH_LENGTH) {
      requestIdRef.current += 1
      setIsLoadingUsers(false)
      setUserOptions([])
    }
  }, [])

  const applyUserSearch = useCallback(() => {
    if (userQuery.length < MIN_SEARCH_LENGTH) return
    runSearch(userQuery)
  }, [userQuery, runSearch])

  useDebouncedApply(userQuery, SEARCH_DEBOUNCE_MS, applyUserSearch)

  const handleUserChange = useCallback(
    (value: string | string[] | null) => {
      if (!value) {
        setSelectedUserId('')
        setUserIdError('')
        return
      }

      const userId = Array.isArray(value) ? value[0] : value
      setSelectedUserId(userId || '')
      setUserIdError(userId && userId === currentOwnerId ? ERROR_MESSAGES.SAME_OWNER : '')
    },
    [currentOwnerId]
  )

  const handleFormSubmit = async () => {
    if (!selectedUserId || userIdError) return

    const selectedUserName =
      userOptions.find((option) => option.value === selectedUserId)?.name || ''

    await onSubmit(selectedUserId, selectedUserName)
    resetFormState()
  }

  const handleModalHide = () => {
    resetFormState()
    onHide()
  }

  return (
    <Popup
      visible={visible}
      onHide={handleModalHide}
      header="Change Ownership"
      onSubmit={handleSubmit(handleFormSubmit)}
      submitText="Confirm"
      submitDisabled={isSubmitting || !selectedUserId || !!userIdError}
      cancelText="Cancel"
      limitWidth
      withBorderBottom={false}
      overlayClassName="z-60"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <p className="font-mono text-sm font-normal leading-[21px] text-text-quaternary mb-4">
          Current owner: {currentOwnerLabel}
        </p>

        <MultiSelect
          id="newOwner"
          name="newOwner"
          value={selectedUserId}
          onChange={(e) => handleUserChange(e.target.value)}
          options={userOptions}
          label="New owner"
          placeholder="Click to search..."
          filterPlaceholder="Search for user"
          onFilter={handleUserSearch}
          singleValue={true}
          loading={isLoadingUsers}
          error={userIdError}
          size="medium"
          emptyMessage="Type to search for a user"
          emptyFilterMessage="No users found"
        />
      </form>
    </Popup>
  )
}

export default ChangeOwnershipModal
