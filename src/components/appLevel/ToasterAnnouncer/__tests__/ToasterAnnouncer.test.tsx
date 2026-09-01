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

import { render, screen, waitFor } from '@testing-library/react'
import { FC, ReactNode, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AnnouncerHostProvider } from '../AnnouncerHostContext'
import ModalAnnouncerHost from '../ModalAnnouncerHost'
import ToasterAnnouncer from '../ToasterAnnouncer'

// The global setupTests mock stubs @/utils/toaster; we need the real one for this suite so the
// component's registration actually plugs into the module's announcer slot.
vi.unmock('@/utils/toaster')

vi.mock('toastify-js', () => ({
  default: vi.fn(() => ({ showToast: vi.fn() })),
}))

const { default: toaster } = await vi.importActual<typeof import('@/utils/toaster')>(
  '@/utils/toaster'
)

/** A stand-in modal: the dialog element plus the one line that offers it as the region's host. */
const Modal: FC<{ open: boolean; children?: ReactNode }> = ({ open, children }) =>
  open ? (
    <dialog open aria-modal="true" data-testid="dialog">
      <ModalAnnouncerHost active={open} />
      {children}
    </dialog>
  ) : null

const renderWithProvider = (ui: ReactNode) =>
  render(<AnnouncerHostProvider>{ui}</AnnouncerHostProvider>)

/** Announcer plus one closable modal — the open/close cycle both move-related tests need. */
const ClosableModalHarness: FC = () => {
  const [open, setOpen] = useState(true)

  return (
    <>
      <ToasterAnnouncer />
      <Modal open={open} />
      <button type="button" onClick={() => setOpen(false)}>
        close
      </button>
    </>
  )
}

/** The host the region is parked in: <output> sits inside the announcer's own container div. */
const hostOf = (live: HTMLElement): HTMLElement | null => live.parentElement?.parentElement ?? null

