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

import { proxy } from 'valtio'

import {
  WORKFLOW_LIST_SCOPE,
  INITIAL_WORKFLOWS_PAGINATION,
  INITIAL_WORKFLOWS_FILTERS,
} from '@/pages/workflows/constants'
import { Pagination } from '@/types/common'
import { Workflow, WorkflowTemplate, WorkflowExecution } from '@/types/entity/workflow'
import { CustomNodeSchemaResponse } from '@/types/workflowEditor/configuration'
import api from '@/utils/api'
import { cleanObject } from '@/utils/helpers'
import { makeCleanObject } from '@/utils/utils'

export const MAX_RECENT_WORKFLOWS = 3

export const ERROR_FORMAT_STRING = 'string' as const
export const ERROR_FORMAT_JSON = 'json' as const

export type ErrorFormat = typeof ERROR_FORMAT_STRING | typeof ERROR_FORMAT_JSON

interface WorkflowsFilters {
  [key: string]: any
}

interface WorkflowsStore {
  workflows: Workflow[]
  workflowsScope: string
  workflowsPagination: Pagination
  workflowsFilters: WorkflowsFilters
  workflowsLoading: boolean
  workflowsTemplatesLoading: boolean
  workflowTemplates: WorkflowTemplate[]
  workflowTemplate: WorkflowTemplate | null
  workflowTemplateLoading: boolean
  currentWorkflow: Workflow | null
  currentWorkflowLoading: boolean
  currentWorkflowError: string | null
  workflowExecutions: WorkflowExecution[]
  workflowExecutionsPagination: Pagination
  workflowExecutionsLoading: boolean
  recentWorkflows: Workflow[]
  indexWorkflows: (page?: number, perPage?: number) => Promise<void>
  setWorkflowsFilters: (filters: WorkflowsFilters) => void
  setWorkflowsScope: (scope: string) => void
  clearWorkflowsFilters: () => void
  setWorkflowsPagination: (page?: number, perPage?: number) => void
  fetchWorkflow: (id: string | number) => Promise<void>
  getWorkflow: (id: string | number) => Promise<Workflow>
  indexWorkflowTemplates: () => Promise<void>
  getWorkflowTemplate: (slug: string) => Promise<void>
  getWorkflowTemplateBySlug: (slug: string) => Promise<WorkflowTemplate>
  getWorkflowOptions: (params?: { search?: string; project?: string }) => Promise<Workflow>
  createWorkflow: (values: any, errorFormat?: ErrorFormat) => Promise<any>
  updateWorkflow: (id: string | number, values: any, errorFormat?: ErrorFormat) => Promise<any>
  deleteWorkflow: (id: string | number) => Promise<void>
  getWorkflowDiagram: (payload: any) => Promise<any>
  clearCurrentWorkflow: () => void
  createWorkflowExecution: (
    workflowId: string | number,
    message: string,
    fileNames?: string[]
  ) => Promise<any>
  loadWorkflowExecutions: (
    workflowId: string | number,
    page?: number,
    perPage?: number
  ) => Promise<void>
  exportWorkflowExecution: (
    workflow: Workflow,
    execution: WorkflowExecution,
    options: { output_format: string; combined: boolean }
  ) => Promise<void>
  getRecentWorkflows: () => Promise<void>
  updateRecentWorkflows: (workflow: Workflow) => void
  deleteRecentWorkflow: (id: string) => void
  getCustomNodeSchema: (customNodeId: string) => Promise<CustomNodeSchemaResponse | null>
}

