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

import { WorkflowIssue } from '@/types/entity'

import {
  CONTRACT_ERROR_TYPE,
  parseContractOutcome,
  ParsedContractOutcome,
} from './contractProtocol'

export interface WorkflowValidationError {
  message: string
  help?: string
  /** An object for structured validation errors, plain text for other backend errors. */
  details?:
    | string
    | {
        error_type: string
        message: string
        errors: WorkflowIssue[]
      }
}

export interface ProcessedWorkflowError {
  issues: WorkflowIssue[] | null
  generalError: string | null
}

const errorTypes = [
  'resource_validation',
  'cross_reference_validation',
  'schema_validation',
  'workflow_schema',
  CONTRACT_ERROR_TYPE,
]

const structuredDetails = (error: WorkflowValidationError) => {
  const details = typeof error.details === 'object' ? error.details : undefined
  return details?.error_type && errorTypes.includes(details.error_type) ? details : undefined
}

/**
 * The issues a rejected save, Check or restore carries, with contract coverage when it has some.
 * Null when the rejection is not a structured validation error or lists no issues.
 */
export const parseRejection = (error: WorkflowValidationError): ParsedContractOutcome | null => {
  if (!structuredDetails(error)) return null
  const parsed = parseContractOutcome({ error })
  return parsed.issues.length > 0 ? parsed : null
}

/**
 * Process backend error response and extract validation issues
 * @param error - The error response from the API
 * @returns Processed error with issues array (for schema_validation or cross_reference_validation) or general error message
 */
export const processBackendError = (error: WorkflowValidationError): ProcessedWorkflowError => {
  const rejected = parseRejection(error)
  if (rejected) return { issues: rejected.issues, generalError: null }

  // A structured error that lists no issues still has its message to show.

  const details = typeof error.details === 'object' ? error.details : undefined
  let generalError = error.message || 'An error occurred'

  const detailText = typeof error.details === 'string' ? error.details : details?.message
  if (detailText) generalError += `: ${detailText}`
  if (error.help) generalError += `. ${error.help}`

  return { issues: null, generalError }
}
