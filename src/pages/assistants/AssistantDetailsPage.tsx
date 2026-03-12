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

import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { AssistantType } from '@/constants/assistants'
import { ASSISTANT_DETAILS } from '@/constants/routes'
import { history } from '@/hooks/appLevel/useHistoryStack'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import { useVueRouter } from '@/hooks/useVueRouter'
import AssistantsNavigation from '@/pages/assistants/components/AssistantsNavigation'
import ExportAssistantPopup from '@/pages/assistants/components/ExportAssistantPopup'
import { goBackAssistants } from '@/pages/assistants/utils/goBackAssistants'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { assistantsStore, chatsStore } from '@/store'
import { Assistant } from '@/types/entity/assistant'
import toaster from '@/utils/toaster'

import AssistantDetails from './components/AssistantDetails/AssistantDetails'
import RemoteAssistantDetails from './components/RemoteAssistantDetails/RemoteAssistantDetails'

interface AssistantDetailsPageProps {
  isTemplate?: boolean
}

const AssistantDetailsPage = ({ isTemplate }: AssistantDetailsPageProps) => {
  const {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess: baseOnIntegrationSuccess,
  } = useNewIntegrationPopup()

  const [pendingSuccessCallback, setPendingSuccessCallback] = useState<(() => void) | null>(null)
  const [showExportPopup, setShowExportPopup] = useState(false)

  const onNewIntegration = (project: string, type: string, onSuccess: () => void) => {
    setPendingSuccessCallback(() => onSuccess)
    showNewIntegrationPopup(project, type)
  }

  const handleIntegrationSuccess = () => {
    baseOnIntegrationSuccess()
    if (pendingSuccessCallback) {
      pendingSuccessCallback()
      setPendingSuccessCallback(null)
    }
  }
  const router = useVueRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [assistant, setAssistant] = useState<Assistant | null>(null)
  const assistantId = router.currentRoute.value.params.id as string

  const createChat = async (assistant) => {
    const chat = await chatsStore.createChat(assistant.id, assistant.name, false)
    assistantsStore.updateRecentAssistants(assistant)
    router.push({ name: 'chats', params: { id: chat.id } })
  }

  const handleBack = () => {
    // Check if the immediate previous route in history is an assistant-details
    // with a different ID (e.g., navigated from parent orchestrator to subassistant)
    const { currentIndex } = history
    const prevRoute = history.stack[currentIndex - 1]

    // Only navigate to previous assistant-details if it's the IMMEDIATE previous route
    if (
      prevRoute?.name === ASSISTANT_DETAILS &&
      prevRoute?.params?.id &&
      prevRoute.params.id !== assistantId
    ) {
      // The immediate previous route is an assistant-details with different ID
      // Use router.back() to properly navigate back in history
      router.back()
      return
    }

    // Otherwise, use default back navigation
    goBackAssistants()
  }

  const handleExportAssistant = () => {
    setShowExportPopup(true)
  }

  const handleHideExportPopup = () => {
    setShowExportPopup(false)
  }

  const loadAssistant = async () => {
    setIsLoading(true)

    try {
      if (assistantId) {
        const assistantData = isTemplate
          ? await assistantsStore.getAssistantTemplateBySlug(assistantId)
          : await assistantsStore.getAssistant(assistantId)
        setAssistant(assistantData)
      }
    } catch (error) {
      console.error('Error loading assistant:', error)
      toaster.error('Failed to load assistant details')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAssistant()
  }, [assistantId])

  return (
    <div className="flex h-full">
      <Sidebar title="Assistants" description="Browse and chat with available AI assistants">
        <AssistantsNavigation />
      </Sidebar>

      <PageLayout title="Assistant Details" onBack={handleBack}>
        {isLoading && (
          <div className="flex justify-center m-40">
            <Spinner />
          </div>
        )}

        {assistant?.type === AssistantType.A2A && !isLoading ? (
          <RemoteAssistantDetails
            assistant={assistant}
            createChat={createChat}
            loadAssistant={loadAssistant}
          />
        ) : (
          assistant && (
            <AssistantDetails
              isTemplate={isTemplate}
              assistant={assistant}
              createChat={createChat}
              onNewIntegration={onNewIntegration}
              exportAssistant={handleExportAssistant}
              loadAssistant={loadAssistant}
            />
          )
        )}

        <NewIntegrationPopup
          visible={showNewIntegration}
          onHide={hideNewIntegrationPopup}
          onSuccess={handleIntegrationSuccess}
          project={selectedProject}
          credentialType={selectedCredentialType}
        />

        <ExportAssistantPopup
          visible={showExportPopup}
          onHide={handleHideExportPopup}
          assistant={assistant}
        />

        <NewIntegrationPopup
          visible={showNewIntegration}
          onHide={hideNewIntegrationPopup}
          onSuccess={handleIntegrationSuccess}
          project={selectedProject}
          credentialType={selectedCredentialType}
        />
      </PageLayout>
    </div>
  )
}

export default AssistantDetailsPage
