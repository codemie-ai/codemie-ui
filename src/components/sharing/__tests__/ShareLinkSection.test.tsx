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

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ShareLinkSection from '../ShareLinkSection'

vi.mock('@/utils/toaster', () => ({ default: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const buildUrl = (token: string) => `https://app.test/share/${token}`

describe('ShareLinkSection', () => {
  const getLink = vi.fn()
  const createLink = vi.fn()
  const revokeLink = vi.fn()
  const writeText = vi.fn()

  const setup = (canCreate = true) =>
    render(
      <ShareLinkSection
        getLink={getLink}
        createLink={createLink}
        revokeLink={revokeLink}
        buildUrl={buildUrl}
        canCreate={canCreate}
      />
    )

  beforeEach(() => {
    vi.clearAllMocks()
    writeText.mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    revokeLink.mockResolvedValue(null)
  })

  it('calls getLink on mount', async () => {
    getLink.mockResolvedValue(null)
    setup()
    await waitFor(() => expect(getLink).toHaveBeenCalledTimes(1))
  })

  it('copies the built URL synchronously from a loaded link without creating one', async () => {
    getLink.mockResolvedValue({ token: 'tok1' })
    setup()
    await screen.findByText('Revoke link')
    const button = screen.getByText('Copy share link')

    fireEvent.click(button)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenLastCalledWith('https://app.test/share/tok1')

    fireEvent.click(button)
    expect(writeText).toHaveBeenLastCalledWith('https://app.test/share/tok1')
    expect(createLink).not.toHaveBeenCalled()
  })

  it('creates a link when none exists and copies on the next click if the first copy failed', async () => {
    getLink.mockResolvedValue(null)
    createLink.mockResolvedValue({ token: 'new1' })
    writeText.mockRejectedValueOnce(new Error('denied'))
    setup()
    await waitFor(() => expect(getLink).toHaveBeenCalled())

    fireEvent.click(screen.getByText('Copy share link'))
    await waitFor(() => expect(createLink).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    await screen.findByText('Revoke link')

    fireEvent.click(screen.getByText('Copy share link'))
    expect(writeText).toHaveBeenCalledTimes(2)
    expect(writeText).toHaveBeenLastCalledWith('https://app.test/share/new1')
    expect(createLink).toHaveBeenCalledTimes(1)
  })

  it('revokes the link, hides Revoke, and creates a new link on next copy', async () => {
    getLink.mockResolvedValue({ token: 'tok1' })
    createLink.mockResolvedValue({ token: 'tok2' })
    setup()
    fireEvent.click(await screen.findByText('Revoke link'))
    const dialog = await screen.findByRole('dialog', { name: 'Revoke the share link?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke link' }))
    await waitFor(() => expect(revokeLink).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText('Revoke link')).toBeNull())

    fireEvent.click(screen.getByText('Copy share link'))
    await waitFor(() => expect(createLink).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith('https://app.test/share/tok2'))
  })

  it('asks for confirmation before revoking and keeps the link when cancelled', async () => {
    getLink.mockResolvedValue({ token: 'tok1' })
    setup()
    fireEvent.click(await screen.findByText('Revoke link'))
    const dialog = await screen.findByRole('dialog', { name: 'Revoke the share link?' })
    expect(dialog).toHaveTextContent('people who joined through it lose access')
    expect(dialog).toHaveTextContent('People shared with by name keep theirs')
    expect(revokeLink).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(revokeLink).not.toHaveBeenCalled()
    expect(screen.getByText('Revoke link')).toBeInTheDocument()
  })

  it('does not show Revoke when no link exists', async () => {
    getLink.mockResolvedValue(null)
    setup()
    await waitFor(() => expect(getLink).toHaveBeenCalled())
    expect(screen.queryByText('Revoke link')).toBeNull()
  })

  it('disables Copy but not Revoke when canCreate is false', async () => {
    getLink.mockResolvedValue({ token: 'tok1' })
    setup(false)
    const revoke = await screen.findByText('Revoke link')
    expect(screen.getByText('Copy share link').closest('button')).toBeDisabled()
    expect(revoke.closest('button')).not.toBeDisabled()
  })

  it('has no plain "Copy link" control', async () => {
    getLink.mockResolvedValue({ token: 'tok1' })
    setup()
    await screen.findByText('Revoke link')
    expect(screen.queryByText(/^Copy link$/)).toBeNull()
    expect(screen.queryByText('tok1')).toBeNull()
  })

  it('keeps Copy disabled while the link is loading', () => {
    getLink.mockReturnValue(
      new Promise<null>(() => {
        // never settles: the GET stays pending
      })
    )
    setup()
    expect(screen.getByText('Copy share link').closest('button')).toBeDisabled()
  })

  it('does not create a link after a failed load and offers Retry', async () => {
    getLink.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce({ token: 'tok1' })
    setup()
    const retry = await screen.findByRole('button', { name: 'Retry' })
    const copyButton = screen.getByText('Copy share link').closest('button')!
    expect(copyButton).toBeDisabled()
    fireEvent.click(copyButton)
    expect(createLink).not.toHaveBeenCalled()
    fireEvent.click(retry)
    await screen.findByText('Revoke link')
    expect(getLink).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Copy share link').closest('button')).not.toBeDisabled()
  })
})
