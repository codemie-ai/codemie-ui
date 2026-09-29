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
  clearSharedFileGrants,
  resolveSandboxFileUrls,
  resolveSharedFileToken,
  setSharedFileGrants,
} from '@/utils/sharedFileGrants'

const BASE_URL = 'http://api.test'

describe('sharedFileGrants', () => {
  beforeEach(() => {
    clearSharedFileGrants()
  })

  describe('resolveSharedFileToken', () => {
    it('returns the token unchanged when no grants are set', () => {
      expect(resolveSharedFileToken('enc-token-1')).toBe('enc-token-1')
    })

    it('returns the granted token when the map holds it', () => {
      setSharedFileGrants({ 'enc-token-1': 'enc-token-1?share_token=abc' })

      expect(resolveSharedFileToken('enc-token-1')).toBe('enc-token-1?share_token=abc')
    })

    it('returns the token unchanged when the map does not hold it', () => {
      setSharedFileGrants({ 'enc-token-1': 'enc-token-1?share_token=abc' })

      expect(resolveSharedFileToken('enc-token-2')).toBe('enc-token-2')
    })

    it('tolerates a missing map from the backend', () => {
      setSharedFileGrants(undefined)

      expect(resolveSharedFileToken('enc-token-1')).toBe('enc-token-1')
    })

    it('stops resolving once the grants are cleared', () => {
      setSharedFileGrants({ 'enc-token-1': 'enc-token-1?share_token=abc' })
      clearSharedFileGrants()

      expect(resolveSharedFileToken('enc-token-1')).toBe('enc-token-1')
    })
  })

  describe('resolveSandboxFileUrls', () => {
    it('rewrites the sandbox prefix to a request URL without grants (backward-compatibility pin)', () => {
      const message = 'look ![shot](sandbox:/v1/files/enc-token-1) here'

      expect(resolveSandboxFileUrls(message, BASE_URL)).toBe(
        'look ![shot](http://api.test/v1/files/enc-token-1) here'
      )
    })

    it('applies the grant to a mapped token', () => {
      setSharedFileGrants({ 'enc-token-1': 'enc-token-1?share_token=abc' })
      const message = 'look ![shot](sandbox:/v1/files/enc-token-1) here'

      expect(resolveSandboxFileUrls(message, BASE_URL)).toBe(
        'look ![shot](http://api.test/v1/files/enc-token-1?share_token=abc) here'
      )
    })

    it('rewrites every reference in one message', () => {
      setSharedFileGrants({ a: 'a?share_token=abc', b: 'b?share_token=abc' })

      expect(resolveSandboxFileUrls('sandbox:/v1/files/a and sandbox:/v1/files/b', BASE_URL)).toBe(
        'http://api.test/v1/files/a?share_token=abc and http://api.test/v1/files/b?share_token=abc'
      )
    })

    it('leaves a message without file references untouched', () => {
      expect(resolveSandboxFileUrls('no files here', BASE_URL)).toBe('no files here')
    })
  })
})
