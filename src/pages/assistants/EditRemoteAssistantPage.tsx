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

import { useEffect, useRef, useState } from 'react'

import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import { ASSISTANT_DETAILS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { goBackAssistants } from '@/pages/assistants/utils/goBackAssistants'
import { assistantsStore } from '@/store'
import { Assistant } from '@/types/entity/assistant'
import { canEdit } from '@/utils/entity'
import toaster from '@/utils/toaster'

import AssistantsNavigation from './components/AssistantsNavigation'
import RemoteAssistantForm, {
  RemoteAssistantFormRef,
  RemoteAssistantFormSchema,
} from './components/RemoteAssistantForm/RemoteAssistantForm'

const EditRemoteAssistantPage = () => {
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router

  const { id } = route.params

  const formRef = useRef<RemoteAssistantFormRef>(null)
  const [assistant, setAssistant] = useState<Assistant | null>(null)
  const [loading, setLoading] = useState(false)
  const [isLoadingAssistant, setIsLoadingAssistant] = useState(true)

  const handleBack = () => {
    goBackAssistants(ASSISTANT_DETAILS)
  }

  const fetchAssistant = async () => {
    setIsLoadingAssistant(true)
    try {
      const fetchedAssistant = await assistantsStore.getAssistant(id as string)
      setAssistant(fetchedAssistant)
    } catch (error: any) {
      console.error('Failed to fetch assistant:', error)
      toaster.error(error.message ?? 'Could not load assistant data.')
      router.push({ name: 'assistants' })
    } finally {
      setIsLoadingAssistant(false)
    }
  }

  const updateRemoteAssistant = async (updatedData: RemoteAssistantFormSchema) => {
    setLoading(true)
    try {
      await assistantsStore.updateRemoteAssistant(id as string, updatedData)
      toaster.info('Assistant has been updated successfully!')
      handleBack()
    } catch (error: any) {
      console.error('Error updating remote assistant:', error)
      if (error.response) {
        toaster.error(`Server error: ${error.response.status} - ${error.response.statusText}`)
      } else {
        toaster.error(`Error updating assistant: ${error.message ?? 'An unknown error occurred'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssistant()
  }, [id])

  if (assistant && !canEdit(assistant)) {
    return (
      <div className="flex h-full">
        <Sidebar title="Assistants" description="Browse and chat with available AI assistants">
          <AssistantsNavigation />
        </Sidebar>
        <PageLayout showBack title="Edit Remote Assistant" onBack={handleBack}>
          <div className="flex mt-5 ml-5">Forbidden</div>
        </PageLayout>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Assistants" description="Browse and chat with available AI assistants">
        <AssistantsNavigation />
      </Sidebar>

      <PageLayout
        showBack
        limitWidth
        isLoading={isLoadingAssistant}
        title="Edit Remote Assistant"
        onBack={handleBack}
        rightContent={
          <div className="flex gap-4">
            <Button type="secondary" onClick={handleBack}>
              Cancel
            </Button>
            <Button disabled={loading && !!assistant} onClick={() => formRef.current?.submit()}>
              Save
            </Button>
          </div>
        }
      >
        {assistant && (
          <RemoteAssistantForm
            isEditing
            ref={formRef}
            assistant={assistant}
            onSubmit={updateRemoteAssistant}
          />
        )}
      </PageLayout>
    </div>
  )
}

export default EditRemoteAssistantPage
