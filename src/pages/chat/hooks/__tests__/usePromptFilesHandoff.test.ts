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

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FileMetadata } from '@/hooks/useFileUpload'

import { usePromptFilesHandoff } from '../usePromptFilesHandoff'

const uploaded = { fileName: 'report.pdf', fileId: 'file-1' } as FileMetadata
const uploading = { fileName: 'draft.docx' } as FileMetadata

const renderHandoff = (chatId: string, isMobileLayout: boolean) =>
  renderHook(({ chat, mobile }) => usePromptFilesHandoff(chat, mobile), {
    initialProps: { chat: chatId, mobile: isMobileLayout },
  })

describe('usePromptFilesHandoff', () => {
  it('hands nothing back while the layout stays the same', () => {
    const { result, rerender } = renderHandoff('chat-1', false)
    result.current.onFilesChange([uploaded])

    rerender({ chat: 'chat-1', mobile: false })

    expect(result.current.initialFiles).toBeUndefined()
  })

  it('hands the uploaded attachments back when the layout switches', () => {
    const { result, rerender } = renderHandoff('chat-1', false)
    result.current.onFilesChange([uploaded, uploading])

    rerender({ chat: 'chat-1', mobile: true })
    expect(result.current.initialFiles).toEqual([uploaded])

    rerender({ chat: 'chat-1', mobile: true })
    expect(result.current.initialFiles).toBeUndefined()
  })

  it('hands nothing back to another chat', () => {
    const { result, rerender } = renderHandoff('chat-1', true)
    result.current.onFilesChange([uploaded])

    rerender({ chat: 'chat-2', mobile: false })

    expect(result.current.initialFiles).toBeUndefined()
  })
})
