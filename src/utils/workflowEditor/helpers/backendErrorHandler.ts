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

export interface WorkflowValidationError {
  message: string
  help?: string
  details?: {
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
]

/**
 * Process backend error response and extract validation issues
 * @param error - The error response from the API
 * @returns Processed error with issues array (for schema_validation or cross_reference_validation) or general error message
 */
export const processBackendError = (error: WorkflowValidationError): ProcessedWorkflowError => {
  if (error.details?.error_type && errorTypes.includes(error.details.error_type)) {
    const issues = error.details.errors
    // Add error_type to each issue
    const issuesWithType = issues?.map((issue) => ({
      ...transformErrorKeys(issue),
      error_type: error.details!.error_type,
    }))
    return {
      issues: issuesWithType && issuesWithType.length > 0 ? issuesWithType : null,
      generalError: null,
    }
  }

  let generalError = error.message || 'An error occurred'

  if (error.details?.message) generalError += `: ${error.details.message}`
  if (error.help) generalError += `. ${error.help}`

  return { issues: null, generalError }
}

/**
 * Transforms API error response fields from snake_case to camelCase
 * @param issue - The error issue from the API (with snake_case fields)
 * @returns The transformed issue with camelCase fields
 */
const transformErrorKeys = (issue: any): WorkflowIssue => {
  const { state_id, config_line, meta, ...rest } = issue

  // Transform meta object if present
  let transformedMeta
  if (meta) {
    const { toolkit_type, toolkit_name, tool_name, mcp_name, ...metaRest } = meta
    transformedMeta = {
      ...metaRest,
      ...(toolkit_type ? { toolkitType: toolkit_type } : {}),
      ...(toolkit_name ? { toolkitName: toolkit_name } : {}),
      ...(tool_name ? { toolName: tool_name } : {}),
      ...(mcp_name ? { mcpName: mcp_name } : {}),
    }
  }

  return {
    ...rest,
    stateId: state_id,
    configLine: config_line,
    ...(transformedMeta ? { meta: transformedMeta } : {}),
  }
}
