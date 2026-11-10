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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import toaster from '@/utils/toaster'

import SharePopup from '../SharePopup'

vi.mock('@/utils/toaster', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const alice = { id: 'u-2', name: 'Alice', email: 'alice@test.com' }
const bob = { id: 'u-3', name: 'Bob', email: 'bob@test.com' }
const carol = { id: 'u-4', name: 'Carol', email: 'carol@test.com' }

const texts = {
  shared: 'Shared OK',
  shareFailed: 'Share failed',
  unshared: 'Unshared OK',
  unshareFailed: 'Unshare failed',
  viaLinkNote: 'Link access is revoked from the link settings',
}

describe('SharePopup', () => {
  const onHide = vi.fn()
  const searchUsers = vi.fn()
  const share = vi.fn()
  const unshare = vi.fn()
  const loadSharedWith = vi.fn()

  const renderPopup = (props: Record<string, unknown> = {}) =>
    render(
      <SharePopup
        visible
        onHide={onHide}
        header="Share thing"
        searchUsers={searchUsers}
        share={share}
        unshare={unshare}
        loadSharedWith={loadSharedWith}
        canGrant
        texts={texts}
        {...props}
      />
    )

  const type = async (value: string) => {
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(await screen.findByPlaceholderText('Search'), { target: { value } })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    searchUsers.mockResolvedValue([])
    share.mockResolvedValue(undefined)
    unshare.mockResolvedValue(undefined)
    loadSharedWith.mockResolvedValue([])
  })

  it('searches through searchUsers with the typed query', async () => {
    searchUsers.mockResolvedValue([carol])
    renderPopup()
    await type('carol@test')
    await waitFor(() => expect(searchUsers).toHaveBeenCalledWith('carol@test'))
    expect(await screen.findByText(carol.name)).toBeInTheDocument()
  })

  it('does not search below the 2-character floor', async () => {
    renderPopup()
    await type('a')
    await new Promise((r) => {
      setTimeout(r, 400)
    })
    expect(searchUsers).not.toHaveBeenCalled()
  })

  it('filters already shared users out of search results', async () => {
    loadSharedWith.mockResolvedValue([alice])
    searchUsers.mockResolvedValue([alice, bob])
    renderPopup()
    await screen.findByText(alice.name)
    await type('al')
    expect(await screen.findByText(bob.name)).toBeInTheDocument()
    expect(screen.queryAllByText(alice.name)).toHaveLength(1)
  })

  it('disables search and grant but keeps remove when canGrant is false', async () => {
    loadSharedWith.mockResolvedValue([alice])
    renderPopup({ canGrant: false })
    await screen.findByText(alice.name)
    expect(screen.getByRole('combobox').closest('.pointer-events-none')).not.toBeNull()
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled()
    const remove = screen.getByRole('button', { name: `Remove ${alice.name}` })
    expect(remove).toBeEnabled()
    fireEvent.click(remove)
    await waitFor(() => expect(unshare).toHaveBeenCalledWith([alice.id]))
    expect(toaster.success).toHaveBeenCalledWith(texts.unshared)
  })

  it('makes no list call when loadSharedWith is missing', async () => {
    renderPopup({ loadSharedWith: undefined })
    await screen.findByText('Share thing')
    expect(loadSharedWith).not.toHaveBeenCalled()
  })

  it('shows "via link" and the note for link grants', async () => {
    loadSharedWith.mockResolvedValue([
      { ...alice, grant_source: 'link' },
      { ...bob, grant_source: 'name' },
    ])
    renderPopup()
    expect(await screen.findByText('via link')).toBeInTheDocument()
    expect(screen.getAllByText('via link')).toHaveLength(1)
    expect(screen.getByText(texts.viaLinkNote)).toBeInTheDocument()
  })

  it('uses the passed toast texts on remove failure', async () => {
    loadSharedWith.mockResolvedValue([alice])
    unshare.mockRejectedValue(new Error('x'))
    renderPopup()
    await screen.findByText(alice.name)
    fireEvent.click(screen.getByRole('button', { name: `Remove ${alice.name}` }))
    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith(texts.unshareFailed))
  })

  it('shares selected users, toasts the passed text and hides', async () => {
    searchUsers.mockResolvedValue([carol])
    renderPopup()
    await type('car')
    fireEvent.click(await screen.findByText(carol.name))
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))
    await waitFor(() => expect(share).toHaveBeenCalledWith([carol.id]))
    expect(toaster.success).toHaveBeenCalledWith(texts.shared)
    expect(onHide).toHaveBeenCalled()
  })

  it('toasts shareFailed when share rejects without a parsed message', async () => {
    searchUsers.mockResolvedValue([carol])
    share.mockRejectedValue(new Error('x'))
    renderPopup()
    await type('car')
    fireEvent.click(await screen.findByText(carol.name))
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))
    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith(texts.shareFailed))
  })

  it('renders the extra slot', async () => {
    renderPopup({ extra: <div>EXTRA SLOT</div> })
    expect(await screen.findByText('EXTRA SLOT')).toBeInTheDocument()
  })

  it('reloads for a new entity and drops a superseded response', async () => {
    let finishFirst: (users: unknown[]) => void = () => undefined
    loadSharedWith
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve
        })
      )
      .mockResolvedValueOnce([bob])
    const { rerender } = renderPopup({ entityKey: 'a-1' })
    rerender(
      <SharePopup
        visible
        onHide={onHide}
        header="Share thing"
        searchUsers={searchUsers}
        share={share}
        unshare={unshare}
        loadSharedWith={loadSharedWith}
        canGrant
        texts={texts}
        entityKey="a-2"
      />
    )
    expect(await screen.findByText(bob.name)).toBeInTheDocument()
    expect(loadSharedWith).toHaveBeenCalledTimes(2)
    finishFirst([alice])
    await new Promise((r) => {
      setTimeout(r, 0)
    })
    expect(screen.queryByText(alice.name)).toBeNull()
    expect(screen.getByText(bob.name)).toBeInTheDocument()
  })
  it('reloads the people with access when refreshKey changes, keeping the selection', async () => {
    loadSharedWith.mockResolvedValueOnce([alice]).mockResolvedValueOnce([])
    searchUsers.mockResolvedValue([carol])
    const props = {
      visible: true,
      onHide,
      header: 'Share thing',
      searchUsers,
      share,
      unshare,
      loadSharedWith,
      canGrant: true,
      texts,
    }
    const { rerender } = render(<SharePopup {...props} refreshKey={0} />)
    expect(await screen.findByText(alice.name)).toBeInTheDocument()
    await type('car')
    fireEvent.click(await screen.findByText(carol.name))
    rerender(<SharePopup {...props} refreshKey={1} />)
    await waitFor(() => expect(screen.queryByText(alice.name)).toBeNull())
    expect(loadSharedWith).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled()
  })

  it('does not bring a removed person back when an earlier list load answers late', async () => {
    let finishReload: (users: unknown[]) => void = () => undefined
    loadSharedWith.mockResolvedValueOnce([alice, bob]).mockReturnValueOnce(
      new Promise((resolve) => {
        finishReload = resolve
      })
    )
    const props = {
      visible: true,
      onHide,
      header: 'Share thing',
      searchUsers,
      share,
      unshare,
      loadSharedWith,
      canGrant: true,
      texts,
    }
    const { rerender } = render(<SharePopup {...props} refreshKey={0} />)
    expect(await screen.findByText(alice.name)).toBeInTheDocument()
    rerender(<SharePopup {...props} refreshKey={1} />)
    await waitFor(() => expect(loadSharedWith).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: `Remove ${alice.name}` }))
    await waitFor(() => expect(unshare).toHaveBeenCalledWith([alice.id]))
    finishReload([alice, bob])
    await new Promise((r) => {
      setTimeout(r, 0)
    })
    expect(screen.queryByText(alice.name)).toBeNull()
    expect(screen.getByText(bob.name)).toBeInTheDocument()
  })

  it('renders the notice when one is passed', async () => {
    renderPopup({ notice: 'Sharing is paused.' })
    expect(await screen.findByText('Sharing is paused.')).toBeInTheDocument()
  })
})
