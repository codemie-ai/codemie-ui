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

import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import Spinner from '@/components/Spinner'
import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'
import { workflowsStore } from '@/store/workflows'
import { pluralize } from '@/utils/helpers'

import WorkflowCard from './WorkflowCard'

export interface WorkflowTemplate {
  id: number | string
  slug: string
  name: string
  description?: string
  icon_url?: string
  created_by?: {
    name?: string
    username?: string
    user_id?: string
    id?: string
  }
  categories?: string[]
}

const WorkflowTemplates: React.FC = () => {
  const router = useVueRouter()
  const route = useVueRoute()

  const { workflowTemplates, workflowsTemplatesLoading, workflowsFilters } =
    useSnapshot(workflowsStore)

  const filteredTemplates = useMemo(() => {
    return workflowTemplates.filter((template) => {
      if (
        workflowsFilters.name &&
        !template.name.toLowerCase().includes(String(workflowsFilters.name).toLowerCase())
      ) {
        return false
      }
      if (
        workflowsFilters.created_by &&
        template.created_by?.name !== workflowsFilters.created_by &&
        template.created_by?.username !== workflowsFilters.created_by
      ) {
        return false
      }
      return true
    })
  }, [workflowTemplates, workflowsFilters])

  useEffect(() => {
    workflowsStore.indexWorkflowTemplates()
  }, [])

  useEffect(() => {
    if (route.path.includes('/workflows/templates')) {
      workflowsStore.indexWorkflowTemplates()
    }
  }, [route.path])

  useEffect(() => {
    const checkQueryForTemplate = () => {
      const templateSlug = route.query?.template as string | undefined
      if (templateSlug) {
        const workflow = workflowTemplates.find((template) => template.slug === templateSlug)
        if (workflow) {
          viewWorkflowTemplate(workflow)
        }
      }
    }

    checkQueryForTemplate()
  }, [route.query, workflowTemplates])

  const viewWorkflowTemplate = (template: WorkflowTemplate) => {
    router.push({ name: 'view-workflow-template', params: { slug: template.slug } })
  }

  const navigateToCreateWFFromTemplate = (workflow: WorkflowTemplate) => {
    router.push({
      name: 'new-workflow-from-template',
      params: { slug: workflow.slug },
    })
  }

  if (workflowsTemplatesLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    )
  }

  if (!filteredTemplates?.length) {
    return (
      <div className="flex justify-center m-40">
        <h2>No templates found.</h2>
      </div>
    )
  }

  return (
    <section>
      <div className="flex-row px-1 w-full text-xs text-quaternary font-semibold">
        {filteredTemplates.length} {pluralize(filteredTemplates.length, 'template').toUpperCase()}
      </div>
      <div className="grid grid-cols-1 gap-2.5 justify-items-center min-[1140px]:grid-cols-2 min-[1540px]:grid-cols-3 mt-4">
        {filteredTemplates.map((workflow) => (
          <WorkflowCard
            key={workflow.slug}
            isTemplate
            workflow={workflow}
            onViewWorkflowTemplate={viewWorkflowTemplate}
            onCreateFromWorkflowTemplate={navigateToCreateWFFromTemplate}
          />
        ))}
      </div>
    </section>
  )
}

export default WorkflowTemplates
