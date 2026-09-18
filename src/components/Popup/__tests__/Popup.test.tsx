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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    await user.keyboard('{Escape}')
    expect(mockOnHide).toHaveBeenCalled()
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

  describe('focus management', () => {
    it('moves focus to the close button when the dialog opens', async () => {
      renderPopup()
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
      )
    })

    it('does not move focus when visible is false', () => {
      const btn = document.createElement('button')
      document.body.appendChild(btn)
      btn.focus()
      renderPopup({ visible: false })
      expect(document.activeElement).toBe(btn)
      document.body.removeChild(btn)
    })

    it('focuses the first visible focusable when hideClose is true', async () => {
      renderPopup({
        hideClose: true,
        hideFooter: true,
        children: <input aria-label="folder name" />,
      })
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'folder name' }))
      )
    })

    it('returns focus to the trigger when the dialog closes', async () => {
      const { rerender } = render(
        <>
          <button>Open Dialog</button>
          <Popup visible={false} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Test Popup" />
        </>
      )
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      trigger.focus()

      rerender(
        <>
          <button>Open Dialog</button>
          <Popup visible={true} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Test Popup" />
        </>
      )
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
      )

      await user.click(screen.getByRole('button', { name: 'Close' }))
      expect(mockOnHide).toHaveBeenCalled()

      // Simulate the controlled component responding to onHide by hiding the dialog.
      // PrimeReact's focusElementOnHide ref holds the trigger (captured before our
      // setTimeout moved focus), so it restores focus to the trigger on hide.
      rerender(
        <>
          <button>Open Dialog</button>
          <Popup visible={false} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Test Popup" />
        </>
      )
      await waitFor(() => expect(document.activeElement).toBe(trigger))
    })

    it('only focuses the newly opened dialog when two are stacked', async () => {
      const { rerender } = render(
        <>
          <Popup visible={true} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Dialog One" />
          <Popup visible={false} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Dialog Two" />
        </>
      )
      await waitFor(() => {
        const [closeBtn1] = screen.getAllByRole('button', { name: 'Close' })
        expect(document.activeElement).toBe(closeBtn1)
      })

      rerender(
        <>
          <Popup visible={true} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Dialog One" />
          <Popup visible={true} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Dialog Two" />
        </>
      )
      await waitFor(() => {
        const [, closeBtn2] = screen.getAllByRole('button', { name: 'Close' })
        expect(document.activeElement).toBe(closeBtn2)
      })
    })

    it('focuses the close button when headerContent is used instead of header', async () => {
      renderPopup({ headerContent: <h2>Custom Header</h2> })
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
      )
    })
  })
})

describe('Popup — stacked dialogs', () => {
  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('traps focus in the topmost (inner) dialog when two dialogs are stacked', async () => {
    const outerHide = vi.fn()
    const innerHide = vi.fn()

    render(
      <>
        <Popup
          visible
          onHide={outerHide}
          cancelText="Back"
          submitText="Move"
          header="Move to folder"
        >
          <p>Select a folder</p>
        </Popup>
        <Popup visible onHide={innerHide} header="Create new folder">
          <input data-testid="folder-name" placeholder="Folder name" />
        </Popup>
      </>
    )

    // PrimeReact sets aria-label="Close" on the close button (overriding the
    // mocked icon's aria-label), so query by PrimeReact's structural attribute.
    const allCloseButtons = Array.from(
      document.querySelectorAll<HTMLElement>('[data-pc-section="closebutton"]')
    )
    const innerCloseBtn = allCloseButtons[allCloseButtons.length - 1]
    const folderInput = screen.getByTestId('folder-name')
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    const createBtn = screen.getByRole('button', { name: 'Create' })

    // Tab forward: Close → Folder name → Cancel → Create → Close
    innerCloseBtn.focus()
    expect(innerCloseBtn).toHaveFocus()

    await user.tab()
    expect(folderInput).toHaveFocus()

    await user.tab()
    expect(cancelBtn).toHaveFocus()

    await user.tab()
    expect(createBtn).toHaveFocus()

    await user.tab() // wraps to first
    expect(innerCloseBtn).toHaveFocus()

    // Shift+Tab backward: Close → Create → Cancel → Folder name → Close
    await user.tab({ shift: true }) // wraps to last
    expect(createBtn).toHaveFocus()

    await user.tab({ shift: true })
    expect(cancelBtn).toHaveFocus()

    await user.tab({ shift: true })
    expect(folderInput).toHaveFocus()

    await user.tab({ shift: true })
    expect(innerCloseBtn).toHaveFocus()
  })

  it('closes only the topmost dialog on a single Escape when two dialogs are stacked', async () => {
    const outerHide = vi.fn()
    const innerHide = vi.fn()

    // Both dialogs use hideClose so PrimeReact disables its own closeOnEscape and the custom
    // Escape handler — the one guarded on isTopmost — is the code under test.
    render(
      <>
        <Popup visible hideClose onHide={outerHide} header="Move to folder">
          <p>Select a folder</p>
        </Popup>
        <Popup visible hideClose onHide={innerHide} header="Create new folder">
          <input data-testid="folder-name" placeholder="Folder name" />
        </Popup>
      </>
    )

    await user.keyboard('{Escape}')

    expect(innerHide).toHaveBeenCalledTimes(1)
    expect(outerHide).not.toHaveBeenCalled()
  })
})

describe('Popup — focus trap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('traps Tab on last focusable element — wraps focus to first', () => {
    render(
      <Popup visible onHide={mockOnHide} hideFooter hideClose>
        <button data-testid="btn-a">A</button>
        <button data-testid="btn-b">B</button>
      </Popup>
    )
    screen.getByTestId('btn-b').focus()
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })
    expect(screen.getByTestId('btn-a')).toHaveFocus()
  })

  it('traps Shift+Tab on first focusable element — wraps focus to last', () => {
    render(
      <Popup visible onHide={mockOnHide} hideFooter hideClose>
        <button data-testid="btn-a">A</button>
        <button data-testid="btn-b">B</button>
      </Popup>
    )
    screen.getByTestId('btn-a').focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true, bubbles: true })
    expect(screen.getByTestId('btn-b')).toHaveFocus()
  })

  it('does not intercept Tab when the dialog is not visible', () => {
    render(
      <Popup visible={false} onHide={mockOnHide}>
        <button data-testid="btn-a">A</button>
      </Popup>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const before = document.activeElement
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })
    expect(document.activeElement).toBe(before)
  })

  it('excludes data-p-hidden-focusable sentinels from focus boundaries', () => {
    render(
      <Popup visible onHide={mockOnHide} hideFooter hideClose>
        <button data-testid="btn-a">A</button>
        <button data-testid="btn-b">B</button>
      </Popup>
    )
    const dialog = document.querySelector('[role="dialog"]')!
    const sentinel = document.createElement('span')
    sentinel.setAttribute('tabindex', '0')
    sentinel.setAttribute('data-p-hidden-focusable', 'true')
    sentinel.setAttribute('data-testid', 'sentinel')
    dialog.appendChild(sentinel)

    screen.getByTestId('btn-b').focus()
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })
    expect(screen.getByTestId('btn-a')).toHaveFocus()
  })

  it('redirects focus to first element when Tab is pressed with focus outside the dialog', () => {
    render(
      <Popup visible onHide={mockOnHide} hideFooter hideClose>
        <button data-testid="btn-a">A</button>
        <button data-testid="btn-b">B</button>
      </Popup>
    )
    document.body.focus()
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })
    expect(screen.getByTestId('btn-a')).toHaveFocus()
  })
})
