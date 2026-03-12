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

import { useRef, useState } from 'react'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import { useVueRouter } from '@/hooks/useVueRouter'
import { goBackAssistants } from '@/pages/assistants/utils/goBackAssistants'
import { assistantsStore } from '@/store'
import toaster from '@/utils/toaster'

import AssistantsNavigation from './components/AssistantsNavigation'
import RemoteAssistantForm, {
  RemoteAssistantFormRef,
} from './components/RemoteAssistantForm/RemoteAssistantForm'

const NewRemoteAssistantPage = () => {
  const router = useVueRouter()
  const formRef = useRef<RemoteAssistantFormRef>(null)
  const [loading, setLoading] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)

  const handleBack = () => {
    goBackAssistants()
  }

  const createRemoteAssistant = async (assistantData: any) => {
    setLoading(true)
    try {
      await assistantsStore.createRemoteAssistant(assistantData)
      toaster.info('Remote assistant successfully added')
      router.push({ name: 'assistants' })
    } catch (error: any) {
      console.error('Error saving remote assistant:', error)
      if (error.response) {
        const message = error.response.data?.message ?? error.response.statusText
        toaster.error(`Server error: ${error.response.status} - ${message}`)
      } else if (error.request) {
        toaster.error('No response from server. Please check your network connection.')
      } else {
        toaster.error(
          `Error saving remote assistant: ${error.message ?? 'An unknown error occurred'}`
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Assistants" description="Browse and chat with available AI assistants">
        <AssistantsNavigation />
      </Sidebar>

      <PageLayout
        showBack
        limitWidth
        title="Create Remote Assistant"
        onBack={handleBack}
        rightContent={
          <div className="flex gap-4">
            <Button type="secondary" onClick={handleBack}>
              Cancel
            </Button>
            <Button disabled={loading || !isFormValid} onClick={() => formRef.current?.submit()}>
              <PlusIcon /> Save
            </Button>
          </div>
        }
      >
        <RemoteAssistantForm
          ref={formRef}
          onSubmit={createRemoteAssistant}
          onValidityChange={setIsFormValid}
        />
      </PageLayout>
    </div>
  )
}

export default NewRemoteAssistantPage