export const workflowsStore = proxy<WorkflowsStore>({
  workflows: [],
  workflowsScope: WORKFLOW_LIST_SCOPE.ALL,
  workflowsPagination: { ...INITIAL_WORKFLOWS_PAGINATION },
  workflowsFilters: { ...INITIAL_WORKFLOWS_FILTERS },
  workflowsLoading: true,
  workflowsTemplatesLoading: true,
  workflowTemplates: [],
  workflowTemplate: null,
  workflowTemplateLoading: false,
  currentWorkflow: null,
  currentWorkflowLoading: false,
  currentWorkflowError: null,
  workflowExecutions: [],
  workflowExecutionsPagination: { page: 0, perPage: 10, totalPages: 0, totalCount: 0 },
  workflowExecutionsLoading: false,
  recentWorkflows: [],

  async indexWorkflows(
    this: WorkflowsStore,
    page = this.workflowsPagination.page,
    perPage = this.workflowsPagination.perPage
  ) {
    this.workflowsLoading = true
    const filterString = encodeURIComponent(JSON.stringify(makeCleanObject(this.workflowsFilters)))
    const isUserScope = this.workflowsScope === WORKFLOW_LIST_SCOPE.MY

    const url = `v1/workflows?filter_by_user=${isUserScope}&page=${page}&per_page=${perPage}&filters=${filterString}`

    try {
      const response = await api.get(url).then((res) => res.json())
      const { data, pagination } = response

      this.workflows = data
      this.workflowsPagination = {
        page: pagination.page,
        perPage: pagination.per_page,
        totalPages: pagination.pages,
        totalCount: pagination.total,
      }
    } finally {
      this.workflowsLoading = false
    }
  },

  setWorkflowsFilters(filters = {}) {
    this.workflowsFilters = { ...this.workflowsFilters, ...filters }
  },

  setWorkflowsScope(scope = WORKFLOW_LIST_SCOPE.ALL) {
    this.workflowsScope = scope
  },

  clearWorkflowsFilters() {
    this.workflowsFilters = { ...INITIAL_WORKFLOWS_FILTERS }
    this.workflowsPagination = { ...INITIAL_WORKFLOWS_PAGINATION }
  },

  setWorkflowsPagination(
    this: WorkflowsStore,
    page = this.workflowsPagination.page,
    perPage = this.workflowsPagination.perPage
  ) {
    this.workflowsPagination.page = page
    this.workflowsPagination.perPage = perPage
  },

  async fetchWorkflow(id: string | number) {
    this.currentWorkflowLoading = true
    this.currentWorkflowError = null
    try {
      const response = await api.get(`v1/workflows/id/${id}`)
      const data = await response.json()
      this.currentWorkflow = data
    } catch (error) {
      this.currentWorkflowError = error instanceof Error ? error.message : 'Failed to load workflow'
      throw error
    } finally {
      this.currentWorkflowLoading = false
    }
  },

  async getWorkflow(id: string | number): Promise<Workflow> {
    const response = await api.get(`v1/workflows/id/${id}`)
    return response.json()
  },

  async indexWorkflowTemplates() {
    this.workflowsTemplatesLoading = true
    try {
      const response = await api.get('v1/workflows/prebuilt')
      const data = await response.json()
      this.workflowTemplates = data
    } finally {
      this.workflowsTemplatesLoading = false
    }
  },

  async getWorkflowTemplate(slug: string): Promise<void> {
    this.workflowTemplateLoading = true
    try {
      const response = await api.get(`v1/workflows/prebuilt/${slug}`)
      const data = await response.json()
      this.workflowTemplate = data
    } finally {
      this.workflowTemplateLoading = false
    }
  },

  async getWorkflowOptions({ search, project } = {}) {
    const filters = {
      search,
      project,
    }

    const url =
      `v1/workflows?per_page=12` +
      `&filters=${encodeURIComponent(JSON.stringify(cleanObject(filters)))}`

    return api
      .get(url)
      .then((response) => response.json())
      .then((response) => response.data)
  },

  async getWorkflowTemplateBySlug(slug: string): Promise<WorkflowTemplate> {
    const response = await api.get(`v1/workflows/prebuilt/${slug}`)
    return response.json()
  },

  async createWorkflow(values: any, errorFormat?: ErrorFormat) {
    let url = 'v1/workflows'
    if (errorFormat) {
      url += `?error_format=${errorFormat}`
    }
    const options = errorFormat === ERROR_FORMAT_JSON ? { skipErrorHandling: true } : {}
    return api.post(url, values, options)
  },

  async updateWorkflow(id: string | number, values: any, errorFormat?: ErrorFormat) {
    let url = `v1/workflows/${id}`
    if (errorFormat) {
      url += `?error_format=${errorFormat}`
    }
    const options = errorFormat === ERROR_FORMAT_JSON ? { skipErrorHandling: true } : {}
    return api.put(url, values, options)
  },

  async deleteWorkflow(id: string | number) {
    await api.delete(`v1/workflows/${id}`)
  },

  async getWorkflowDiagram(payload: any) {
    return api.post('v1/workflows/diagram', payload)
  },

  clearCurrentWorkflow() {
    this.currentWorkflow = null
    this.currentWorkflowLoading = false
    this.currentWorkflowError = null
  },

  async createWorkflowExecution(
    workflowId: string | number,
    message: string,
    fileNames: string[] = []
  ) {
    const response = await api.post(`v1/workflows/${workflowId}/executions`, {
      user_input: message,
      file_name: fileNames[0] ?? null,
    })
    const execution = await response.json()
    this.workflowExecutions.unshift(execution)
    return execution
  },

  async loadWorkflowExecutions(workflowId: string | number, page = 0, perPage = 10) {
    this.workflowExecutionsLoading = true
    try {
      const response = await api.get(
        `v1/workflows/${workflowId}/executions?page=${page}&per_page=${perPage}`
      )
      const result = await response.json()
      const { data, pagination } = result

      this.workflowExecutions = data
      this.workflowExecutionsPagination = {
        page: pagination.page,
        perPage: pagination.per_page,
        totalPages: pagination.pages,
        totalCount: pagination.total,
      }
    } finally {
      this.workflowExecutionsLoading = false
    }
  },

  async exportWorkflowExecution(
    workflow: Workflow,
    execution: WorkflowExecution,
    options: { output_format: string; combined: boolean }
  ) {
    const response = await api.get(
      `v1/workflows/${workflow.id}/executions/${execution.execution_id}/export?output_format=${options.output_format}&combined=${options.combined}`,
      { responseType: 'blob' }
    )

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob) // nosonar
    const link = document.createElement('a')
    link.href = url
    link.download = `${workflow.name}_${execution.execution_id}.${options.output_format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link) // nosonar
    window.URL.revokeObjectURL(url) // nosonar
  },

  async getRecentWorkflows(this: WorkflowsStore) {
    try {
      const response = await api.get(`v1/workflows/recent?limit=${MAX_RECENT_WORKFLOWS}`)
      const data = await response.json()
      this.recentWorkflows = data
    } catch (error) {
      console.error('Failed to fetch recent workflows:', error)
      this.recentWorkflows = []
    }
  },

  updateRecentWorkflows(this: WorkflowsStore, workflow: Workflow) {
    const present = this.recentWorkflows.find((item) => item.id === workflow.id)

    if (present) {
      const index = this.recentWorkflows.indexOf(present)
      this.recentWorkflows.splice(index, 1)
      this.recentWorkflows.unshift({
        id: workflow.id,
        slug: workflow.slug,
        name: workflow.name,
        icon_url: workflow.icon_url,
        yaml_config: workflow.yaml_config,
      })
    } else {
      this.recentWorkflows.unshift({
        id: workflow.id,
        slug: workflow.slug,
        name: workflow.name,
        icon_url: workflow.icon_url,
        yaml_config: workflow.yaml_config,
      })
    }

    if (this.recentWorkflows.length > MAX_RECENT_WORKFLOWS) {
      this.recentWorkflows.pop()
    }
  },

  deleteRecentWorkflow(this: WorkflowsStore, id: string) {
    const recentWorkflow = this.recentWorkflows.find((item) => item.id === id)
    if (recentWorkflow) {
      this.recentWorkflows.splice(this.recentWorkflows.indexOf(recentWorkflow), 1)
    }
  },

  async getCustomNodeSchema(customNodeId: string): Promise<CustomNodeSchemaResponse | null> {
    const apiNodeId = customNodeId.replace(/_node$/, '') // 'state_processor_node' -> 'state_processor'

    const response = await api.get(`v1/workflows/custom-nodes/${apiNodeId}/schema`, {
      skipErrorHandling: true,
    })
    return response.json()
  },
})
