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

import { describe, it, expect, beforeEach } from 'vitest'

import {
  registerField,
  registerFields,
  isFieldSupported,
  isAdvancedConfigField,
} from '../visualEditorFieldRegistry'

describe('visualEditorFieldRegistry', () => {
  describe('registerField', () => {
    describe('exact path registration', () => {
      beforeEach(() => {
        // Note: Registry is global, so we test incrementally
        registerField('test_field_1')
      })

      it('registers a simple field path', () => {
        expect(isFieldSupported('test_field_1')).toBe(true)
      })

      it('returns false for unregistered field', () => {
        expect(isFieldSupported('unregistered_field')).toBe(false)
      })

      it('registers field with single node type as string', () => {
        registerField('test_field_with_node', 'assistant')
        expect(isFieldSupported('test_field_with_node', 'assistant')).toBe(true)
        expect(isFieldSupported('test_field_with_node', 'tool')).toBe(false)
      })

      it('registers field with multiple node types as array', () => {
        registerField('test_field_multi_node', ['assistant', 'tool'])
        expect(isFieldSupported('test_field_multi_node', 'assistant')).toBe(true)
        expect(isFieldSupported('test_field_multi_node', 'tool')).toBe(true)
        expect(isFieldSupported('test_field_multi_node', 'iterator')).toBe(false)
      })

      it('registers field with error type as string', () => {
        registerField('test_field_error', undefined, 'schema_validation')
        expect(isFieldSupported('test_field_error', undefined, 'schema_validation')).toBe(true)
        expect(isFieldSupported('test_field_error', undefined, 'cross_reference_validation')).toBe(
          false
        )
      })

      it('registers field with multiple error types as array', () => {
        registerField('test_field_multi_error', undefined, [
          'schema_validation',
          'cross_reference_validation',
        ])
        expect(isFieldSupported('test_field_multi_error', undefined, 'schema_validation')).toBe(
          true
        )
        expect(
          isFieldSupported('test_field_multi_error', undefined, 'cross_reference_validation')
        ).toBe(true)
        expect(isFieldSupported('test_field_multi_error', undefined, 'resource_validation')).toBe(
          false
        )
      })

      it('registers field with both node types and error types', () => {
        registerField('test_field_combined', ['assistant', 'tool'], ['schema_validation'])
        expect(isFieldSupported('test_field_combined', 'assistant', 'schema_validation')).toBe(true)
        expect(isFieldSupported('test_field_combined', 'tool', 'schema_validation')).toBe(true)
        expect(isFieldSupported('test_field_combined', 'assistant', 'resource_validation')).toBe(
          false
        )
        expect(isFieldSupported('test_field_combined', 'iterator', 'schema_validation')).toBe(false)
      })

      it('merges types when registering same path multiple times', () => {
        registerField('test_merge_field', 'assistant')
        registerField('test_merge_field', 'tool')
        expect(isFieldSupported('test_merge_field', 'assistant')).toBe(true)
        expect(isFieldSupported('test_merge_field', 'tool')).toBe(true)
      })

      it('merges error types when registering same path multiple times', () => {
        registerField('test_merge_error', undefined, 'schema_validation')
        registerField('test_merge_error', undefined, 'cross_reference_validation')
        expect(isFieldSupported('test_merge_error', undefined, 'schema_validation')).toBe(true)
        expect(isFieldSupported('test_merge_error', undefined, 'cross_reference_validation')).toBe(
          true
        )
      })
    })

    describe('pattern registration', () => {
      it('registers a simple regex pattern', () => {
        registerField(/^model\..*/)
        expect(isFieldSupported('model.name')).toBe(true)
        expect(isFieldSupported('model.version')).toBe(true)
        expect(isFieldSupported('name.model')).toBe(false)
      })

      it('registers pattern with node type', () => {
        registerField(/^assistant_.*/, 'assistant')
        expect(isFieldSupported('assistant_field', 'assistant')).toBe(true)
        expect(isFieldSupported('assistant_field', 'tool')).toBe(false)
      })

      it('registers pattern with error type', () => {
        registerField(/^tools\.\d+\.name/, undefined, 'schema_validation')
        expect(isFieldSupported('tools.0.name', undefined, 'schema_validation')).toBe(true)
        expect(isFieldSupported('tools.1.name', undefined, 'schema_validation')).toBe(true)
        expect(isFieldSupported('tools.0.name', undefined, 'resource_validation')).toBe(false)
      })

      it('registers complex pattern for array indices', () => {
        registerField(/^datasource_ids\.\d+$/)
        expect(isFieldSupported('datasource_ids.0')).toBe(true)
        expect(isFieldSupported('datasource_ids.5')).toBe(true)
        expect(isFieldSupported('datasource_ids.name')).toBe(false)
      })

      it('supports multiple patterns matching same path', () => {
        registerField(/^config\..*/, 'assistant')
        registerField(/^config\.model/, 'tool')
        expect(isFieldSupported('config.model', 'assistant')).toBe(true)
        expect(isFieldSupported('config.model', 'tool')).toBe(true)
      })
    })
  })

  describe('registerFields', () => {
    it('registers multiple exact paths at once', () => {
      registerFields(['field_1', 'field_2', 'field_3'])
      expect(isFieldSupported('field_1')).toBe(true)
      expect(isFieldSupported('field_2')).toBe(true)
      expect(isFieldSupported('field_3')).toBe(true)
    })

    it('registers multiple patterns at once', () => {
      registerFields([/^pattern_1\..*/, /^pattern_2\..*/])
      expect(isFieldSupported('pattern_1.test')).toBe(true)
      expect(isFieldSupported('pattern_2.test')).toBe(true)
    })

    it('registers mixed exact paths and patterns', () => {
      registerFields(['exact_field', /^pattern\..*/])
      expect(isFieldSupported('exact_field')).toBe(true)
      expect(isFieldSupported('pattern.test')).toBe(true)
    })

    it('registers multiple fields with node type', () => {
      registerFields(['system_prompt', 'model', 'temperature'], 'assistant')
      expect(isFieldSupported('system_prompt', 'assistant')).toBe(true)
      expect(isFieldSupported('model', 'assistant')).toBe(true)
      expect(isFieldSupported('temperature', 'assistant')).toBe(true)
      expect(isFieldSupported('system_prompt', 'tool')).toBe(false)
    })

    it('registers multiple fields with error type', () => {
      registerFields(['name', 'description'], undefined, 'schema_validation')
      expect(isFieldSupported('name', undefined, 'schema_validation')).toBe(true)
      expect(isFieldSupported('description', undefined, 'schema_validation')).toBe(true)
    })

    it('registers empty array without error', () => {
      expect(() => registerFields([])).not.toThrow()
    })
  })

  describe('isFieldSupported', () => {
    beforeEach(() => {
      // Register test fields
      registerField('exact_no_constraints')
      registerField('exact_assistant_only', 'assistant')
      registerField('exact_schema_error_only', undefined, 'schema_validation')
      registerField('exact_combined', 'assistant', 'schema_validation')
      registerField(/^pattern_.*/)
      registerField(/^pattern_assistant_.*/, 'assistant')
    })

    describe('exact path matching', () => {
      it('matches exact path with no constraints', () => {
        expect(isFieldSupported('exact_no_constraints')).toBe(true)
        expect(isFieldSupported('exact_no_constraints', 'any_node_type')).toBe(true)
        expect(isFieldSupported('exact_no_constraints', undefined, 'any_error_type')).toBe(true)
      })

      it('matches exact path with node type constraint', () => {
        expect(isFieldSupported('exact_assistant_only', 'assistant')).toBe(true)
        expect(isFieldSupported('exact_assistant_only', 'tool')).toBe(false)
        expect(isFieldSupported('exact_assistant_only')).toBe(true) // No nodeType provided = always match
      })

      it('matches exact path with error type constraint', () => {
        expect(isFieldSupported('exact_schema_error_only', undefined, 'schema_validation')).toBe(
          true
        )
        expect(isFieldSupported('exact_schema_error_only', undefined, 'resource_validation')).toBe(
          false
        )
        expect(isFieldSupported('exact_schema_error_only')).toBe(true) // No errorType provided = always match
      })

      it('matches exact path with both constraints', () => {
        expect(isFieldSupported('exact_combined', 'assistant', 'schema_validation')).toBe(true)
        expect(isFieldSupported('exact_combined', 'tool', 'schema_validation')).toBe(false)
        expect(isFieldSupported('exact_combined', 'assistant', 'resource_validation')).toBe(false)
        expect(isFieldSupported('exact_combined', 'assistant')).toBe(true) // No errorType = match
        expect(isFieldSupported('exact_combined', undefined, 'schema_validation')).toBe(true) // No nodeType = match
      })
    })

    describe('pattern matching', () => {
      it('matches pattern with no constraints', () => {
        expect(isFieldSupported('pattern_test')).toBe(true)
        expect(isFieldSupported('pattern_anything')).toBe(true)
        expect(isFieldSupported('not_pattern')).toBe(false)
      })

      it('matches pattern with node type constraint', () => {
        expect(isFieldSupported('pattern_assistant_test', 'assistant')).toBe(true)
        // Note: Earlier pattern /^pattern_.*/ with no constraints also matches, so this returns true
        expect(isFieldSupported('pattern_assistant_test', 'tool')).toBe(true)
        expect(isFieldSupported('pattern_assistant_test')).toBe(true) // No nodeType = match
      })

      it('prefers exact match over pattern match', () => {
        registerField('exact_priority')
        registerField(/^exact_.*/, 'assistant')

        // Exact match has no constraints, so it should match regardless of nodeType
        expect(isFieldSupported('exact_priority', 'tool')).toBe(true)
        // Pattern would reject 'tool', but exact match takes precedence
      })
    })

    describe('edge cases', () => {
      it('returns false for empty string path', () => {
        expect(isFieldSupported('')).toBe(false)
      })

      it('handles paths with special characters', () => {
        registerField('field.with.dots')
        registerField('field_with_underscores')
        registerField('field-with-dashes')

        expect(isFieldSupported('field.with.dots')).toBe(true)
        expect(isFieldSupported('field_with_underscores')).toBe(true)
        expect(isFieldSupported('field-with-dashes')).toBe(true)
      })

      it('handles undefined nodeType parameter', () => {
        registerField('field_optional_node', 'assistant')
        expect(isFieldSupported('field_optional_node', undefined)).toBe(true)
      })

      it('handles undefined errorType parameter', () => {
        registerField('field_optional_error', undefined, 'schema_validation')
        expect(isFieldSupported('field_optional_error', undefined, undefined)).toBe(true)
      })
    })
  })

  describe('isAdvancedConfigField', () => {
    it('returns true for exact advanced config fields', () => {
      expect(isAdvancedConfigField('enable_summarization_node')).toBe(true)
      expect(isAdvancedConfigField('tokens_limit_before_summarization')).toBe(true)
      expect(isAdvancedConfigField('messages_limit_before_summarization')).toBe(true)
      expect(isAdvancedConfigField('max_concurrency')).toBe(true)
      expect(isAdvancedConfigField('recursion_limit')).toBe(true)
    })

    it('returns true for nested retry_policy fields', () => {
      expect(isAdvancedConfigField('retry_policy.max_attempts')).toBe(true)
      expect(isAdvancedConfigField('retry_policy.initial_interval')).toBe(true)
      expect(isAdvancedConfigField('retry_policy.max_interval')).toBe(true)
      expect(isAdvancedConfigField('retry_policy.backoff_factor')).toBe(true)
    })

    it('returns true for deeply nested advanced config fields', () => {
      expect(isAdvancedConfigField('enable_summarization_node.nested.field')).toBe(true)
      expect(isAdvancedConfigField('retry_policy.max_attempts.some.deep.path')).toBe(true)
    })

    it('returns false for non-advanced fields', () => {
      expect(isAdvancedConfigField('system_prompt')).toBe(false)
      expect(isAdvancedConfigField('model')).toBe(false)
      expect(isAdvancedConfigField('temperature')).toBe(false)
      expect(isAdvancedConfigField('name')).toBe(false)
      expect(isAdvancedConfigField('description')).toBe(false)
    })

    it('returns false for fields with similar names', () => {
      expect(isAdvancedConfigField('enable_summarization')).toBe(false)
      expect(isAdvancedConfigField('retry_policy')).toBe(false) // Exact match of prefix, but not in list
      expect(isAdvancedConfigField('max_concurrency_setting')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isAdvancedConfigField('')).toBe(false)
    })

    it('handles fields that start with advanced config field names', () => {
      expect(isAdvancedConfigField('max_concurrency.value')).toBe(true)
      expect(isAdvancedConfigField('recursion_limit.override')).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('handles workflow editor field registration pattern', () => {
      // Simulate common workflow editor registrations
      registerFields(['system_prompt', 'model', 'temperature'], 'assistant')
      registerFields(['name', 'integration_alias', 'arguments'], 'tool')
      registerField(/^toolsarray\.\d+\.name/, 'assistant', 'schema_validation')

      // Test assistant fields
      expect(isFieldSupported('system_prompt', 'assistant')).toBe(true)
      expect(isFieldSupported('model', 'assistant')).toBe(true)
      expect(isFieldSupported('temperature', 'assistant')).toBe(true)

      // Test tool fields
      expect(isFieldSupported('name', 'tool')).toBe(true)
      expect(isFieldSupported('integration_alias', 'tool')).toBe(true)

      // Test pattern for array fields
      expect(isFieldSupported('toolsarray.0.name', 'assistant', 'schema_validation')).toBe(true)
      expect(isFieldSupported('toolsarray.5.name', 'assistant', 'schema_validation')).toBe(true)
      expect(isFieldSupported('toolsarray.0.name', 'tool', 'schema_validation')).toBe(false)
    })

    it('handles multiple error types for same field', () => {
      registerField('validation_field', 'assistant', 'schema_validation')
      registerField('validation_field', 'assistant', 'cross_reference_validation')

      expect(isFieldSupported('validation_field', 'assistant', 'schema_validation')).toBe(true)
      expect(isFieldSupported('validation_field', 'assistant', 'cross_reference_validation')).toBe(
        true
      )
      expect(isFieldSupported('validation_field', 'assistant', 'resource_validation')).toBe(false)
    })

    it('distinguishes between similar field paths', () => {
      registerField('mytools', 'assistant')
      registerField(/^mytools\.\d+$/, 'tool')
      registerField(/^mytools\.\d+\.name/, 'assistant')

      expect(isFieldSupported('mytools', 'assistant')).toBe(true)
      expect(isFieldSupported('mytools', 'tool')).toBe(false)
      expect(isFieldSupported('mytools.0', 'tool')).toBe(true)
      expect(isFieldSupported('mytools.0', 'assistant')).toBe(false)
      expect(isFieldSupported('mytools.0.name', 'assistant')).toBe(true)
      expect(isFieldSupported('mytools.0.name', 'tool')).toBe(false)
    })
  })
})
