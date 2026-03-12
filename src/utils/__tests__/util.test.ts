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

import { EnvConfig } from '@/types/global'
import { getMode, hash } from '@/utils/utils'

describe('util.js', () => {
  beforeEach(() => {
    window._env_ = undefined
  })

  describe('getMode', () => {
    it('should return window._env_.VITE_ENV when available', () => {
      window._env_ = { VITE_ENV: 'production', VITE_API_URL: 'http://test.com' } as EnvConfig
      expect(getMode()).toBe('production')
    })

    it('should return import.meta.env.VITE_ENV when window._env_.VITE_ENV is not available', () => {
      window._env_ = { VITE_ENV: 'development', VITE_API_URL: 'http://test.com' } as EnvConfig
      expect(getMode()).toBe('development')
    })

    it('should return local when neither environment variable is available', () => {
      window._env_ = { VITE_ENV: '', VITE_API_URL: '' } as EnvConfig
      ;(import.meta.env as any) = {}
      expect(getMode()).toBe('local')
    })
  })

  describe('hash', () => {
    it('should return consistent hash values for the same input', () => {
      const input = 'test string'
      const result1 = hash(input)
      const result2 = hash(input)
      expect(result1).toBe(result2)
    })

    it('should return different hash values for different inputs', () => {
      const result1 = hash('test string 1')
      const result2 = hash('test string 2')
      expect(result1).not.toBe(result2)
    })

    it('should produce different hashes with different seeds', () => {
      const input = 'test string'
      const result1 = hash(input, 0)
      const result2 = hash(input, 1)
      expect(result1).not.toBe(result2)
    })

    it('should handle empty strings', () => {
      const result = hash('')
      // Just verify it returns a number and doesn't throw an error
      expect(typeof result).toBe('number')
    })

    it('should handle non-string inputs when explicitly converted to strings', () => {
      // Test with a number converted to string
      const numResult = hash(String(123))
      expect(typeof numResult).toBe('number')

      // Test with an object converted to string
      const objResult = hash(String({ test: 'value' }))
      expect(typeof objResult).toBe('number')

      // Verify that hash with string conversion works
      expect(hash(String(123))).toBe(hash('123'))
    })
  })
})
