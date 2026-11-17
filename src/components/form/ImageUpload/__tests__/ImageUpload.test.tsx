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

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { registerLocalIconPreview } from '@/utils/iconUrl'

import ImageUpload from '../ImageUpload'

vi.mock('@/store/files', () => ({
  filesStore: {
    getFileURL: vi.fn((token: string) => `/api/v1/files/${token}`),
    uploadFiles: vi.fn(),
  },
}))

const previewSrc = (container: HTMLElement) => container.querySelector('img')?.getAttribute('src')

describe('ImageUpload preview', () => {
  it('shows the local preview for an icon uploaded in this session', async () => {
    await registerLocalIconPreview(
      'MTB+cHJldmlldw==',
      new File(['x'], 'a.png', { type: 'image/png' })
    )

    const { container } = render(<ImageUpload value="MTB+cHJldmlldw==" onChange={vi.fn()} />)

    expect(previewSrc(container)).toBe('data:image/png;base64,eA==')
  })

  it('shows a full image URL unchanged', () => {
    const { container } = render(
      <ImageUpload value="https://example.com/icon.png" onChange={vi.fn()} />
    )

    expect(previewSrc(container)).toBe('https://example.com/icon.png')
  })
})
