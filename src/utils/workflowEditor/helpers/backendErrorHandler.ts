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

/**
 * Backend error handling utilities for workflow editor
 */

export interface WorkflowErrorItem {
  resource_type: string
  resource_id: string
  message: string
  reference_state?: string
}

export interface WorkflowValidationError {
  message: string
  help?: string
  details?: { error_type: string; message: string; errors: WorkflowErrorItem[] }
}

export interface StateError {
  path: string
  message: string
}

export interface CategorizedWorkflowErrors {
  generalError: string
  stateErrors: Map<string, string>
}

const GENERAL_ERROR_SEP = '<br>'
const RESOURCE_TYPE_STATE = 'state'

/**
 * Parse error response from backend into general and state-specific errors
 * @param errorResponse - The error response from the API
 * @returns Parsed errors with general errors and state-specific errors map
 */
export const handleWorkflowErrors = (error: WorkflowValidationError): CategorizedWorkflowErrors => {
  let generalError = error.message || 'An error occurred'
  const stateErrors = new Map<string, string>()

  if (!error.details) return { generalError, stateErrors }

  if (!Array.isArray(error.details) && error.details?.message) {
    generalError += `${GENERAL_ERROR_SEP} ${error.details.message}`
  }

  if (!error.details.errors || !Array.isArray(error.details.errors)) {
    return { generalError, stateErrors }
  }

  for (const item of error.details.errors) {
    if (item) {
      if (item.resource_type === RESOURCE_TYPE_STATE) {
        stateErrors.set(item.resource_id, item.message)
      } else if (item.reference_state) {
        stateErrors.set(item.reference_state, item.message)
      } else {
        generalError += `${GENERAL_ERROR_SEP}${item.message}`
      }
    }
  }

  return { generalError, stateErrors }
}
