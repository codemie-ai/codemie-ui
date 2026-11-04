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
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import ChatPromptVoiceRecorder from '../ChatPromptVoiceRecorder'

vi.mock('@/store/chats', () => ({ chatsStore: { recognizeSpeech: vi.fn() } }))
vi.mock('primereact/overlaypanel', () => ({
  OverlayPanel: vi.fn(({ children }: { children?: React.ReactNode }) => (
    <div data-testid="overlay-panel">{children}</div>
  )),
}))

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

  it('receives keyboard focus when tabbed to', async () => {
    const user = userEvent.setup()
    render(<ChatPromptVoiceRecorder onTextReady={vi.fn()} />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Use voice' })).toHaveFocus()
  })

  it('has accessible name "Stop listening" while recording', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValueOnce(stream)

    render(<ChatPromptVoiceRecorder onTextReady={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Use voice' })
    fireEvent.click(button)

    expect(await screen.findByRole('button', { name: 'Stop listening' })).toBeInTheDocument()
  })

  const TWO_MODELS = [
    { value: 'whisper', label: 'whisper', isDefault: false },
    { value: 'whisper-azure', label: 'whisper-azure', isDefault: false },
  ]

  it('renders without a model picker when fewer than 2 STT models are configured', () => {
    render(
      <ChatPromptVoiceRecorder
        onTextReady={vi.fn()}
        sttModels={[{ value: 'whisper', label: 'whisper', isDefault: false }]}
        selectedModel="whisper"
        onModelChange={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: /select stt model/i })).not.toBeInTheDocument()
  })

  it('renders a model picker caret when 2 or more STT models are configured', () => {
    render(
      <ChatPromptVoiceRecorder
        onTextReady={vi.fn()}
        sttModels={TWO_MODELS}
        selectedModel="whisper"
        onModelChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /select stt model/i })).toBeInTheDocument()
  })

  it('calls onModelChange with the chosen model when a picker entry is clicked', () => {
    const onModelChange = vi.fn()
    render(
      <ChatPromptVoiceRecorder
        onTextReady={vi.fn()}
        sttModels={TWO_MODELS}
        selectedModel="whisper"
        onModelChange={onModelChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /select stt model/i }))
    fireEvent.click(screen.getByRole('button', { name: 'whisper-azure' }))

    expect(onModelChange).toHaveBeenCalledWith('whisper-azure')
  })

  it('renders without a caret when no sttModels prop is given (backward compat)', () => {
    render(<ChatPromptVoiceRecorder onTextReady={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /select stt model/i })).not.toBeInTheDocument()
  })
})
