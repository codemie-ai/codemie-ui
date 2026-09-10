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

import { FC, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'

import MultiSelect from '@/components/form/MultiSelect'
import Select from '@/components/form/Select'
import Popup from '@/components/Popup'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { userStore } from '@/store/user'
import { ProjectRole } from '@/types/entity/project'
import toaster from '@/utils/toaster'

interface AddUserModalProps {
  visible: boolean
  onHide: () => void
  onSubmit: (data: AddUserFormData) => Promise<void>
}

export interface AddUserFormData {
  userIdentifier: string
  role: string
}

const MIN_SEARCH_LENGTH = 1
const SEARCH_RESULTS_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 500

const ERROR_MESSAGES = {
  SELECT_USER: 'Please select a user',
  ADD_USER_FAILED: 'Failed to add user',
}

const ROLE_OPTIONS = [
  { label: 'User', value: ProjectRole.USER },
  { label: 'Project Admin', value: ProjectRole.ADMINISTRATOR },
]

const AddUserModal: FC<AddUserModalProps> = ({ visible, onHide, onSubmit }) => {
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm()

  const [userIdError, setUserIdError] = useState('')
  const [userOptions, setUserOptions] = useState<Array<{ label: string; value: string }>>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [role, setRole] = useState<string>(ProjectRole.USER)
  const [userQuery, setUserQuery] = useState('')

  // Guards against a slow earlier request overwriting a newer one's results.
  // The debounce timer itself is owned by useDebouncedApply.
  const requestIdRef = useRef(0)

  const resetFormState = useCallback(() => {
    requestIdRef.current += 1
    setIsLoadingUsers(false)
    reset()
    setSelectedUserId('')
    setUserOptions([])
    setUserIdError('')
    setRole(ProjectRole.USER)
    setUserQuery('')
  }, [reset])

  const runSearch = useCallback(async (query: string) => {
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    setIsLoadingUsers(true)
    try {
      const users = await userStore.searchUsers(query, SEARCH_RESULTS_LIMIT)
      if (requestId !== requestIdRef.current) return
      setUserOptions(users.map((u) => ({ label: `${u.name} (${u.email})`, value: u.id })))
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

    // Too short to search: drop the panel and invalidate any in-flight request
    // straight away rather than waiting out the debounce window.
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

  const handleUserChange = useCallback((value: string | string[] | null) => {
    if (!value) {
      setSelectedUserId('')
      setUserIdError('')
      return
    }

    const userId = Array.isArray(value) ? value[0] : value
    setSelectedUserId(userId || '')
    setUserIdError('')
  }, [])

  const handleFormSubmit = async () => {
    if (!selectedUserId) {
      setUserIdError(ERROR_MESSAGES.SELECT_USER)
      return
    }

    await onSubmit({ userIdentifier: selectedUserId, role })
    resetFormState()
  }

  const handleModalHide = () => {
    resetFormState()
    onHide()
  }

  return (
    <>
      <Popup
        visible={visible}
        onHide={handleModalHide}
        header="Add User to Project"
        onSubmit={handleSubmit(handleFormSubmit)}
        submitText="Add"
        submitDisabled={isSubmitting || !selectedUserId}
        cancelText="Cancel"
        limitWidth
        withBorderBottom={false}
        overlayClassName="z-60"
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <p className="font-mono text-sm font-normal leading-[21px] text-text-quaternary mb-4">
            Invite a teammate to this project.
          </p>

          <MultiSelect
            id="userIdentifier"
            name="userIdentifier"
            value={selectedUserId}
            onChange={(e) => handleUserChange(e.target.value)}
            options={userOptions}
            label="User"
            placeholder="Click to search..."
            filterPlaceholder="Search for user"
            onFilter={handleUserSearch}
            singleValue={true}
            loading={isLoadingUsers}
            error={userIdError}
            size="medium"
          />

          <div className="!mt-6">
            <Select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.value)}
              options={ROLE_OPTIONS}
              label="Role"
            />
            <p className="font-mono text-xs font-normal leading-none text-text-tertiary mt-2">
              Project Admin allows managing project settings & team access.
            </p>
          </div>
        </form>
      </Popup>
    </>
  )
}

export default AddUserModal
