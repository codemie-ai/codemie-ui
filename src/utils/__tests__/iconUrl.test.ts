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

import { filesStore } from '@/store/files'

import { decodeIconName, registerLocalIconPreview, resolveIconUrl } from '../iconUrl'

vi.mock('@/store/files', () => ({
  filesStore: { getFileURL: vi.fn((token: string) => `/api/v1/files/${token}`) },
}))

const encodeToken = (name: string) =>
  btoa(['image/png', 'u-1', name].map((word) => `${word.length}~${word}`).join(''))

const WORKFLOW_ICON_TOKEN = encodeToken('workflow-icons/0123456789abcdef0123456789abcdef.png')
const OTHER_FILE_TOKEN = encodeToken('notes.txt')

describe('resolveIconUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['https://example.com/icon.png'],
    ['http://example.com/icon.png'],
    ['/api/v1/files/abc'],
    ['data:image/png;base64,AAAA'],
  ])('leaves %s unchanged', (value) => {
    expect(resolveIconUrl(value)).toBe(value)
    expect(filesStore.getFileURL).not.toHaveBeenCalled()
  })

  it.each([[''], [null], [undefined]])('returns %s unchanged', (value) => {
    expect(resolveIconUrl(value)).toBe(value)
  })

  it('resolves a workflow icon token through filesStore.getFileURL', () => {
    expect(resolveIconUrl(WORKFLOW_ICON_TOKEN)).toBe(`/api/v1/files/${WORKFLOW_ICON_TOKEN}`)
    expect(filesStore.getFileURL).toHaveBeenCalledWith(WORKFLOW_ICON_TOKEN)
  })

  it('prefers a registered local preview over the server URL', async () => {
    await registerLocalIconPreview('MTB+bG9jYWw=', new File(['x'], 'a.png', { type: 'image/png' }))

    expect(resolveIconUrl('MTB+bG9jYWw=')).toBe('data:image/png;base64,eA==')
  })

  it('replaces the preview when the same token is registered again', async () => {
    await registerLocalIconPreview(
      'MTB+cmVyZWdpc3Rlcg==',
      new File(['x'], 'a.png', { type: 'image/png' })
    )
    await registerLocalIconPreview(
      'MTB+cmVyZWdpc3Rlcg==',
      new File(['y'], 'a.png', { type: 'image/png' })
    )

    expect(resolveIconUrl('MTB+cmVyZWdpc3Rlcg==')).toBe('data:image/png;base64,eQ==')
  })

  it('evicts the oldest preview once more than 20 are registered', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' })

    await [...Array(21).keys()].reduce(
      (previous, i) => previous.then(() => registerLocalIconPreview(`evict-token-${i}`, file)),
      Promise.resolve()
    )

    expect(resolveIconUrl('evict-token-0')).toBe('evict-token-0')
    expect(resolveIconUrl('evict-token-20')).toBe('data:image/png;base64,eA==')
  })

  it('leaves a decodable token that is not a workflow icon unchanged', () => {
    expect(resolveIconUrl(OTHER_FILE_TOKEN)).toBe(OTHER_FILE_TOKEN)
    expect(filesStore.getFileURL).not.toHaveBeenCalled()
  })
})

describe('decodeIconName', () => {
  it('returns the stored name for a workflow icon token', () => {
    expect(decodeIconName(WORKFLOW_ICON_TOKEN)).toBe(
      'workflow-icons/0123456789abcdef0123456789abcdef.png'
    )
  })

  it('returns null for values that are not tokens', () => {
    expect(decodeIconName('not base64!')).toBeNull()
    expect(decodeIconName(OTHER_FILE_TOKEN)).toBeNull()
  })
})
