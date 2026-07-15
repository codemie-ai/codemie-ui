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

import { useCallback, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import Pagination from '@/components/Pagination'
import Spinner from '@/components/Spinner'
import { useSidebarOffsetClass } from '@/hooks/useSidebarOffsetClass'
import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'
import { workflowsStore } from '@/store/workflows'
import { pluralize } from '@/utils/helpers'
import toaster from '@/utils/toaster'

import WorkflowCard from './WorkflowCard'

const DEFAULT_PER_PAGE = 12

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
  const sidebarOffsetClass = useSidebarOffsetClass()

  const { workflowTemplates, workflowsTemplatesLoading, workflowTemplatesPagination } =
    useSnapshot(workflowsStore)

  const getPageFromURL = useCallback(() => {
    const pageFromQuery = route.query?.page
    const perPageFromQuery = route.query?.per_page

    let pageToLoad = 0
    if (pageFromQuery && typeof pageFromQuery === 'string') {
      const parsed = parseInt(pageFromQuery, 10)
      pageToLoad = !Number.isNaN(parsed) && parsed >= 1 ? parsed - 1 : 0
    }

    let perPageToLoad = DEFAULT_PER_PAGE
    if (perPageFromQuery && typeof perPageFromQuery === 'string') {
      const parsed = parseInt(perPageFromQuery, 10)
      perPageToLoad = !Number.isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_PER_PAGE
    }

    return { page: pageToLoad, perPage: perPageToLoad }
  }, [route.query?.page, route.query?.per_page])

  const updateURL = useCallback(
    (backendPage: number, currentPerPage: number) => {
      const { page: _, per_page: __, ...restQuery } = router.currentRoute.value.query
      const newQuery = { ...restQuery } as Record<string, string>
      if (backendPage > 0) newQuery.page = (backendPage + 1).toString()
      if (currentPerPage !== DEFAULT_PER_PAGE) newQuery.per_page = currentPerPage.toString()
      router.replace({ query: newQuery })
    },
    [router]
  )

  useEffect(() => {
    if (route.path.includes('/workflows/templates')) {
      const { page, perPage } = getPageFromURL()
      const name = (route.query?.name as string) || workflowsStore.workflowsFilters.name || ''
      workflowsStore.indexWorkflowTemplates(page, perPage, name).catch(() => {
        toaster.error('Failed to load workflow templates')
      })
    }
  }, [route.path, route.query?.name])

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

  const setPage = async (page = 0, perPage = DEFAULT_PER_PAGE) => {
    try {
      await workflowsStore.indexWorkflowTemplates(page, perPage)
      updateURL(page, perPage)
    } catch {
      toaster.error('Failed to load workflow templates')
    }
  }

  const viewWorkflowTemplate = (template: WorkflowTemplate) => {
    router.push({ name: 'view-workflow-template', params: { slug: template.slug } })
  }

  const navigateToCreateWFFromTemplate = (workflow: WorkflowTemplate) => {
    router.push({
      name: 'new-workflow-from-template',
      params: { slug: workflow.slug },
    })
  }

  if (workflowsTemplatesLoading && !workflowTemplates?.length) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    )
  }

  if (!workflowTemplates?.length) {
    return (
      <div className="flex justify-center m-40">
        <h2>No templates found.</h2>
      </div>
    )
  }

  return (
    <>
      <section>
        <div className="flex-row px-1 w-full text-xs text-quaternary font-semibold">
          {workflowTemplatesPagination.totalCount}{' '}
          {pluralize(workflowTemplatesPagination.totalCount, 'template').toUpperCase()}
        </div>
        <ul
          role="list"
          aria-label="Workflow templates"
          className="grid grid-cols-1 gap-2.5 justify-items-center min-[1140px]:grid-cols-2 min-[1540px]:grid-cols-3 mt-4 list-none p-0 m-0"
        >
          {workflowTemplates.map((workflow) => (
            <li key={workflow.id} className="w-full">
              <WorkflowCard
                isTemplate
                workflow={workflow}
                onViewWorkflowTemplate={viewWorkflowTemplate}
                onCreateFromWorkflowTemplate={navigateToCreateWFFromTemplate}
              />
            </li>
          ))}
        </ul>
      </section>

      {workflowTemplates.length > 0 && (
        <section>
          <Pagination
            className={`z-[10] fixed bottom-0 right-0 transition-all duration-150 bg-surface-base-primary px-6 pt-[20px] pb-[14px] left-0 ${sidebarOffsetClass}`}
            currentPage={workflowTemplatesPagination.page}
            totalPages={workflowTemplatesPagination.totalPages}
            perPage={workflowTemplatesPagination.perPage}
            setPage={setPage}
          />
        </section>
      )}
    </>
  )
}

export default WorkflowTemplates
