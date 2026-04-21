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
import PlusSVG from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import { AssistantTab } from '@/constants'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import { useVueRouter } from '@/hooks/useVueRouter'
import { goBackAssistants } from '@/pages/assistants/utils/goBackAssistants'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { assistantsStore, userStore } from '@/store'
import { settingsStore } from '@/store/settings'
import { Assistant } from '@/types/entity/assistant'
import toaster from '@/utils/toaster'

import AssistantForm, { AssistantFormRef } from './components/AssistantForm/AssistantForm'
import FormGenAIPopup from './components/AssistantForm/components/FormGenAIPopup'
import AssistantsNavigation from './components/AssistantsNavigation'

const FROM_TEMPLATE_ROUTE = 'new-assistant-from-template'

const NewAssistantPage = () => {
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
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router

  const { id, slug } = route.params
  const isCloning = !!id
  const isFromTemplate = route.name === FROM_TEMPLATE_ROUTE
  const urlParams = {
    name: route.query.name || '',
    description: route.query.description || '',
    systemPrompt: route.query.systemPrompt || '',
  } as Record<string, string>

  const formRef = useRef<AssistantFormRef>(null)
  const [isLoading, setIsLoading] = useState(isCloning || isFromTemplate)
  const [assistantTemplate, setAssistantTemplate] = useState<Assistant | undefined>()
  const [isGenWithAIPopupVisible, setIsGenWithAIPopupVisible] = useState(
    assistantsStore.loadShowNewAssistantAIPopup() && !isCloning && !isFromTemplate
  )

  let title: string
  const submitLabel = 'Save'

  if (isCloning) {
    title = 'Clone Assistant'
  } else if (isFromTemplate) {
    title = 'Create Assistant from Template'
  } else {
    title = 'Create Assistant'
  }

  const handleBack = () => {
    goBackAssistants()
  }

  const buildTemplate = (assistant: Partial<Assistant>): Assistant => {
    return {
      shared: false,
      llm_model_type: '',
      system_prompt: '',
      description: '',
      ...assistant,
      name: '',
      slug: '',
      created_at: '',
      updated_at: '',
      id: '',
      project: userStore.isUserVisibleProject(assistant.project) ? assistant.project : '',
      is_global: false,
      system_prompt_history: [],
      mcp_servers: assistant.mcp_servers ?? [],
      guardrail_assignments: assistant.guardrail_assignments ?? [],
      toolkits: assistant.toolkits?.map((toolkit) => ({
        ...toolkit,
        tools: toolkit.tools.map((tool) => ({
          ...tool,
          settings: null,
        })),
        settings: null,
      })),
    }
  }

  const handleSuccess = () => {
    toaster.info('Assistant has been created successfully!')
    router.push({ name: 'assistants', query: { tab: AssistantTab.ALL } })
  }

  const handleSubmit = async (values, skipValidation = false) => {
    return assistantsStore.createAssistant(values, skipValidation)
  }

  useEffect(() => {
    const fetchAssistantData = async () => {
      setIsLoading(true)
      try {
        let fetchedAssistantTemplate: Assistant | undefined

        if (isCloning && id) {
          fetchedAssistantTemplate = await assistantsStore.getAssistant(id as string)
        } else if (isFromTemplate && slug) {
          fetchedAssistantTemplate = await assistantsStore.getAssistantTemplateBySlug(
            slug as string
          )
        }

        if (fetchedAssistantTemplate) setAssistantTemplate(buildTemplate(fetchedAssistantTemplate))
      } finally {
        setIsLoading(false)
      }
    }

    if (isCloning || isFromTemplate) fetchAssistantData()
  }, [id, slug])

  const finalAssistantTemplate =
    isCloning || isFromTemplate
      ? assistantTemplate
      : {
          ...buildTemplate({
            description: urlParams.description,
            system_prompt: urlParams.systemPrompt,
          }),
          name: urlParams.name,
        }

  return (
    <div className="flex h-full">
      <Sidebar title="Assistants" description="Browse and chat with available AI assistants">
        <AssistantsNavigation />
      </Sidebar>

      <PageLayout
        showBack
        limitWidth
        isLoading={isLoading}
        title={title}
        onBack={handleBack}
        rightContent={
          <div className="flex gap-4">
            {!isCloning && (
              <Button
                type="magical"
                disabled={isLoading}
                onClick={() => setIsGenWithAIPopupVisible(true)}
                data-onboarding="assistant-generate-ai-btn"
              >
                <AIGenerateSVG /> Generate with AI
              </Button>
            )}
            <Button type="secondary" onClick={handleBack}>
              Cancel
            </Button>
            <Button
              type="primary"
              disabled={isLoading}
              onClick={() => formRef.current?.submit()}
              data-onboarding="assistant-save-btn"
            >
              <PlusSVG /> {submitLabel}
            </Button>
          </div>
        }
      >
        <AssistantForm
          ref={formRef}
          isEditing={false}
          assistant={finalAssistantTemplate}
          onSubmit={handleSubmit}
          onSuccess={handleSuccess}
          showNewIntegrationPopup={showNewIntegrationPopup}
        />

        <FormGenAIPopup
          isVisible={isGenWithAIPopupVisible}
          onHide={() => setIsGenWithAIPopupVisible(false)}
          onGenerated={(values) => formRef.current?.addAIGeneratedFields(values)}
        />

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

export default NewAssistantPage
