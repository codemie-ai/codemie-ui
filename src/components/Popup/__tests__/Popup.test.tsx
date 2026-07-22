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

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import Popup, { PopupProps } from '../Popup'

vi.mock('@/assets/icons/cross.svg?react', () => ({
  default: () => <span aria-label="close icon"></span>,
}))

const mockOnHide = vi.fn()
const mockOnSubmit = vi.fn()

const renderPopup = (props: Partial<PopupProps> = {}) => {
  const defaultProps = {
    visible: true,
    onHide: mockOnHide,
    onSubmit: mockOnSubmit,
    header: 'Test Popup',
  }

  return render(
    <Popup {...defaultProps} {...props}>
      {props.children}
    </Popup>
  )
}

let user

describe('Popup', () => {
  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('is not rendered when "visible" is false', () => {
    renderPopup({ visible: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the header, content, and footer when "visible" is true', () => {
    renderPopup()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Popup')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('should call onSubmit when the submit button is clicked', async () => {
    renderPopup()
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(mockOnSubmit).toHaveBeenCalledTimes(1)
  })

  it('does not call onSubmit when the submit button is disabled and clicked', async () => {
    renderPopup({ submitDisabled: true })
    const submitButton = screen.getByRole('button', { name: 'Create' })
    expect(submitButton).toBeDisabled()
    await user.click(submitButton)
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('calls onHide when the cancel button is clicked', async () => {
    renderPopup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockOnHide).toHaveBeenCalledTimes(1)
  })

  it('calls onHide when the Escape key is pressed', async () => {
    renderPopup()
    const cancelEvent = new Event('cancel', { cancelable: true })

    fireEvent(screen.getByRole('dialog'), cancelEvent)

    expect(cancelEvent.defaultPrevented).toBe(true)
    expect(mockOnHide).toHaveBeenCalledTimes(1)
  })

  it('keeps body scroll locked until the last popup closes', () => {
    document.body.style.overflow = 'auto'
    const { rerender } = render(
      <>
        <Popup visible onHide={mockOnHide} header="Outer Popup" />
        <Popup visible onHide={mockOnHide} header="Inner Popup" />
      </>
    )

    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <>
        <Popup visible onHide={mockOnHide} header="Outer Popup" />
        <Popup visible={false} onHide={mockOnHide} header="Inner Popup" />
      </>
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <>
        <Popup visible={false} onHide={mockOnHide} header="Outer Popup" />
        <Popup visible={false} onHide={mockOnHide} header="Inner Popup" />
      </>
    )
    expect(document.body.style.overflow).toBe('auto')
  })

  it('handles cancel only for the targeted topmost popup', () => {
    const outerOnHide = vi.fn()
    const innerOnHide = vi.fn()
    render(
      <>
        <Popup visible onHide={outerOnHide} header="Outer Popup" />
        <Popup visible onHide={innerOnHide} header="Inner Popup" />
      </>
    )
    const dialogs = screen.getAllByRole('dialog')

    fireEvent(dialogs[1], new Event('cancel', { cancelable: true }))

    expect(innerOnHide).toHaveBeenCalledTimes(1)
    expect(outerOnHide).not.toHaveBeenCalled()
  })

  it('renders custom text for submit and cancel buttons', () => {
    renderPopup({ submitText: 'Save Changes', cancelText: 'Go Back' })
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument()
  })

  it('does not render the footer when "hideFooter" is true', () => {
    renderPopup({ hideFooter: true })
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })

  it('does not render the close icon when "hideClose" is true', () => {
    renderPopup({ hideClose: true })
    expect(screen.queryByRole('button', { name: /close icon/i })).not.toBeInTheDocument()
  })

  it('renders custom header content instead of the default header text', () => {
    const customHeader = <h2 data-testid="custom-header">My Custom Header</h2>
    renderPopup({ headerContent: customHeader })

    expect(screen.getByTestId('custom-header')).toBeInTheDocument()
    expect(screen.queryByText('Test Popup')).not.toBeInTheDocument()
  })

  it('renders custom footer content instead of the default buttons', () => {
    const customFooter = <div data-testid="custom-footer">Custom Footer Action</div>
    renderPopup({ footerContent: customFooter })

    expect(screen.getByTestId('custom-footer')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('applies custom className to the dialog element', () => {
    renderPopup({ className: 'my-custom-dialog' })
    expect(screen.getByRole('dialog')).toHaveClass('my-custom-dialog')
  })
})
