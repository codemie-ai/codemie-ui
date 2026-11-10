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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'
import { hostedApplicationsStore as store } from '@/store/hostedApplications'
import { userStore } from '@/store/user'
import type { HostedApplication } from '@/types/entity/hostedApplication'

import HostedApplicationForm from '../HostedApplicationForm'

vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ rightContent, children }: any) => (
    <main>
      {rightContent}
      {children}
    </main>
  ),
}))
vi.mock('../HostedArtifactUpload', () => ({
  default: ({ onChange }: any) => (
    <button type="button" onClick={() => onChange(new File(['<p>hi</p>'], 'index.html'))}>
      Choose file
    </button>
  ),
}))

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const app = (over: Partial<HostedApplication> = {}): HostedApplication =>
  ({
    id: ID,
    name: 'Visual',
    description: 'A diagram',
    project: 'alpha',
    shared: false,
    etag: 'W/"1"',
    user_abilities: ['read', 'write'],
    ...over,
  } as HostedApplication)

const png = (size = 10) => new File([new Uint8Array(size)], 'cover.png', { type: 'image/png' })

const chooseCover = (file: File) =>
  fireEvent.change(screen.getByLabelText('Cover image'), { target: { files: [file] } })

const renderForm = (application?: HostedApplication, onSaved = vi.fn()) => {
  render(
    <UnsavedChangesProvider>
      <HostedApplicationForm
        application={application}
        onCancel={() => undefined}
        onSaved={onSaved}
      />
    </UnsavedChangesProvider>
  )
  return onSaved
}

const fillCreate = async () => {
  fireEvent.change(screen.getByLabelText(/Application name/), { target: { value: 'Visual' } })
  fireEvent.change(screen.getByRole('textbox', { name: /^Description/ }), {
    target: { value: 'A diagram' },
  })
  await screen.findByText('alpha')
}

beforeEach(() => {
  vi.restoreAllMocks()
  store.reset()
  vi.spyOn(userStore, 'getProjects').mockResolvedValue([{ name: 'alpha' }] as never)
  vi.spyOn(store, 'getThumbnail').mockResolvedValue(null as never)
  vi.spyOn(store, 'loadUsage').mockResolvedValue(undefined as never)
})

describe('cover field on the edit form', () => {
  it('uploads the chosen cover on Save and returns the updated application', async () => {
    const current = app()
    const updated = app({ has_cover: true, etag: 'W/"2"' })
    const patch = vi.spyOn(store, 'updateApplication')
    const upload = vi.spyOn(store, 'uploadCover').mockResolvedValue(updated)
    const onSaved = renderForm(current)
    const file = png()
    chooseCover(file)
    expect(screen.getByRole('button', { name: 'Remove cover' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated))
    expect(upload).toHaveBeenCalledWith(current, file)
    // Nothing else changed, so no metadata PATCH.
    expect(patch).not.toHaveBeenCalled()
  })

  it('uploads the cover against the revision the metadata PATCH returned', async () => {
    const patched = app({ name: 'Renamed', etag: 'W/"2"' })
    vi.spyOn(store, 'updateApplication').mockResolvedValue(patched)
    const upload = vi.spyOn(store, 'uploadCover').mockResolvedValue(patched)
    const onSaved = renderForm(app())
    fireEvent.change(screen.getByLabelText(/Application name/), { target: { value: 'Renamed' } })
    const file = png()
    chooseCover(file)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(upload).toHaveBeenCalledWith(patched, file)
  })

  it.each([
    [new File(['gif'], 'cover.gif', { type: 'image/gif' }), 'Choose a PNG, JPEG, or WebP image.'],
    [png(1024 * 1024 + 1), 'Choose an image up to 1 MiB.'],
  ])('refuses %s with a message and does not upload it', async (file, message) => {
    const upload = vi.spyOn(store, 'uploadCover')
    const onSaved = renderForm(app())
    chooseCover(file)
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Upload cover' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(upload).not.toHaveBeenCalled()
  })

  it('shows the hint with the accepted formats and limits', () => {
    renderForm(app())
    expect(
      screen.getByText(
        'PNG, JPEG, or WebP up to 1 MiB and 2048 px. Without one, the card shows the app initials.'
      )
    ).toBeInTheDocument()
  })

  it('removes the current cover on Save', async () => {
    const current = app({ has_cover: true })
    const remove = vi.spyOn(store, 'removeCover').mockResolvedValue(app({ has_cover: false }))
    const onSaved = renderForm(current)
    fireEvent.click(screen.getByRole('button', { name: 'Remove cover' }))
    expect(screen.queryByRole('button', { name: 'Remove cover' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(remove).toHaveBeenCalledWith(current)
  })

  it('shows a failed cover upload in the form and stays on the page', async () => {
    vi.spyOn(store, 'uploadCover').mockRejectedValue({
      status: 422,
      parsedError: { message: 'Cover too wide' },
    })
    const onSaved = renderForm(app())
    chooseCover(png())
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your changes are saved, but the cover was not: Cover too wide'
    )
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('offers no cover controls without write access', () => {
    renderForm(app({ user_abilities: ['read'], has_cover: true }))
    expect(screen.queryByRole('button', { name: /cover/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Cover image')).toBeDisabled()
  })

  it('keeps the cover editable while suspended', () => {
    renderForm(app({ suspended: true, suspension_refuses: ['activate', 'move', 'publish'] }))
    expect(screen.getByRole('button', { name: 'Upload cover' })).toBeEnabled()
  })
})

describe('cover field on the create form', () => {
  it('uploads the cover once the application exists, before the artifact', async () => {
    const created = app()
    const covered = app({ has_cover: true, etag: 'W/"2"' })
    const calls: string[] = []
    vi.spyOn(store, 'createApplication').mockImplementation(async () => {
      calls.push('create')
      return created
    })
    const upload = vi.spyOn(store, 'uploadCover').mockImplementation(async () => {
      calls.push('cover')
      return covered
    })
    const artifact = vi.spyOn(store, 'uploadArtifact').mockImplementation(async () => {
      calls.push('artifact')
      return undefined as never
    })
    const onSaved = renderForm()
    await fillCreate()
    const file = png()
    chooseCover(file)
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(covered))
    expect(calls).toEqual(['create', 'cover', 'artifact'])
    expect(upload).toHaveBeenCalledWith(created, file)
    expect(artifact.mock.calls[0][0]).toBe(covered)
  })

  it('keeps the created draft when the cover upload fails, and a retry only sends the cover', async () => {
    const created = app()
    const create = vi.spyOn(store, 'createApplication').mockResolvedValue(created)
    const upload = vi
      .spyOn(store, 'uploadCover')
      .mockRejectedValueOnce({ status: 503, parsedError: { message: 'Service busy' } })
      .mockResolvedValueOnce(app({ has_cover: true }))
    const onSaved = renderForm()
    await fillCreate()
    chooseCover(png())
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your private application is saved, but the cover was not: Service busy'
    )
    expect(onSaved).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(create).toHaveBeenCalledOnce()
    expect(upload).toHaveBeenCalledTimes(2)
    expect(upload.mock.calls[1][0]).toBe(created)
  })

  it('creates without a cover when none is chosen', async () => {
    vi.spyOn(store, 'createApplication').mockResolvedValue(app())
    const upload = vi.spyOn(store, 'uploadCover')
    const onSaved = renderForm()
    await fillCreate()
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(upload).not.toHaveBeenCalled()
  })
})
