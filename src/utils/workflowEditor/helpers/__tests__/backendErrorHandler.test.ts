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

import { handleWorkflowErrors, WorkflowValidationError } from '../backendErrorHandler'

describe('handleWorkflowErrors', () => {
  describe('basic error handling', () => {
    it('should return general error message when no details provided', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
      }

      const result = handleWorkflowErrors(error)

      expect(result.generalError).toBe('Workflow Configuration error')
      expect(result.stateErrors.size).toBe(0)
    })

    it('should use fallback message when error message is missing', () => {
      const error: WorkflowValidationError = {
        message: '',
      }

      const result = handleWorkflowErrors(error)

      expect(result.generalError).toBe('An error occurred')
      expect(result.stateErrors.size).toBe(0)
    })

    it('should append details message to general error', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Invalid YAML config was provided',
          errors: [],
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.generalError).toBe(
        'Workflow Configuration error<br> Invalid YAML config was provided'
      )
      expect(result.stateErrors.size).toBe(0)
    })
  })

  describe('state error mapping', () => {
    it('should map errors with resource_type state to state errors', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Invalid YAML config was provided',
          errors: [
            {
              resource_type: 'state',
              resource_id: 'assistant_2',
              message: "'next' is required",
            },
          ],
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.generalError).toBe(
        'Workflow Configuration error<br> Invalid YAML config was provided'
      )
      expect(result.stateErrors.size).toBe(1)
      expect(result.stateErrors.get('assistant_2')).toBe("'next' is required")
    })

    it('should map errors with reference_state to state errors', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'reference_error',
          message: 'Invalid references',
          errors: [
            {
              resource_type: 'transition',
              resource_id: 'transition_1',
              message: 'Referenced state does not exist',
              reference_state: 'assistant_1',
            },
          ],
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.generalError).toBe('Workflow Configuration error<br> Invalid references')
      expect(result.stateErrors.size).toBe(1)
      expect(result.stateErrors.get('assistant_1')).toBe('Referenced state does not exist')
    })

    it('should handle multiple state errors', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Multiple validation errors',
          errors: [
            {
              resource_type: 'state',
              resource_id: 'assistant_1',
              message: 'Missing assistant_id',
            },
            {
              resource_type: 'state',
              resource_id: 'assistant_2',
              message: "'next' is required",
            },
            {
              resource_type: 'state',
              resource_id: 'tool_1',
              message: 'Invalid tool configuration',
            },
          ],
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.stateErrors.size).toBe(3)
      expect(result.stateErrors.get('assistant_1')).toBe('Missing assistant_id')
      expect(result.stateErrors.get('assistant_2')).toBe("'next' is required")
      expect(result.stateErrors.get('tool_1')).toBe('Invalid tool configuration')
    })

    it('should prefer resource_type state over reference_state', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'schema_validation',
          message: 'Validation error',
          errors: [
            {
              resource_type: 'state',
              resource_id: 'assistant_1',
              message: 'State error',
              reference_state: 'assistant_2',
            },
          ],
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.stateErrors.size).toBe(1)
      expect(result.stateErrors.get('assistant_1')).toBe('State error')
      expect(result.stateErrors.get('assistant_2')).toBeUndefined()
    })
  })

  describe('general error mapping', () => {
    it('should map non-state errors to general error', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'validation_error',
          message: 'General validation issues',
          errors: [
            {
              resource_type: 'workflow',
              resource_id: 'main',
              message: 'Invalid workflow structure',
            },
          ],
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.generalError).toBe(
        'Workflow Configuration error<br> General validation issues<br>Invalid workflow structure'
      )
      expect(result.stateErrors.size).toBe(0)
    })

    it('should handle mixed state and general errors', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'validation_error',
          message: 'Multiple errors',
          errors: [
            {
              resource_type: 'state',
              resource_id: 'assistant_1',
              message: 'State error',
            },
            {
              resource_type: 'workflow',
              resource_id: 'main',
              message: 'Workflow error',
            },
            {
              resource_type: 'state',
              resource_id: 'tool_1',
              message: 'Tool state error',
            },
          ],
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.generalError).toBe(
        'Workflow Configuration error<br> Multiple errors<br>Workflow error'
      )
      expect(result.stateErrors.size).toBe(2)
      expect(result.stateErrors.get('assistant_1')).toBe('State error')
      expect(result.stateErrors.get('tool_1')).toBe('Tool state error')
    })
  })

  describe('edge cases', () => {
    it('should handle empty errors array', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'validation_error',
          message: 'No specific errors',
          errors: [],
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.generalError).toBe('Workflow Configuration error<br> No specific errors')
      expect(result.stateErrors.size).toBe(0)
    })

    it('should handle null items in errors array', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'validation_error',
          message: 'Some errors',
          errors: [
            null as any,
            {
              resource_type: 'state',
              resource_id: 'assistant_1',
              message: 'Valid error',
            },
            null as any,
          ],
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.stateErrors.size).toBe(1)
      expect(result.stateErrors.get('assistant_1')).toBe('Valid error')
    })

    it('should handle missing errors field', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'validation_error',
          message: 'General error',
        } as any,
      }

      const result = handleWorkflowErrors(error)

      expect(result.generalError).toBe('Workflow Configuration error<br> General error')
      expect(result.stateErrors.size).toBe(0)
    })

    it('should handle non-array errors field', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'validation_error',
          message: 'General error',
          errors: 'not an array' as any,
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.generalError).toBe('Workflow Configuration error<br> General error')
      expect(result.stateErrors.size).toBe(0)
    })
  })

  describe('state error overwriting', () => {
    it('should overwrite previous state error with same state id', () => {
      const error: WorkflowValidationError = {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'validation_error',
          message: 'Multiple errors for same state',
          errors: [
            {
              resource_type: 'state',
              resource_id: 'assistant_1',
              message: 'First error',
            },
            {
              resource_type: 'state',
              resource_id: 'assistant_1',
              message: 'Second error',
            },
          ],
        },
      }

      const result = handleWorkflowErrors(error)

      expect(result.stateErrors.size).toBe(1)
      expect(result.stateErrors.get('assistant_1')).toBe('Second error')
    })
  })
})
