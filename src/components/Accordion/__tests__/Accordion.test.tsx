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
import { describe, expect, it } from 'vitest'

import Accordion from '../Accordion'

describe('Accordion Focus Contrast', () => {
  it('renders accordion with title and description', () => {
    render(
      <Accordion title="Available Tools" description="List of all available tools">
        <div>Content</div>
      </Accordion>
    )

    expect(screen.getByText('Available Tools')).toBeInTheDocument()
    expect(screen.getByText('List of all available tools')).toBeInTheDocument()
  })

  it('applies visible focus ring styling when keyboard focused', async () => {
    const user = userEvent.setup()
    render(
      <Accordion title="Available Tools">
        <div>Content</div>
      </Accordion>
    )

    const headerButton = screen.getByRole('button')
    expect(headerButton).toBeInTheDocument()

    // Tab into the accordion header
    await user.tab()
    expect(headerButton).toHaveFocus()

    // Verify it contains the focus-visible ring styles for WCAG 2.1 AA SC 1.4.11 / 2.4.7 compliance
    expect(headerButton.className).toContain('focus-visible:ring-2')
    expect(headerButton.className).toContain('focus-visible:ring-border-accent')
  })
})
