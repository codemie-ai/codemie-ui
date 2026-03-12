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

import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'
import { goBackWorkflows } from '@/pages/workflows/utils/goBackWorkflows'
import { workflowsStore } from '@/store/workflows'

import ViewWorkflowTemplate from './components/ViewWorkflowTemplate'
import WorkflowsNavigation from './components/WorkflowsNavigation'

interface WorkflowTemplate {
  id: string
  slug: string
  name: string
  description?: string
  project?: string
  yaml_config?: string
  video_link?: string
  [key: string]: any
}

const ViewWorkflowTemplatePage: React.FC = () => {
  const router = useVueRouter()
  const route = useVueRoute()
  const slug = route.params.slug as string
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTemplate = async () => {
      setIsLoading(true)
      try {
        const data = await workflowsStore.getWorkflowTemplateBySlug(slug)
        setTemplate(data)
      } finally {
        setIsLoading(false)
      }
    }

    loadTemplate()
  }, [slug])

  const navigateToCreateWorkflow = () => {
    router.push({
      name: 'new-workflow-from-template',
      params: { slug: template?.slug },
    })
  }

  const handleBack = () => {
    goBackWorkflows()
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Workflows" description="Browse and run available AI-powered workflows">
        <WorkflowsNavigation />
      </Sidebar>

      <PageLayout
        showBack
        limitWidth
        title="Workflow Template Details"
        onBack={handleBack}
        rightContent={
          <Button type="primary" onClick={navigateToCreateWorkflow}>
            <PlusSvg />
            Create Workflow
          </Button>
        }
      >
        <div className="px-6 py-8">
          {isLoading && (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          )}

          {!isLoading && template && <ViewWorkflowTemplate template={template} />}

          {!isLoading && !template && (
            <div className="flex justify-center p-8">
              <p className="text-text-quaternary">Template not found</p>
            </div>
          )}
        </div>
      </PageLayout>
    </div>
  )
}

export default ViewWorkflowTemplatePage
