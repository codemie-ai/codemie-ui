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

import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useFilePaste } from '../useFilePaste'

describe('useFilePaste', () => {
  it('calls the latest onFilePaste after the callback identity changes', () => {
    const first = vi.fn()
    const second = vi.fn()
    const root = document.createElement('div')
    const quill = { root }

    const { result, rerender } = renderHook(({ onFilePaste }) => useFilePaste({ onFilePaste }), {
      initialProps: { onFilePaste: first },
    })

    act(() => {
      result.current.setupPasteHandler(quill)
    })

    rerender({ onFilePaste: second })

    const file = new File(['x'], 'doc.txt', { type: 'text/plain' })
    const item = {
      kind: 'file',
      type: 'text/plain',
      getAsFile: () => file,
    } as DataTransferItem

    const event = new Event('paste', { cancelable: true }) as ClipboardEvent
    Object.defineProperty(event, 'clipboardData', {
      value: { items: [item] },
    })

    act(() => {
      root.dispatchEvent(event)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith([file])
  })
})
