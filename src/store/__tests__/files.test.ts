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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { filesStore } from '@/store/files'
import api from '@/utils/api'

// setupTests.unit.ts already mocks @/utils/api globally — api.get/post/etc are
// vi.fn(), but downloadFileStream is bound to the real implementation. We spy
// on the shared mock object so both the test and filesStore.ts see the same spy.

describe('filesStore.downloadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls downloadFileStream when fileId is a UUID', async () => {
    const downloadSpy = vi.spyOn(api, 'downloadFileStream').mockResolvedValue(true)

    await filesStore.downloadFile('a1b2c3d4-e5f6-7890-abcd-ef1234567890')

    expect(downloadSpy).toHaveBeenCalledWith('v1/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('uses the anchor approach when fileId is base64-encoded with a decodable name', async () => {
    // legacy format: mimeType_user_originalFileName encoded as base64
    const encoded = btoa('application/xlsx_user_report.xlsx')
    vi.mocked(api.get).mockResolvedValueOnce({
      blob: async () => new Blob(['data'], { type: 'application/xlsx' }),
    } as any)
    const downloadSpy = vi.spyOn(api, 'downloadFileStream')

    await filesStore.downloadFile(encoded)

    expect(api.get).toHaveBeenCalledWith(`v1/files/${encoded}`)
    expect(downloadSpy).not.toHaveBeenCalled()
  })
})
