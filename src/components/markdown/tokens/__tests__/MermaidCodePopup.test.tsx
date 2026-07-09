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
import { describe, it, expect, vi } from 'vitest'

import MermaidCodePopup from '../MermaidCodePopup'

vi.mock('@/assets/icons/cross.svg?react', () => ({
  default: () => <span aria-label="close icon"></span>,
}))

vi.mock('@/components/CodeBlock/CodeBlock', () => ({
  default: ({ language, text }: { language: string; text: string }) => (
    <div data-testid="code-block" data-language={language}>
      {text}
    </div>
  ),
}))

const defaultProps = {
  visible: true,
  onClose: vi.fn(),
  code: 'graph TD\nA --> B',
}

describe('MermaidCodePopup', () => {
  it('renders nothing when not visible', () => {
    render(<MermaidCodePopup {...defaultProps} visible={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the "Diagram Source Code" header when visible', () => {
    render(<MermaidCodePopup {...defaultProps} />)
    expect(screen.getByText('Diagram Source Code')).toBeInTheDocument()
  })

  it('renders the code block content when visible', () => {
    render(<MermaidCodePopup {...defaultProps} />)
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
    expect(screen.getByTestId('code-block')).toHaveTextContent('graph TD')
  })

  it('applies width className so the popup is wide enough to review the diagram', () => {
    render(<MermaidCodePopup {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('w-[75%]')
    expect(dialog).toHaveClass('max-w-[1000px]')
  })
})
