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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import ChatHeaderDownloadConversationButton from '../ChatHeaderDownloadConversationButton/ChatHeaderDownloadConversationButton'

describe('ChatHeaderDownloadConversationButton', () => {
  it('renders the export trigger button', () => {
    render(<ChatHeaderDownloadConversationButton />)

    const button = screen.getByLabelText('Export Conversation')
    expect(button).toBeInTheDocument()
  })

  it('has correct tooltip on main button', () => {
    const { container } = render(<ChatHeaderDownloadConversationButton />)

    const button = container.querySelector('[data-tooltip-content="Export Conversation"]')
    expect(button).toBeInTheDocument()
  })

  it('does not render the export dialog until opened', () => {
    render(<ChatHeaderDownloadConversationButton />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the export dialog when clicked', async () => {
    render(<ChatHeaderDownloadConversationButton />)
    await userEvent.click(screen.getByLabelText('Export Conversation'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Export Conversation')).toBeInTheDocument()
  })
})
