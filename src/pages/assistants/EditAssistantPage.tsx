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

import AIGenerateSVG from '@/assets/icons/ai-generate.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import { ASSISTANT_DETAILS } from '@/constants/routes'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import { useVueRouter } from '@/hooks/useVueRouter'
import { goBackAssistants } from '@/pages/assistants/utils/goBackAssistants'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { assistantsStore } from '@/store'
import { settingsStore } from '@/store/settings'
import { Assistant } from '@/types/entity/assistant'
import toaster from '@/utils/toaster'

import AssistantForm, { AssistantFormRef } from './components/AssistantForm/AssistantForm'
import AssistantsNavigation from './components/AssistantsNavigation'

const EditAssistantPage = () => {
  const {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess,
  } = useNewIntegrationPopup(async () => {
    // Refresh settings when integration is created
    await settingsStore.indexSettings()
  })
  const [assistant, setAssistant] = useState<Assistant | null>(null)
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router

  const { id } = route.params

  const formRef = useRef<AssistantFormRef>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleBack = () => {
    goBackAssistants(ASSISTANT_DETAILS)
  }

  const handleSuccess = () => {
    toaster.info('Assistant has been updated successfully!')
    handleBack()
  }

  const handleSubmit = async (values, skipValidation = false) => {
    return assistantsStore.updateAssistant(id as string, values, skipValidation)
  }

  useEffect(() => {
    const fetchAssistantData = async () => {
      setIsLoading(true)
      try {
        const assistant = await assistantsStore.getAssistant(id as string)
        setAssistant(assistant)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssistantData()
  }, [id])

  return (
    <div className="flex h-full">
      <Sidebar title="Assistants" description="Browse and chat with available AI assistants">
        <AssistantsNavigation />
      </Sidebar>

      <PageLayout
        showBack
        limitWidth
        isLoading={isLoading}
        title="Edit Assistant"
        onBack={handleBack}
        rightContent={
          <div className="flex gap-4">
            <Button
              type="magical"
              disabled={isLoading}
              onClick={() => formRef.current?.handleRefineWithAI()}
            >
              <AIGenerateSVG /> Refine with AI
            </Button>
            <Button type="secondary" onClick={handleBack}>
              Cancel
            </Button>
            <Button type="primary" disabled={isLoading} onClick={() => formRef.current?.submit()}>
              Save
            </Button>
          </div>
        }
      >
        {!isLoading && assistant && (
          <AssistantForm
            isEditing
            ref={formRef}
            assistant={assistant}
            onSubmit={handleSubmit}
            onSuccess={handleSuccess}
            showNewIntegrationPopup={showNewIntegrationPopup}
          />
        )}

        <NewIntegrationPopup
          visible={showNewIntegration}
          onHide={hideNewIntegrationPopup}
          onSuccess={onIntegrationSuccess}
          project={selectedProject}
          credentialType={selectedCredentialType}
        />
      </PageLayout>
    </div>
  )
}

export default EditAssistantPage
