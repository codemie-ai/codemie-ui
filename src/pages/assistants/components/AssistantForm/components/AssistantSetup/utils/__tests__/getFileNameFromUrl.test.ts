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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { decodeFileName } from '@/utils/utils'

import { getFileNameFromUrl, isBackendFileUrl } from '../getFileNameFromUrl'

vi.mock('@/utils/utils', () => ({
  decodeFileName: vi.fn(),
}))

describe('getFileNameFromUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when given an empty or falsy value', () => {
    it('should return empty string for an empty string', () => {
      expect(getFileNameFromUrl('')).toBe('')
    })
  })

  describe('when given a backend file URL (contains /v1/files/)', () => {
    it('should extract the file ID and decode it as a filename', () => {
      vi.mocked(decodeFileName).mockReturnValue({
        originalFileName: 'document.pdf',
        mimeType: 'application/pdf',
        user: 'user1',
      })

      const result = getFileNameFromUrl('https://example.com/v1/files/encodedFileId')

      expect(decodeFileName).toHaveBeenCalledWith('encodedFileId')
      expect(result).toBe('document.pdf')
    })

    it('should work with relative backend URLs', () => {
      vi.mocked(decodeFileName).mockReturnValue({
        originalFileName: 'document.pdf',
        mimeType: 'application/pdf',
        user: 'user1',
      })

      const result = getFileNameFromUrl('/api/v1/files/encodedFileId')

      expect(decodeFileName).toHaveBeenCalledWith('encodedFileId')
      expect(result).toBe('document.pdf')
    })

    it('should return the raw file ID when decoding fails', () => {
      vi.mocked(decodeFileName).mockImplementation(() => {
        throw new Error('decode error')
      })

      const result = getFileNameFromUrl('https://example.com/v1/files/rawFileId')

      expect(result).toBe('rawFileId')
    })

    it('should return the raw file ID when decodeFileName returns null originalFileName', () => {
      vi.mocked(decodeFileName).mockReturnValue({
        originalFileName: '',
        mimeType: 'application/pdf',
        user: 'user1',
      })

      const result = getFileNameFromUrl('https://example.com/v1/files/someFileId')

      expect(result).toBe('someFileId')
    })
  })

  describe('when given a non-backend URL or plain string', () => {
    it('should return the full URL for external image URLs', () => {
      const url = 'https://example.com/images/photo.png'
      const result = getFileNameFromUrl(url)

      expect(decodeFileName).not.toHaveBeenCalled()
      expect(result).toBe(url)
    })

    it('should return the raw string for plain strings without /v1/files/', () => {
      const result = getFileNameFromUrl('someEncodedId')

      expect(result).toBe('someEncodedId')
    })

    it('should return the full URL when URL contains /files/ but not /v1/files/', () => {
      const url = 'https://example.com/files/photo.png'
      const result = getFileNameFromUrl(url)

      expect(decodeFileName).not.toHaveBeenCalled()
      expect(result).toBe(url)
    })
  })

  describe('bare workflow icon token', () => {
    const token = 'MTB+aW1h'

    it('is recognised as a backend file and shows the name without the workflow-icons prefix', () => {
      vi.mocked(decodeFileName).mockReturnValue({
        originalFileName: 'workflow-icons/0123abcd.png',
        mimeType: 'image/png',
        user: 'user1',
      })

      expect(isBackendFileUrl(token)).toBe(false)
      expect(getFileNameFromUrl(token)).toBe('0123abcd.png')
    })

    it('is not recognised when the decoded name is outside the workflow-icons namespace', () => {
      vi.mocked(decodeFileName).mockReturnValue({
        originalFileName: 'notes.txt',
        mimeType: 'text/plain',
        user: 'user1',
      })

      expect(isBackendFileUrl(token)).toBe(false)
      expect(getFileNameFromUrl(token)).toBe(token)
    })

    it('does not treat the retired /v1/workflows/icon/ path as a backend file', () => {
      const url = '/api/v1/workflows/icon/abc123'

      expect(isBackendFileUrl(url)).toBe(false)
      expect(getFileNameFromUrl(url)).toBe(url)
    })
  })
})
