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
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import WorkflowCodeBlock from '../WorkflowCodeBlock'

vi.mock('@/components/CodeBlock', () => ({
  default: ({
    title,
    text,
    downloadFilename,
    language,
    headerActionsTemplate,
  }: {
    title?: string
    text: string
    downloadFilename?: string
    language: string
    headerActionsTemplate?: React.ReactNode
  }) => (
    <div data-testid="code-block">
      {title && <div data-testid="code-block-title">{title}</div>}
      <pre data-testid="code-block-text">{text}</pre>
      <div data-testid="code-block-filename">{downloadFilename}</div>
      <div data-testid="code-block-language">{language}</div>
      {headerActionsTemplate}
    </div>
  ),
}))

vi.mock('@/components/Popup', () => ({
  default: ({
    children,
    visible,
    header,
    onHide,
  }: {
    children: React.ReactNode
    visible: boolean
    header?: string
    onHide?: () => void
  }) =>
    visible ? (
      <div data-testid="popup">
        <div data-testid="popup-header">{header}</div>
        <button onClick={onHide}>Hide</button>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/assets/icons/expand.svg?react', () => ({
  default: () => <svg data-testid="expand-icon" />,
}))

describe('WorkflowCodeBlock', () => {
  let user: UserEvent

  const defaultProps = {
    text: 'Sample code text',
    title: 'Code Title',
    downloadFilename: 'output.txt',
  }

  beforeEach(() => {
    user = userEvent.setup()
  })

  it('renders code block with text', () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    expect(screen.getByTestId('code-block-text')).toHaveTextContent('Sample code text')
  })

  it('renders code block with title', () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    expect(screen.getByTestId('code-block-title')).toHaveTextContent('Code Title')
  })

  it('renders code block with download filename', () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    expect(screen.getByTestId('code-block-filename')).toHaveTextContent('output.txt')
  })

  it('renders expand button', () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
  })

  it('does not show popup initially', () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    expect(screen.queryByTestId('popup')).not.toBeInTheDocument()
  })

  it('shows popup when expand button is clicked', async () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    expect(screen.getByTestId('popup')).toBeInTheDocument()
  })

  it('displays title in popup header', async () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    expect(screen.getByTestId('popup-header')).toHaveTextContent('Code Title')
  })

  it('hides popup when hide button is clicked', async () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    expect(screen.getByTestId('popup')).toBeInTheDocument()

    await user.click(screen.getByText('Hide'))

    expect(screen.queryByTestId('popup')).not.toBeInTheDocument()
  })

  it('shows code block inside popup', async () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    const codeBlocks = screen.getAllByTestId('code-block')
    expect(codeBlocks.length).toBeGreaterThan(1)
  })

  it('toggles popup visibility when expand button is clicked multiple times', async () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    const expandButton = screen.getByTestId('expand-icon').closest('button')

    await user.click(expandButton!)
    expect(screen.getByTestId('popup')).toBeInTheDocument()

    await user.click(expandButton!)
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument()

    await user.click(expandButton!)
    expect(screen.getByTestId('popup')).toBeInTheDocument()
  })

  it('renders without title', () => {
    render(<WorkflowCodeBlock text="Sample text" />)

    expect(screen.queryByTestId('code-block-title')).not.toBeInTheDocument()
    expect(screen.getByTestId('code-block-text')).toHaveTextContent('Sample text')
  })

  it('renders without download filename', () => {
    render(<WorkflowCodeBlock text="Sample text" title="Title" />)

    expect(screen.getByTestId('code-block-filename')).toBeEmptyDOMElement()
  })

  it('uses txt language for code blocks', () => {
    render(<WorkflowCodeBlock {...defaultProps} />)

    const languages = screen.getAllByTestId('code-block-language')
    languages.forEach((lang) => {
      expect(lang).toHaveTextContent('txt')
    })
  })
})
