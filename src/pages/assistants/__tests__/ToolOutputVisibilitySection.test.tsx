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

import ToolOutputVisibilitySection from '../components/AssistantForm/components/ToolOutputVisibilitySection'

const HELPER =
  "When enabled, end users see only the final assistant response. Tool calls, intermediate outputs, raw payloads, and execution traces stay hidden, and conversation settings can't turn them back on."
const WARNING =
  'This applies to everyone chatting with this assistant, including you. Turn it off to inspect tool execution while testing.'

describe('ToolOutputVisibilitySection', () => {
  it('always shows the helper tooltip, and no warning when OFF', () => {
    render(<ToolOutputVisibilitySection value={false} onChange={vi.fn()} onBlur={vi.fn()} />)
    expect(screen.getByText(HELPER)).toBeInTheDocument()
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
  })

  it('shows the warning when ON', () => {
    render(<ToolOutputVisibilitySection value onChange={vi.fn()} onBlur={vi.fn()} />)
    expect(screen.getByText(WARNING)).toBeInTheDocument()
  })

  it.each([undefined, null])('treats %s as OFF', (value) => {
    render(<ToolOutputVisibilitySection value={value} onChange={vi.fn()} onBlur={vi.fn()} />)
    expect(
      screen.getByRole('switch', { name: /Hide tool outputs from end users/ })
    ).not.toBeChecked()
  })

  it('calls onChange with the new boolean', () => {
    const onChange = vi.fn()
    render(<ToolOutputVisibilitySection value={false} onChange={onChange} onBlur={vi.fn()} />)
    fireEvent.click(screen.getByRole('switch', { name: /Hide tool outputs from end users/ }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
