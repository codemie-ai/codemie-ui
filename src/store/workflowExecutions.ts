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

import { Pagination, PaginatedResponse } from '@/types/common'
import { Thought } from '@/types/entity'
import {
  Workflow,
  WorkflowExecution,
  WorkflowExecutionState,
  CreateWorkflowExecutionRequest,
  UpdateWorkflowExecutionOutputRequest,
  RequestWorkflowExecutionOutputChangeRequest,
  ExportWorkflowExecutionOptions,
} from '@/types/entity/workflow'
import api from '@/utils/api'
import { formatDate, sleep, FILE_DATE_FORMAT } from '@/utils/helpers'
import toaster from '@/utils/toaster'

import { mapPagination } from './utils/workflowExecutions'
import { workflowsStore } from './workflows'

const DEFAULT_PER_PAGE = 10
const EXECUTIONS_INITIAL_LOAD = 15
const EXECUTIONS_LOAD_MORE = 10
const RESUME_EXECUTION_TIMEOUT = 2000

interface WorkflowExecutionsStoreType {
  isWorkflowLoading: boolean
  workflow: Workflow | null

  isExecutionLoading: boolean
  execution: WorkflowExecution | null
  executionStatesThoughts: Thought[]
  executionStates: WorkflowExecutionState[]
  executionStatesPagination: Pagination

  executions: WorkflowExecution[]
  executionsPagination: Pagination
  isLoadingMoreExecutions: boolean
  hasMoreExecutions: boolean

  getWorkflow: (workflowId: string) => Promise<void>

  loadWorkflowExecutions: (
    workflowId: string,
    page?: number,
    perPage?: number,
    append?: boolean
  ) => Promise<WorkflowExecution[]>

  getExecutions: (workflowId: string) => Promise<WorkflowExecution[]>
  loadMoreExecutions: (workflowId: string) => Promise<void>
  removeExecution: () => void

  getExecutionStates: (
    workflowId: string,
    executionId: string,
    page?: number,
    perPage?: number,
    ignoreErrors?: boolean
  ) => Promise<WorkflowExecutionState[]>

  loadWorkflowExecutionOutput: (
    workflowId: string,
    executionId: string,
    historyItemIds: string[],
    force?: boolean
  ) => Promise<Thought[]>

  loadWorkflowExecutionOutputAll: (workflowId: string, executionId: string) => Promise<void>

  clearCurrentExecutionHistory: () => void

  getExecution: (workflowId: string, id: string, skipErrors?: boolean) => Promise<WorkflowExecution>

  getWorkflowExecutionStateOutput: (
    workflowId: string,
    executionId: string,
    stateId: string
  ) => Promise<string>

  createWorkflowExecution: (
    workflowId: string,
    message: string,
    fileNames?: string[]
  ) => Promise<WorkflowExecution>

  abortWorkflowExecution: (workflowId: string, executionId: string) => Promise<Response>

  exportWorkflowExecution: (
    workflow: Workflow,
    execution: WorkflowExecution,
    options: ExportWorkflowExecutionOptions
  ) => Promise<void>

  resumeWorkflowExecution: (workflowId: string, executionId: string) => Promise<Response>

  updateWorkflowExecutionStateOutput: (
    workflowId: string,
    executionId: string,
    stateId: string,
    newOutput: string
  ) => Promise<any>

  requestWorkflowExecutionStateOutputChange: (
    workflowId: string,
    executionId: string,
    originalOutput: string,
    request: string
  ) => Promise<any>

  deleteWorkflowExecution: (workflowId: string, executionId: string) => Promise<void>

  clearWorkflowExecutions: (workflowId: string) => Promise<void>

  updateExecutionList: () => void

  setExecutionStatesPagination: (newPagination: Partial<Pagination>) => void

  getStateThought: (thoughtId: string) => Thought | undefined
}

