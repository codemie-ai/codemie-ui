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

import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
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
  WorkflowTransitionsResponse,
  WorkflowTransition,
} from '@/types/entity/workflow'
import api from '@/utils/api'
import { formatDateTime, sleep } from '@/utils/helpers'
import toaster from '@/utils/toaster'

import { mapPagination } from './utils/workflowExecutions'
import { workflowsStore } from './workflows'

const DEFAULT_PER_PAGE = 10
const EXECUTIONS_PER_PAGE = 10
const RESUME_EXECUTION_TIMEOUT = 2000

interface WorkflowExecutionsStoreType {
  isWorkflowLoading: boolean
  workflow: Workflow | null

  isExecutionLoading: boolean
  execution: WorkflowExecution | null
  executionStatesThoughts: Thought[]
  executionStates: WorkflowExecutionState[]
  executionStatesPagination: Pagination
  isExecutionStatesLoading: boolean

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
  refreshExecutions: (workflowId: string) => Promise<WorkflowExecution[]>
  loadMoreExecutions: (workflowId: string) => Promise<void>
  removeExecution: () => void

  getExecutionStates: (
    workflowId: string,
    executionId: string,
    pageOrOptions?:
      | number
      | {
          page?: number
          perPage?: number
          ignoreErrors?: boolean
          skipLoading?: boolean
        },
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
  ) => Promise<string | null>

  getExecutionTransitions: (
    workflowId: string,
    executionId: string,
    options: {
      page?: number
      perPage?: number
      fromState?: string
      toState?: string
    }
  ) => Promise<WorkflowTransitionsResponse>

  getExecutionTransitionsFromState: (
    workflowId: string,
    executionId: string,
    stateId: string,
    options: {
      skipErrors?: boolean
    }
  ) => Promise<WorkflowTransition>

