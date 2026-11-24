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

import { describe, it, expect } from 'vitest'

import {
  parseRejection,
  processBackendError,
  WorkflowValidationError,
} from '../backendErrorHandler'

describe('processBackendError', () => {
  describe('validation errors', () => {
    it('should extract WorkflowIssue array from schema_validation errors', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Invalid YAML config was provided',
          errors: [
            {
              id: '1',
              message: 'Assistant model error',
              details: 'Assistant model error details',
              state_id: 'assistant_12',
              path: 'model',
              config_line: 3,
            },
            {
              id: '2',
              message: 'object is expected',
              details: 'retry_policy must be an object',
              path: 'retry_policy',
              config_line: 42,
            },
          ] as any,
        },
      }

      const result = processBackendError(error)

      expect(result.issues).not.toBeNull()
      expect(result.issues).toHaveLength(2)
      expect(result.generalError).toBeNull()
      expect(result.issues?.[0]).toEqual({
        id: '1',
        message: 'Assistant model error',
        details: 'Assistant model error details',
        stateId: 'assistant_12',
        path: 'model',
        configLine: 3,
        error_type: 'schema_validation',
        outcome: 'ERROR',
      })
      expect(result.issues?.[1]).toEqual({
        id: '2',
        message: 'object is expected',
        details: 'retry_policy must be an object',
        path: 'retry_policy',
        configLine: 42,
        error_type: 'schema_validation',
        outcome: 'ERROR',
      })
    })

    it('should return the general error for an empty errors array', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Invalid YAML config was provided',
          errors: [],
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe(
        'Workflow Configuration error: Invalid YAML config was provided'
      )
    })

    it('should handle issues without stateId (global fields)', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Invalid YAML config was provided',
          errors: [
            {
              id: '1',
              message: 'max_concurrency must be positive',
              details: 'max_concurrency value is invalid',
              path: 'max_concurrency',
              config_line: 10,
            },
          ] as any,
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toHaveLength(1)
      expect(result.issues?.[0].stateId).toBeUndefined()
      expect(result.issues?.[0].path).toBe('max_concurrency')
    })

    it('should handle multiple issues with mixed state and global fields', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Multiple validation errors',
          errors: [
            {
              id: '1',
              message: 'Assistant model error',
              state_id: 'assistant_12',
              path: 'model',
              config_line: 5,
            },
            {
              id: '2',
              message: 'recursion_limit must be positive',
              path: 'recursion_limit',
              config_line: 15,
            },
            {
              id: '3',
              message: 'Transform mapping error',
              state_id: 'transform_1',
              path: 'config.mappings.0.output_field',
              config_line: 25,
            },
          ] as any,
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toHaveLength(3)
      expect(result.generalError).toBeNull()
      expect(result.issues?.[0].stateId).toBe('assistant_12')
      expect(result.issues?.[1].stateId).toBeUndefined()
      expect(result.issues?.[2].stateId).toBe('transform_1')
    })

    it('should handle issues with optional details field', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Invalid config',
          errors: [
            {
              id: '1',
              message: 'Field is required',
              path: 'name',
              config_line: 1,
            },
          ] as any,
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toHaveLength(1)
      expect(result.issues?.[0].details).toBeUndefined()
      expect(result.issues?.[0].message).toBe('Field is required')
    })

    it('should extract WorkflowIssue array from cross_reference_validation errors', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'cross_reference_validation',
          message: 'Configuration contains cross-reference errors',
          errors: [
            {
              id: '7a0d614b-cd1b-4806-bd6c-dd59230e283e',
              message: 'Invalid reference',
              path: 'assistant_id',
              details: "Assistant 'assistant_123' not found",
              state_id: 'assistant_12',
              config_line: 142,
            },
          ] as any,
        },
      }

      const result = processBackendError(error)

      expect(result.issues).not.toBeNull()
      expect(result.issues).toHaveLength(1)
      expect(result.generalError).toBeNull()
      expect(result.issues?.[0]).toEqual({
        id: '7a0d614b-cd1b-4806-bd6c-dd59230e283e',
        message: 'Invalid reference',
        path: 'assistant_id',
        details: "Assistant 'assistant_123' not found",
        stateId: 'assistant_12',
        configLine: 142,
        error_type: 'cross_reference_validation',
        outcome: 'ERROR',
      })
    })

    it('should handle multiple cross-reference validation errors', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'cross_reference_validation',
          message: 'Multiple reference errors found',
          errors: [
            {
              id: '1',
              message: 'Invalid reference',
              path: 'assistant_id',
              details: "Assistant 'assistant_123' not found",
              state_id: 'assistant_12',
              config_line: 142,
            },
            {
              id: '2',
              message: 'Invalid reference',
              path: 'data_source_id',
              details: "Data source 'ds_456' not found",
              state_id: 'transform_1',
              config_line: 158,
            },
          ] as any,
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toHaveLength(2)
      expect(result.generalError).toBeNull()
      expect(result.issues?.[0].path).toBe('assistant_id')
      expect(result.issues?.[1].path).toBe('data_source_id')
    })

    it('should return the general error for an empty cross_reference_validation errors array', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'cross_reference_validation',
          message: 'No references to validate',
          errors: [],
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe('Workflow Configuration error: No references to validate')
    })
  })

  describe('non-validation errors', () => {
    it('should return formatted general error for non-schema_validation errors', () => {
      const error: WorkflowValidationError = {
        message: 'Database connection failed',
        details: {
          error_type: 'database_error',
          message: 'Could not connect to database server',
          errors: [],
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe(
        'Database connection failed: Could not connect to database server'
      )
    })

    it('should handle error without details', () => {
      const error: WorkflowValidationError = {
        message: 'Something went wrong',
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe('Something went wrong')
    })

    it('should use fallback message when error message is missing', () => {
      const error: WorkflowValidationError = {
        message: '',
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe('An error occurred')
    })

    it('should format error with details but no help', () => {
      const error: WorkflowValidationError = {
        message: 'Network error',
        details: {
          error_type: 'network_error',
          message: 'Connection timeout',
          errors: [],
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe('Network error: Connection timeout')
    })

    it('should handle authentication errors', () => {
      const error: WorkflowValidationError = {
        message: 'Authentication failed',
        help: 'Please log in again',
        details: {
          error_type: 'auth_error',
          message: 'Token expired',
          errors: [],
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe('Authentication failed: Token expired. Please log in again')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined details', () => {
      const error: WorkflowValidationError = {
        message: 'Error occurred',
        details: undefined,
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe('Error occurred')
    })

    it('should handle null errors in schema_validation', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Invalid config',
          errors: null as any,
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe('Workflow Configuration error: Invalid config')
    })

    it('should handle undefined errors in schema_validation', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Invalid config',
          errors: undefined as any,
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe('Workflow Configuration error: Invalid config')
    })

    it('should handle missing error_type in details', () => {
      const error: WorkflowValidationError = {
        message: 'Error',
        details: {
          error_type: '',
          message: 'Some error',
          errors: [
            {
              id: '1',
              message: 'Issue',
              path: 'field',
              config_line: 1,
            },
          ] as any,
        },
      }

      const result = processBackendError(error)

      // Should not be treated as schema_validation
      expect(result.issues).toBeNull()
      expect(result.generalError).toBe('Error: Some error')
    })

    it('should handle case-sensitive error_type', () => {
      const error: WorkflowValidationError = {
        message: 'Error',
        details: {
          error_type: 'SCHEMA_VALIDATION', // Wrong case
          message: 'Invalid',
          errors: [
            {
              id: '1',
              message: 'Issue',
              path: 'field',
              config_line: 1,
            },
          ] as any,
        },
      }

      const result = processBackendError(error)

      // Should not match schema_validation
      expect(result.issues).toBeNull()
      expect(result.generalError).toBe('Error: Invalid')
    })
  })

  describe('real-world scenarios', () => {
    it('should handle retry_policy validation error', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Invalid YAML config was provided',
          errors: [
            {
              id: '1',
              message: 'object is expected',
              details: 'retry_policy field must be an object',
              path: 'retry_policy',
              config_line: 42,
            },
          ] as any,
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toHaveLength(1)
      expect(result.generalError).toBeNull()
      expect(result.issues?.[0].path).toBe('retry_policy')
      expect(result.issues?.[0].configLine).toBe(42)
    })

    it('should handle nested field validation errors', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Invalid configuration',
          errors: [
            {
              id: '1',
              message: 'max_attempts is required',
              state_id: 'assistant_1',
              path: 'retry_policy.max_attempts',
              config_line: 50,
            },
            {
              id: '2',
              message: 'output_field cannot be empty',
              state_id: 'transform_1',
              path: 'config.mappings.0.output_field',
              config_line: 75,
            },
          ] as any,
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toHaveLength(2)
      expect(result.issues?.[0].path).toBe('retry_policy.max_attempts')
      expect(result.issues?.[1].path).toBe('config.mappings.0.output_field')
    })

    it('should handle permission denied error', () => {
      const error: WorkflowValidationError = {
        message: 'Permission denied',
        help: 'Contact your administrator',
        details: {
          error_type: 'authorization_error',
          message: 'You do not have permission to update this workflow',
          errors: [],
        },
      }

      const result = processBackendError(error)

      expect(result.issues).toBeNull()
      expect(result.generalError).toBe(
        'Permission denied: You do not have permission to update this workflow. Contact your administrator'
      )
    })
  })

  describe('contract_validation errors', () => {
    it('whitelists contract_validation and maps outcome, config_section and config_path', () => {
      const error = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'contract_validation',
          message: 'Workflow contracts are not satisfied',
          errors: [
            {
              id: 'e-1',
              outcome: 'ERROR',
              state_id: 'c1',
              path: 'x',
              config_path: 'input_schema.properties.x',
              config_section: 'states',
              config_line: 12,
              message: 'missing',
              meta: { label: 'certain runtime failure', strict_source: 'state' },
            },
          ],
        },
      } as unknown as WorkflowValidationError

      const result = processBackendError(error)

      expect(result.generalError).toBeNull()
      expect(result.issues).toEqual([
        {
          id: 'e-1',
          outcome: 'ERROR',
          stateId: 'c1',
          // Contract issues name their field through config_path, not path.
          path: 'input_schema',
          configPath: 'input_schema.properties.x',
          configSection: 'states',
          configLine: 12,
          message: 'missing',
          meta: { label: 'certain runtime failure', strict_source: 'state' },
          error_type: 'contract_validation',
        },
      ])
    })
  })
})

describe('processBackendError — details sent as text', () => {
  it('appends string details to the general error', () => {
    const result = processBackendError({
      message: 'Workflow Configuration error',
      details: 'Guardrail not found',
    })

    expect(result).toEqual({
      issues: null,
      generalError: 'Workflow Configuration error: Guardrail not found',
    })
  })
})

describe('processBackendError — shared issue converter', () => {
  it('camel-cases meta keys, reads unknown outcomes as ERROR and drops unknown fields', () => {
    const result = processBackendError({
      message: 'Workflow Configuration error',
      details: {
        error_type: 'resource_validation',
        message: 'Missing resources',
        errors: [
          {
            id: 'r1',
            message: 'Toolkit missing',
            path: 'tools',
            state_id: 's1',
            outcome: 'SURPRISE',
            extra_field: 'not copied',
            meta: { toolkit_name: 'Jira', tool_name: 'search', custom: 1 },
          },
        ] as any,
      },
    })

    expect(result.issues).toEqual([
      {
        id: 'r1',
        message: 'Toolkit missing',
        path: 'tools',
        stateId: 's1',
        configLine: 0,
        error_type: 'resource_validation',
        outcome: 'ERROR',
        meta: { toolkitName: 'Jira', toolName: 'search', custom: 1 },
      },
    ])
  })
})

describe('parseRejection', () => {
  it('returns the issues and coverage of a structured rejection', () => {
    const coverage = {
      validated_states: 1,
      total_states: 2,
      uncovered_state_ids: ['s2'],
      analysed: true,
      cap_reached: false,
    }
    const parsed = parseRejection({
      message: 'Workflow Configuration error',
      details: {
        error_type: 'contract_validation',
        message: 'Contracts are not satisfied',
        errors: [{ id: 'c1', message: 'missing', outcome: 'ERROR' }] as any,
        coverage,
      } as any,
    })

    expect(parsed?.issues).toHaveLength(1)
    expect(parsed?.issues[0].error_type).toBe('contract_validation')
    expect(parsed?.coverage).toEqual(coverage)
  })

  it('returns the issues of a non-contract structured rejection', () => {
    const parsed = parseRejection({
      message: 'Workflow Configuration error',
      details: {
        error_type: 'schema_validation',
        message: 'Invalid',
        errors: [{ id: '1', message: 'bad', path: 'model' }] as any,
      },
    })

    expect(parsed?.issues.map((issue) => issue.path)).toEqual(['model'])
  })

  it('is null for a structured rejection that lists no issues', () => {
    expect(
      parseRejection({
        message: 'Workflow Configuration error',
        details: { error_type: 'schema_validation', message: 'Invalid', errors: [] },
      })
    ).toBeNull()
  })

  it('is null for an error type outside the whitelist', () => {
    expect(
      parseRejection({
        message: 'Error',
        details: {
          error_type: 'database_error',
          message: 'down',
          errors: [{ id: '1', message: 'x' }] as any,
        },
      })
    ).toBeNull()
  })

  it('is null for text details', () => {
    expect(parseRejection({ message: 'Error', details: 'plain text' })).toBeNull()
  })
})