export const workflowExecutionsStore = proxy<WorkflowExecutionsStoreType>({
  isWorkflowLoading: false,
  workflow: null,

  executions: [],
  executionsPagination: {
    page: 0,
    perPage: 0,
    totalPages: 0,
    totalCount: 0,
  },
  isLoadingMoreExecutions: false,
  hasMoreExecutions: true,

  isExecutionLoading: false,
  execution: null,
  executionStatesThoughts: [],
  executionStates: [],
  executionStatesPagination: {
    page: 0,
    perPage: 0,
    totalPages: 0,
    totalCount: 0,
  },

  async getWorkflow(workflowId) {
    try {
      this.isWorkflowLoading = true
      const workflow = await workflowsStore.getWorkflow(workflowId)
      this.workflow = workflow
    } finally {
      this.isWorkflowLoading = false
    }
  },

  setExecutionStatesPagination(newPagination) {
    this.executionStatesPagination = {
      ...this.executionStatesPagination,
      ...newPagination,
    }
  },

  removeExecution() {
    this.execution = null
  },

  /**
   * Load paginated list of workflow executions
   * @param workflowId - The workflow ID
   * @param page - Page number (default: current page from pagination state)
   * @param perPage - Items per page (default: 10)
   * @param append - If true, append to existing executions; if false, replace (default: false)
   * @returns Array of workflow executions
   */
  async loadWorkflowExecutions(workflowId, page, perPage = DEFAULT_PER_PAGE, append = false) {
    try {
      const response = await api.get(
        `v1/workflows/${workflowId}/executions?page=${page ?? 0}&per_page=${perPage}`
      )

      if (response.status !== 200) {
        throw new Error('Failed to load workflow executions')
      }

      const result: PaginatedResponse<WorkflowExecution> = await response.json()
      const { data, pagination } = result

      if (append) {
        this.executions = [...this.executions, ...data]
      } else {
        this.executions = data
      }

      this.executionsPagination = mapPagination(pagination)
      this.hasMoreExecutions = pagination.page < pagination.pages - 1

      return data
    } catch (error) {
      console.error('Error loading workflow executions:', error)
      throw error
    }
  },

  async getExecutions(workflowId) {
    this.hasMoreExecutions = true
    return this.loadWorkflowExecutions(workflowId, 0, EXECUTIONS_INITIAL_LOAD)
  },

  async loadMoreExecutions(workflowId) {
    if (this.isLoadingMoreExecutions || !this.hasMoreExecutions) {
      return
    }

    this.isLoadingMoreExecutions = true

    try {
      const nextPage = this.executionsPagination.page + 1
      await this.loadWorkflowExecutions(workflowId, nextPage, EXECUTIONS_LOAD_MORE, true)
    } catch (error) {
      console.error('Error loading more workflow executions:', error)
      throw error
    } finally {
      this.isLoadingMoreExecutions = false
    }
  },

  /**
   * Load paginated list of workflow execution states
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @param page - Page number (default: 0)
   * @param perPage - Items per page (default: 10)
   * @param ignoreErrors - Skip automatic error handling
   * @returns Array of workflow execution states
   */
  async getExecutionStates(
    workflowId,
    executionId,
    page = 0,
    perPage = DEFAULT_PER_PAGE,
    ignoreErrors = false
  ) {
    try {
      const url = `v1/workflows/${workflowId}/executions/${executionId}/states?page=${page}&per_page=${perPage}`

      const response = await api.get(url, { skipErrorHandling: ignoreErrors })
      const result: PaginatedResponse<WorkflowExecutionState> = await response.json()
      const { data, pagination } = result

      this.executionStates = data
      this.executionStatesPagination = mapPagination(pagination)

      return data
    } catch (error) {
      if (!ignoreErrors) {
        console.error('Error loading workflow execution states:', error)
      }
      throw error
    }
  },

  /**
   * Load specific workflow execution outputs/thoughts by IDs
   * Caches results to avoid redundant API calls
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @param historyItemIds - Array of history item IDs to load
   * @param force - Force reload even if items are cached
   * @returns Array of loaded output items
   */
  async loadWorkflowExecutionOutput(workflowId, executionId, historyItemIds, force = false) {
    try {
      // Check if items are already cached
      const existingHistoryItems = this.executionStatesThoughts.filter((item) =>
        historyItemIds.includes(item.id)
      )

      // Return cached items if all requested items exist and not forcing refresh
      if (existingHistoryItems.length === historyItemIds.length && !force) {
        return existingHistoryItems
      }

      // Determine which IDs need to be fetched
      const newIds = force
        ? historyItemIds
        : historyItemIds.filter((id) => !existingHistoryItems.map((item) => item.id).includes(id))

      const response = await api.post(
        `v1/workflows/${workflowId}/executions/${executionId}/thoughts`,
        newIds
      )
      const result: Thought[] = await response.json()

      // Remove old items with same IDs and add new ones
      this.executionStatesThoughts = this.executionStatesThoughts.filter(
        (item) => !newIds.includes(item.id)
      )
      this.executionStatesThoughts = this.executionStatesThoughts.concat(result)

      return result
    } catch (error) {
      console.error('Error loading workflow execution output:', error)
      throw error
    }
  },

  /**
   * Load all workflow execution outputs/thoughts
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   */
  async loadWorkflowExecutionOutputAll(workflowId, executionId) {
    try {
      const response = await api.post(
        `v1/workflows/${workflowId}/executions/${executionId}/thoughts`
      )
      const result: Thought[] = await response.json()

      this.executionStatesThoughts = result
    } catch (error) {
      console.error('Error loading all workflow execution outputs:', error)
      throw error
    }
  },

  /**
   * Clear the current execution history/output list
   */
  clearCurrentExecutionHistory() {
    this.executionStatesThoughts = []
  },

  /**
   * Get a specific workflow execution by ID
   * Updates execution and the executions list
   * @param workflowId - The workflow ID
   * @param id - The execution ID
   * @param skipErrors - Skip automatic error handling
   * @returns The workflow execution object
   */
  async getExecution(workflowId, id, skipErrors = false) {
    try {
      this.isExecutionLoading = true
      const response = await api.get(`v1/workflows/${workflowId}/executions/${id}`, {
        skipErrorHandling: skipErrors,
      })

      if (response.status !== 200) {
        throw new Error('Failed to get workflow execution')
      }

      const execution: WorkflowExecution = await response.json()

      this.execution = execution
      this.updateExecutionList()

      return execution
    } catch (error) {
      if (!skipErrors) {
        console.error('Error getting workflow execution:', error)
      }
      throw error
    } finally {
      this.isExecutionLoading = false
    }
  },

  /**
   * Get output for a specific workflow execution state
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @param stateId - The state ID
   * @returns The state output string
   */
  async getWorkflowExecutionStateOutput(workflowId, executionId, stateId) {
    try {
      const url = `v1/workflows/${workflowId}/executions/${executionId}/states/${stateId}/output`

      const response = await api.get(url, { skipErrorHandling: true })
      const data: { output: string } = await response.json()

      return data.output
    } catch (error) {
      console.error('Error getting workflow execution state output:', error)
      throw error
    }
  },

  /**
   * Update the execution in the list with current execution data
   * Internal helper method to sync list item with execution
   */
  updateExecutionList() {
    if (!this.execution) return

    const listItem = this.executions.find(
      (item) => item.execution_id === this.execution?.execution_id
    )

    if (listItem && this.execution) {
      listItem.overall_status = this.execution.overall_status
      listItem.update_date = this.execution.update_date
    }
  },

  /**
   * Create a new workflow execution
   * Adds the new execution to the top of the list
   * @param workflowId - The workflow ID
   * @param message - User input message
   * @param fileNames - Optional array of file names (only first is used)
   * @returns The created workflow execution
   */
  async createWorkflowExecution(workflowId, message, fileNames = []) {
    const requestBody: CreateWorkflowExecutionRequest = {
      user_input: message,
      file_name: fileNames.length ? fileNames[0] : null,
    }

    const response = await api.post(`v1/workflows/${workflowId}/executions`, requestBody)
    const execution: WorkflowExecution = await response.json()

    this.execution = execution
    this.executions.unshift(execution)

    return execution
  },

  /**
   * Abort a running workflow execution
   * Refreshes the execution state after aborting
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @returns API response
   */
  async abortWorkflowExecution(workflowId, executionId) {
    try {
      const response = await api.put(`v1/workflows/${workflowId}/executions/${executionId}/abort`)
      await this.getExecution(workflowId, executionId)
      await this.getExecutionStates(
        workflowId,
        executionId,
        this.executionStatesPagination.page,
        this.executionStatesPagination.perPage
      )

      return response
    } catch (error) {
      console.error('Error aborting workflow execution:', error)
      throw error
    }
  },

  /**
   * Export workflow execution as a downloadable file
   * @param workflow - Workflow object with id and name
   * @param execution - The execution to export
   * @param options - Export options (output_format, combined)
   */
  async exportWorkflowExecution(workflow, execution, { output_format, combined }) {
    try {
      const params = new URLSearchParams({
        output_format,
        combined: String(combined),
      })

      const url = `v1/workflows/${workflow.id}/executions/${
        execution.execution_id
      }/export?${params.toString()}`

      await api.downloadFileStream(
        url,
        'application/zip',
        `${workflow.name}_${formatDate(execution.date, FILE_DATE_FORMAT)}.zip`
      )
    } catch (error) {
      console.error('Error exporting workflow execution:', error)
      throw error
    }
  },

  /**
   * Resume a paused/interrupted workflow execution
   * Waits briefly before refreshing to allow backend processing
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @returns API response
   */
  async resumeWorkflowExecution(workflowId, executionId) {
    try {
      const response = await api.put(`v1/workflows/${workflowId}/executions/${executionId}/resume`)

      // Changed: Added comment to explain the sleep
      // Wait for backend to process resume request before refreshing
      await sleep(RESUME_EXECUTION_TIMEOUT)
      await this.getExecution(workflowId, executionId)

      return response
    } catch (error) {
      console.error('Error resuming workflow execution:', error)
      throw error
    }
  },

  /**
   * Update the output of a specific workflow execution state
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @param stateId - The state ID
   * @param newOutput - The new output content
   * @returns API response data
   */
  async updateWorkflowExecutionStateOutput(workflowId, executionId, stateId, newOutput) {
    try {
      const requestBody: UpdateWorkflowExecutionOutputRequest = {
        output: newOutput,
        state_id: stateId,
      }

      const response = await api.put(
        `v1/workflows/${workflowId}/executions/${executionId}/output`,
        requestBody
      )

      return await response.json()
    } catch (error) {
      console.error('Error updating workflow execution state output:', error)
      throw error
    }
  },

  /**
   * Request changes to a workflow execution state output using AI
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @param originalOutput - The original output to modify
   * @param request - Description of requested changes
   * @returns API response data
   */
  async requestWorkflowExecutionStateOutputChange(
    workflowId,
    executionId,
    originalOutput,
    request
  ) {
    try {
      const requestBody: RequestWorkflowExecutionOutputChangeRequest = {
        request,
        original_output: originalOutput,
      }

      const response = await api.put(
        `v1/workflows/${workflowId}/executions/${executionId}/output/request_changes`,
        requestBody
      )

      return await response.json()
    } catch (error) {
      console.error('Error requesting workflow execution state output change:', error)
      throw error
    }
  },

  /**
   * Delete a specific workflow execution
   * Removes the execution from the list and shows success message
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   */
  async deleteWorkflowExecution(workflowId, executionId) {
    try {
      await api.delete(`v1/workflows/${workflowId}/executions/${executionId}`)

      this.executions = this.executions.filter((item) => item.execution_id !== executionId)

      toaster.info('Execution was deleted successfully')
    } catch (error) {
      console.error('Error deleting workflow execution:', error)
      throw error
    }
  },

  /**
   * Clear all executions for a workflow
   * @param workflowId - The workflow ID
   */
  async clearWorkflowExecutions(workflowId) {
    try {
      await api.delete(`v1/workflows/${workflowId}/executions`)
      toaster.info('Execution history cleared')
      this.executions = []
      this.workflow = null
      this.execution = null
    } catch (error) {
      toaster.error('Error clearing workflow executions')
      console.error('Error clearing workflow executions')
      throw error
    }
  },

  getStateThought(thoughtId) {
    return this.executionStatesThoughts.find((t) => t.id === thoughtId)
  },
})