  getExecutionTransitionsToState: (
    workflowId: string,
    executionId: string,
    stateId: string,
    options: { skipErrors?: boolean }
  ) => Promise<WorkflowTransition>

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
  isExecutionStatesLoading: false,

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
        // Deduplicate when appending to prevent duplicates from pagination overlap
        // This can happen when new executions are created, causing page boundaries to shift
        const existingIds = new Set(this.executions.map((ex) => ex.execution_id))
        const newExecutions = data.filter((ex) => !existingIds.has(ex.execution_id))
        this.executions = [...this.executions, ...newExecutions]
      } else {
        this.executions = data
      }

      const mappedPagination = mapPagination(pagination)

      // When appending, protect against totalCount being overwritten with stale values
      // This can happen when new executions are created locally but the API pagination
      // hasn't been updated yet. Use the maximum to prevent negative indexes.
      if (append && this.executionsPagination.totalCount > mappedPagination.totalCount) {
        mappedPagination.totalCount = this.executionsPagination.totalCount
      }

      this.executionsPagination = mappedPagination
      this.hasMoreExecutions = pagination.page < pagination.pages - 1

      return data
    } catch (error) {
      console.error('Error loading workflow executions:', error)
      throw error
    }
  },

  async getExecutions(workflowId) {
    this.hasMoreExecutions = true
    return this.loadWorkflowExecutions(workflowId, 0, EXECUTIONS_PER_PAGE)
  },

  /**
   * Refresh executions for polling without disrupting scroll state
   * Only fetches pages that contain running executions (non-final status)
   * @param workflowId - The workflow ID
   * @returns Array of updated workflow executions
   */
  async refreshExecutions(workflowId) {
    try {
      // Step 1: Calculate which pages are currently loaded
      const loadedCount = this.executions.length

      if (loadedCount === 0) {
        return []
      }

      // Step 2: Find pages that have running executions (non-final status)
      const pagesWithRunningExecutions = new Set<number>()

      // Always fetch page 0 to catch new executions
      pagesWithRunningExecutions.add(0)

      for (let i = 0; i < this.executions.length; i += 1) {
        const execution = this.executions[i]

        // Check if execution is still running (not in final status)
        if (!WORKFLOW_FINAL_STATUSES.includes(execution.overall_status)) {
          // Calculate which page this execution is on
          const pageNumber = Math.floor(i / EXECUTIONS_PER_PAGE)
          pagesWithRunningExecutions.add(pageNumber)
        }
      }

      const pagesToFetch = Array.from(pagesWithRunningExecutions).sort((a, b) => a - b)

      // Step 3: Fetch all pages in parallel
      const fetchPromises = pagesToFetch.map(async (pageNum) => {
        const perPage = EXECUTIONS_PER_PAGE

        const response = await api.get(
          `v1/workflows/${workflowId}/executions?page=${pageNum}&per_page=${perPage}`
        )

        if (response.status !== 200) {
          throw new Error(`Failed to refresh page ${pageNum}`)
        }

        const result: PaginatedResponse<WorkflowExecution> = await response.json()
        return result
      })

      const results = await Promise.all(fetchPromises)

      // Step 4: Combine all fresh executions from fetched pages
      const allFreshExecutions: WorkflowExecution[] = []
      let latestPagination = results[0]?.pagination

      for (const result of results) {
        allFreshExecutions.push(...result.data)
        // Keep the most up-to-date pagination metadata
        if (result.pagination.total > latestPagination.total) {
          latestPagination = result.pagination
        }
      }

      // Step 5: Update existing executions in place
      // Create a map of current executions: execution_id -> array index
      const executionIndexMap = new Map(this.executions.map((ex, idx) => [ex.execution_id, idx]))

      const newExecutions: WorkflowExecution[] = []

      for (const freshExecution of allFreshExecutions) {
        const existingIndex = executionIndexMap.get(freshExecution.execution_id)

        if (existingIndex !== undefined) {
          this.executions[existingIndex] = freshExecution
        } else {
          newExecutions.push(freshExecution)
        }
      }

      // Step 6: Add new executions at the beginning
      // New executions should only appear if we fetched page 0 and there are new ones
      if (newExecutions.length > 0) {
        this.executions = [...newExecutions, ...this.executions]
        this.executionsPagination.totalCount += newExecutions.length
      }

      // Step 7: Update pagination metadata
      this.executionsPagination = {
        ...this.executionsPagination,
        totalPages: latestPagination.pages,
        totalCount: latestPagination.total,
      }

      // Update hasMoreExecutions based on total available pages vs currently loaded
      const currentlyLoadedPages = Math.ceil(this.executions.length / EXECUTIONS_PER_PAGE)
      this.hasMoreExecutions = currentlyLoadedPages < latestPagination.pages

      return allFreshExecutions
    } catch (error) {
      console.error('Error refreshing workflow executions:', error)
      throw error
    }
  },

  async loadMoreExecutions(workflowId) {
    if (this.isLoadingMoreExecutions || !this.hasMoreExecutions) {
      return
    }

    this.isLoadingMoreExecutions = true

    try {
      const nextPage = this.executionsPagination.page + 1
      await this.loadWorkflowExecutions(workflowId, nextPage, EXECUTIONS_PER_PAGE, true)
    } catch (error) {
      console.error('Error loading more workflow executions:', error)
      this.hasMoreExecutions = false
      throw error
    } finally {
      this.isLoadingMoreExecutions = false
    }
  },

  /**
   * Load paginated list of workflow execution states
   *
   * Supports two calling conventions for backwards compatibility:
   * 1. New (options object): getExecutionStates(workflowId, executionId, { page, perPage, ignoreErrors, skipLoading })
   * 2. Old (positional params): getExecutionStates(workflowId, executionId, page, perPage, ignoreErrors)
   *
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @param pageOrOptions - Page number (old API) OR options object (new API)
   * @param perPage - Items per page (old API)
   * @param ignoreErrors - Skip automatic error handling (old API)
   * @returns Array of workflow execution states
   */
  async getExecutionStates(workflowId, executionId, pageOrOptions?, perPage?, ignoreErrors?) {
    // Handle backwards compatibility: support both old positional params and new options object
    let page: number
    let itemsPerPage: number
    let skipErrors: boolean
    let skipLoading: boolean

    if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
      // New API: options object
      page = pageOrOptions.page ?? 0
      itemsPerPage = pageOrOptions.perPage ?? 10
      skipErrors = pageOrOptions.ignoreErrors ?? false
      skipLoading = pageOrOptions.skipLoading ?? false
    } else if (pageOrOptions !== undefined || perPage !== undefined || ignoreErrors !== undefined) {
      // Old API: positional parameters
      page = pageOrOptions ?? 0
      itemsPerPage = perPage ?? 10
      skipErrors = ignoreErrors ?? false
      skipLoading = false
    } else {
      // No parameters provided - use defaults
      page = 0
      itemsPerPage = 10
      skipErrors = false
      skipLoading = false
    }

    try {
      if (!skipLoading) {
        this.isExecutionStatesLoading = true
      }

      const url = `v1/workflows/${workflowId}/executions/${executionId}/states?page=${page}&per_page=${itemsPerPage}`

      const response = await api.get(url, { skipErrorHandling: skipErrors })
      const result: PaginatedResponse<WorkflowExecutionState> = await response.json()
      const { data, pagination } = result

      this.executionStates = data
      this.executionStatesPagination = mapPagination(pagination)

      return data
    } catch (error) {
      if (!skipErrors) {
        console.error('Error loading workflow execution states:', error)
      }
      throw error
    } finally {
      if (!skipLoading) {
        this.isExecutionStatesLoading = false
      }
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
      const data: { output: string | null } = await response.json()

      return data.output
    } catch (error) {
      console.error('Error getting workflow execution state output:', error)
      throw error
    }
  },

  /**
   * Get paginated transitions for a workflow execution
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @param page - Page number (zero-based, default: 0)
   * @param perPage - Items per page (default: 10, max: 100)
   * @param fromState - Optional filter by source node name
   * @param toState - Optional filter by target node name
   * @returns Transitions response with data and pagination
   */
  async getExecutionTransitions(
    workflowId: string,
    executionId: string,
    { page = 0, perPage = 10, fromState, toState }
  ) {
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      }

      if (fromState) params.from_state = fromState
      if (toState) params.to_state = toState

      const response = await api.get(
        `v1/workflows/${workflowId}/executions/${executionId}/transitions`,
        { params }
      )

      if (response.status !== 200) {
        throw new Error('Failed to get execution transitions')
      }

      const result: WorkflowTransitionsResponse = await response.json()
      return result
    } catch (error) {
      console.error('Error getting execution transitions:', error)
      throw error
    }
  },

  /**
   * Get single transition from a specific state - "What happened next?"
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @param stateId - The state ID to get transition from
   * @param skipErrors - Skip automatic error handling (default: false)
   * @returns Single transition object
   */
  async getExecutionTransitionsFromState(
    workflowId: string,
    executionId: string,
    stateId: string,
    { skipErrors = false }
  ) {
    try {
      const response = await api.get(
        `v1/workflows/${workflowId}/executions/${executionId}/transitions/from/${stateId}`,
        { skipErrorHandling: skipErrors }
      )

      if (response.status !== 200) {
        throw new Error('Failed to get execution transition from state')
      }

      const result: WorkflowTransition = await response.json()
      return result
    } catch (error) {
      if (!skipErrors) {
        console.error('Error getting execution transition from state:', error)
      }
      throw error
    }
  },

  /**
   * Get single transition to a specific state - "What led here?"
   * @param workflowId - The workflow ID
   * @param executionId - The execution ID
   * @param stateId - The state ID to get transition to
   * @param skipErrors - Skip automatic error handling (default: false)
   * @returns Single transition object
   */
  async getExecutionTransitionsToState(
    workflowId: string,
    executionId: string,
    stateId: string,
    { skipErrors = false }
  ) {
    try {
      const response = await api.get(
        `v1/workflows/${workflowId}/executions/${executionId}/transitions/to/${stateId}`,
        { skipErrorHandling: skipErrors }
      )

      if (response.status !== 200) {
        throw new Error('Failed to get execution transition to state')
      }

      const result: WorkflowTransition = await response.json()
      return result
    } catch (error) {
      if (!skipErrors) {
        console.error('Error getting execution transition to state:', error)
      }
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
   * @param fileNames - Optional array of file names
   * @returns The created workflow execution
   */
  async createWorkflowExecution(workflowId, message, fileNames = []) {
    const requestBody: CreateWorkflowExecutionRequest = {
      user_input: message,
      file_names: fileNames,
    }

    const response = await api.post(`v1/workflows/${workflowId}/executions`, requestBody)
    const execution: WorkflowExecution = await response.json()

    this.execution = execution
    this.executions.unshift(execution)

    this.executionsPagination.totalCount += 1

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

      // Preserve the current pagination when refreshing states after abort
      await this.getExecutionStates(workflowId, executionId, {
        page: this.executionStatesPagination.page,
        perPage: this.executionStatesPagination.perPage || 10,
      })

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
        `${workflow.name}_${formatDateTime(execution.date, 'file')}.zip`
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

      if (this.executionsPagination.totalCount > 0) {
        this.executionsPagination.totalCount -= 1
      }

      toaster.info('Execution was deleted successfully')
    } catch (error) {
      console.error('Error deleting workflow execution:', error)
      throw error
    }
  },

  /**
   * Clear all non-chat executions for a workflow
   * Backend doesn't delete chat executions (those with conversation_id)
   * Frontend removes only non-chat executions from the UI
   * @param workflowId - The workflow ID
   */
  async clearWorkflowExecutions(workflowId) {
    try {
      await api.delete(`v1/workflows/${workflowId}/executions`)

      toaster.info('Execution history cleared')

      const chatExecutions = this.executions.filter((ex) => ex.conversation_id)

      this.executions = chatExecutions

      if (this.execution && !this.execution.conversation_id) {
        this.execution = null
        this.executionStates = []
      }

      this.executionsPagination.totalCount = chatExecutions.length
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
