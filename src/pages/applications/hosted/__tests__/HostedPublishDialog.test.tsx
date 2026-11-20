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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PrimeReactProvider } from 'primereact/api'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assistantsStore } from '@/store/assistants'
import { hostedApplicationsStore as store } from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'

import HostedPublishDialog from '../HostedPublishDialog'
import { resetHostedCategoriesRequest } from '../useHostedCategories'

const CATEGORIES = [
  { id: 'a', name: 'Analytics', description: '' },
  { id: 'b', name: 'Business', description: '' },
]

const make = (over: Partial<HostedApplication> = {}): HostedApplication =>
  ({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Visual',
    etag: 'W/"1"',
    categories: [{ id: 'a', name: 'Analytics' }],
    ...over,
  } as HostedApplication)

const onClose = vi.fn()
const onDone = vi.fn()
let current = true

const show = (app: HostedApplication) =>
  render(
    <PrimeReactProvider value={{ unstyled: true, cssTransition: false }}>
      <HostedPublishDialog app={app} isCurrent={() => current} onClose={onClose} onDone={onDone} />
    </PrimeReactProvider>
  )

const publishButton = () => screen.getByRole('button', { name: 'Publish' })
const pick = async (name: string) => {
  fireEvent.click(document.querySelector('[data-pc-name="multiselect"]')!)
  fireEvent.click((await screen.findByText(name, { selector: 'li div' })).closest('li')!)
}
const refusal = (status: number, message: string) => ({
  status,
  parsedError: { message, details: { fields: [{ field: 'categories', message }] } },
})

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  current = true
  resetHostedCategoriesRequest()
  assistantsStore.assistantCategories = []
  vi.spyOn(assistantsStore, 'getAssistantCategories').mockImplementation(async () => {
    assistantsStore.assistantCategories = CATEGORIES as never
  })
})

describe('HostedPublishDialog', () => {
  it('keeps the confirmation copy and pre-fills the saved categories', async () => {
    const app = make()
    const updated = { ...app, is_global: true }
    const publish = vi.spyOn(store, 'publish').mockResolvedValue(updated)
    show(app)
    expect(screen.getByText('Publish to Marketplace?')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Everyone in your organization will be able to find this application in the Marketplace and open it.'
      )
    ).toBeInTheDocument()
    fireEvent.click(publishButton())
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(updated))
    expect(publish).toHaveBeenCalledWith(app, ['a'], expect.any(String))
  })

  it('requires a category and sends nothing without one', async () => {
    const publish = vi.spyOn(store, 'publish')
    show(make({ categories: [] }))
    fireEvent.click(publishButton())
    expect(await screen.findByText('At least one category is required')).toBeInTheDocument()
    expect(publish).not.toHaveBeenCalled()
  })

  it('stays open with the selection and shows the reason after a 422', async () => {
    const publish = vi
      .spyOn(store, 'publish')
      .mockRejectedValue(refusal(422, 'Unknown category: a'))
    show(make())
    fireEvent.click(publishButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Unknown category: a')
    expect(onDone).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(publishButton())
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(2))
    expect(publish.mock.calls[1][1]).toEqual(['a'])
  })

  it('retries with the same key, and a changed selection sends a new one', async () => {
    const publish = vi.spyOn(store, 'publish').mockRejectedValue(new Error('down'))
    show(make())
    fireEvent.click(publishButton())
    await screen.findByRole('alert')
    fireEvent.click(publishButton())
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(2))
    expect(publish.mock.calls[1][2]).toBe(publish.mock.calls[0][2])
    await pick('Business')
    fireEvent.click(publishButton())
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(3))
    expect(publish.mock.calls[2][1]).toEqual(['a', 'b'])
    expect(publish.mock.calls[2][2]).not.toBe(publish.mock.calls[0][2])
  })

  it('re-reads the application after a 412 and sends its etag with a new key', async () => {
    const app = make()
    const latest = { ...app, etag: 'W/"2"' }
    const getApplication = vi.spyOn(store, 'getApplication').mockResolvedValue(latest)
    const publish = vi
      .spyOn(store, 'publish')
      .mockRejectedValueOnce(refusal(412, 'This item changed in another tab'))
      .mockResolvedValueOnce(latest)
    show(app)
    fireEvent.click(publishButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('This item changed in another tab')
    await waitFor(() => expect(getApplication).toHaveBeenCalledWith(app.id))
    fireEvent.click(publishButton())
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(2))
    expect(publish.mock.calls[1][0]).toBe(latest)
    expect(publish.mock.calls[1][1]).toEqual(['a'])
    expect(publish.mock.calls[1][2]).not.toBe(publish.mock.calls[0][2])
  })

  const conflict = (code: string, message: string) => ({
    status: 409,
    parsedError: { message, details: { code } },
  })

  it('re-reads the application after a 409 REVISION_CONFLICT and sends the new etag', async () => {
    const app = make()
    const latest = { ...app, etag: 'W/"2"' }
    const getApplication = vi.spyOn(store, 'getApplication').mockResolvedValue(latest)
    const publish = vi
      .spyOn(store, 'publish')
      .mockRejectedValueOnce(conflict('REVISION_CONFLICT', 'This item changed in another tab'))
      .mockResolvedValueOnce(latest)
    show(app)
    fireEvent.click(publishButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('This item changed in another tab')
    await waitFor(() => expect(getApplication).toHaveBeenCalledWith(app.id))
    fireEvent.click(publishButton())
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(2))
    expect(publish.mock.calls[1][0]).toBe(latest)
    expect(publish.mock.calls[1][1]).toEqual(['a'])
    expect(publish.mock.calls[1][2]).not.toBe(publish.mock.calls[0][2])
  })

  it('does not re-read the application after a 409 IDEMPOTENCY_CONFLICT', async () => {
    const getApplication = vi.spyOn(store, 'getApplication').mockResolvedValue(make())
    vi.spyOn(store, 'publish').mockRejectedValue(conflict('IDEMPOTENCY_CONFLICT', 'Key reused'))
    show(make())
    fireEvent.click(publishButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Key reused')
    await act(async () => {
      await Promise.resolve()
    })
    expect(getApplication).not.toHaveBeenCalled()
  })

  it('keeps the error shown when the re-read after a 412 fails', async () => {
    vi.spyOn(store, 'getApplication').mockRejectedValue(new Error('down'))
    vi.spyOn(store, 'publish').mockRejectedValue(refusal(412, 'This item changed in another tab'))
    show(make())
    fireEvent.click(publishButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('This item changed in another tab')
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByRole('alert')).toHaveTextContent('This item changed in another tab')
  })

  it.each([
    ['succeeds', () => vi.spyOn(store, 'publish').mockResolvedValue(make())],
    ['fails', () => vi.spyOn(store, 'publish').mockRejectedValue(new Error('boom'))],
  ])('closes without an error when the request %s after the visit changed', async (_, arrange) => {
    let settle: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      settle = resolve
    })
    const publish = arrange()
    const outcome = publish.getMockImplementation()!
    publish.mockImplementation(async (...args) => {
      await gate
      return outcome(...args)
    })
    show(make())
    fireEvent.click(publishButton())
    current = false
    await act(async () => {
      settle()
      await gate
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