describe('<ToasterAnnouncer />', () => {
  it('renders a polite live region', () => {
    renderWithProvider(<ToasterAnnouncer />)
    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveAttribute('aria-atomic', 'true')
  })

  it('mirrors a success toast into the live region', async () => {
    renderWithProvider(<ToasterAnnouncer />)
    toaster.success('User name copied to clipboard')
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('User name copied to clipboard')
    })
  })

  it('mirrors error toasts as status announcements', async () => {
    renderWithProvider(<ToasterAnnouncer />)
    toaster.error('Failed to save')
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Failed to save')
    })
  })

  it('parks the live region at <body> while no modal is registered', () => {
    renderWithProvider(<ToasterAnnouncer />)
    expect(hostOf(screen.getByRole('status'))).toBe(document.body)
  })

  it('keeps the live region outside #app, so a modal that hides #app cannot swallow announcements', async () => {
    // NavigationProfile marks the whole app root aria-hidden while its modal panel is open.
    // A live region rendered inside that subtree is dropped from the accessibility tree
    // (Chrome: ignoredReasons ["ariaHiddenSubtree"]), so the toast text never reaches a
    // screen reader — the copy buttons inside that panel are exactly the reported case.
    const appRoot = document.createElement('div')
    appRoot.id = 'app'
    document.body.appendChild(appRoot)

    render(<AnnouncerHostProvider>{<ToasterAnnouncer />}</AnnouncerHostProvider>, {
      container: appRoot,
    })
    appRoot.setAttribute('aria-hidden', 'true')

    const live = screen.getByRole('status')
    expect(appRoot.contains(live)).toBe(false)
    expect(live.closest('[aria-hidden="true"]')).toBeNull()

    toaster.info('Username copied to clipboard')
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Username copied to clipboard')
    })

    appRoot.remove()
  })

  it('moves the live region into a modal that registers itself', async () => {
    // Screen readers restrict themselves to the active dialog: with focus inside an
    // aria-modal dialog, VoiceOver ignores live regions outside it, and Chromium drops them
    // too (w3c/aria#1854). A body-level region is therefore silent for every toast raised
    // from inside a modal — the profile panel's copy buttons, for one.
    renderWithProvider(
      <>
        <ToasterAnnouncer />
        <Modal open />
      </>
    )

    await waitFor(() => {
      expect(screen.getByTestId('dialog').contains(screen.getByRole('status'))).toBe(true)
    })

    toaster.info('Username copied to clipboard')
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Username copied to clipboard')
    })
  })

  it('returns the live region to the body once the modal closes', async () => {
    renderWithProvider(<ClosableModalHarness />)
    await waitFor(() =>
      expect(screen.getByTestId('dialog').contains(screen.getByRole('status'))).toBe(true)
    )

    screen.getByRole('button', { name: 'close' }).click()

    await waitFor(() => {
      expect(screen.queryByTestId('dialog')).toBeNull()
      expect(hostOf(screen.getByRole('status'))).toBe(document.body)
    })
  })

  it('hands the region to the innermost of nested modals, then back on close', async () => {
    const Harness: FC = () => {
      const [inner, setInner] = useState(true)

      return (
        <>
          <ToasterAnnouncer />
          <dialog open aria-modal="true" data-testid="outer">
            <ModalAnnouncerHost active />
            <dialog open aria-modal="true" data-testid="inner">
              <ModalAnnouncerHost active={inner} />
            </dialog>
          </dialog>
          <button type="button" onClick={() => setInner(false)}>
            close inner
          </button>
        </>
      )
    }

    renderWithProvider(<Harness />)

    await waitFor(() =>
      expect(screen.getByTestId('inner').contains(screen.getByRole('status'))).toBe(true)
    )

    screen.getByRole('button', { name: 'close inner' }).click()

    await waitFor(() => {
      const live = screen.getByRole('status')
      expect(screen.getByTestId('inner').contains(live)).toBe(false)
      expect(screen.getByTestId('outer').contains(live)).toBe(true)
    })
  })

  it('ignores a modal still in the DOM whose host has already unregistered', async () => {
    // PrimeReact keeps a dialog node through its leave transition. Because registration follows
    // React state, the closing panel stops holding the region before its node disappears — the
    // failure mode that would otherwise silence every toast in the app.
    const Harness: FC = () => {
      const [active, setActive] = useState(true)

      return (
        <>
          <ToasterAnnouncer />
          <dialog open aria-modal="true" data-testid="leaving">
            <ModalAnnouncerHost active={active} />
          </dialog>
          <button type="button" onClick={() => setActive(false)}>
            start exit
          </button>
        </>
      )
    }

    renderWithProvider(<Harness />)
    await waitFor(() =>
      expect(screen.getByTestId('leaving').contains(screen.getByRole('status'))).toBe(true)
    )

    screen.getByRole('button', { name: 'start exit' }).click()

    await waitFor(() => {
      // The node is still mounted, but it no longer captures the region.
      expect(screen.getByTestId('leaving')).toBeInTheDocument()
      expect(hostOf(screen.getByRole('status'))).toBe(document.body)
    })
  })

  it('re-announces the current message after the region is moved', async () => {
    // Moving the node resets the region for assistive tech, so a message written just before the
    // move would never be spoken. Confirm-then-close flows (Delete All Conversations) hit this.
    renderWithProvider(<ClosableModalHarness />)
    await waitFor(() =>
      expect(screen.getByTestId('dialog').contains(screen.getByRole('status'))).toBe(true)
    )

    const seen: string[] = []
    const live = screen.getByRole('status')
    const spy = new MutationObserver(() => {
      const text = live.textContent ?? ''
      if (seen[seen.length - 1] !== text) seen.push(text)
    })
    spy.observe(live, { childList: true, characterData: true, subtree: true })

    toaster.info('All conversations have been successfully deleted.')
    await waitFor(() =>
      expect(live).toHaveTextContent('All conversations have been successfully deleted.')
    )

    screen.getByRole('button', { name: 'close' }).click()

    await waitFor(
      () => {
        expect(hostOf(live)).toBe(document.body)
        // cleared and written again after the move, so the moved region announces afresh
        expect(seen.filter((t) => t.includes('successfully deleted')).length).toBeGreaterThan(1)
      },
      // The queue plays one message per DEFAULT_GAP_MS (1000ms), so the repeat lands after the
      // default waitFor window — a shorter timeout makes this test flaky, not stricter.
      { timeout: 4000 }
    )
    spy.disconnect()
  })

  it('falls back to <body> when rendered without a provider', () => {
    // Most suites render a Popup with no AnnouncerHostProvider above it. Registration must be a
    // no-op there rather than a crash.
    render(<ToasterAnnouncer />)
    expect(hostOf(screen.getByRole('status'))).toBe(document.body)
  })

  it('deregisters the announcer on unmount', () => {
    const { unmount } = renderWithProvider(<ToasterAnnouncer />)
    unmount()
    // After unmount there is no live region left in the DOM.
    expect(screen.queryByRole('status')).toBeNull()
    // And a subsequent toast call must not throw (announcer slot cleared).
    expect(() => toaster.success('after unmount')).not.toThrow()
  })
})
