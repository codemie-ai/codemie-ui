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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ChatPromptVoiceRecorder from '../ChatPromptVoiceRecorder'

vi.mock('@/store/chats', () => ({ chatsStore: { recognizeSpeech: vi.fn() } }))

const mockGetUserMedia = vi.fn()
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
})

describe('ChatPromptVoiceRecorder', () => {
  it('has accessible name "Use voice" when idle', () => {
    render(<ChatPromptVoiceRecorder onTextReady={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Use voice' })).toBeInTheDocument()
  })

  it('has accessible name "Stop listening" while recording', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValueOnce(stream)

    render(<ChatPromptVoiceRecorder onTextReady={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Use voice' })
    fireEvent.click(button)

    expect(await screen.findByRole('button', { name: 'Stop listening' })).toBeInTheDocument()
  })
})
