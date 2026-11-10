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
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { hostedApplicationsStore as store } from '@/store/hostedApplications'

import HostedArtifactUpload from '../HostedArtifactUpload'

const MiB = 1024 * 1024
// Valtio notifies on a microtask, so the update is awaited inside act.
const publishLimits = (htmlBytes: number, zipBytes: number) =>
  act(async () => {
    store.capabilities = {
      create: true,
      view: true,
      limits: { html_bytes: htmlBytes, zip_bytes: zipBytes },
    } as never
  })
const choose = (file: { name: string; size: number }) =>
  fireEvent.change(screen.getByLabelText('Application file'), { target: { files: [file] } })

beforeEach(() => store.reset())
afterEach(() => {
  store.reset()
  vi.restoreAllMocks()
})

it('falls back to the default limits until the capabilities are known', () => {
  render(<HostedArtifactUpload file={null} onChange={vi.fn()} />)

  expect(
    screen.getByText(/^HTML up to 20 MiB, or a ZIP of prebuilt static files up to 100 MiB\./)
  ).toBeVisible()
})

it('describes and enforces the limits the server publishes', async () => {
  const change = vi.fn()
  render(<HostedArtifactUpload file={null} onChange={change} />)
  await publishLimits(1 * MiB, 2.5 * MiB)

  expect(
    screen.getByText(/^HTML up to 1 MiB, or a ZIP of prebuilt static files up to 2\.5 MiB\./)
  ).toBeVisible()

  choose({ name: 'large.html', size: MiB + 1 })
  expect(screen.getByText('HTML files must be between 1 byte and 1 MiB.')).toBeVisible()
  choose({ name: 'large.zip', size: 2.5 * MiB + 1 })
  expect(screen.getByText('ZIP files must be between 1 byte and 2.5 MiB.')).toBeVisible()
  expect(change).not.toHaveBeenCalled()

  const site = { name: 'site.zip', size: 2 * MiB }
  choose(site)
  expect(change).toHaveBeenCalledExactlyOnceWith(site)
})

it('accepts an archive above the default limit when the server allows it', async () => {
  const change = vi.fn()
  await publishLimits(20 * MiB, 200 * MiB)
  render(<HostedArtifactUpload file={null} onChange={change} />)

  const site = { name: 'site.zip', size: 150 * MiB }
  choose(site)

  expect(change).toHaveBeenCalledExactlyOnceWith(site)
})

it.each([
  [5 * MiB, '5.0 MiB'],
  [2 * 1024 * MiB, '2.0 GiB'],
])('shows the actual quota without rounding small allowances to zero', async (limit, label) => {
  vi.spyOn(store, 'loadUsage').mockResolvedValue(undefined)
  await act(async () => {
    store.usage = {
      stored_bytes: MiB,
      reserved_bytes: 0.5 * MiB,
      byte_limit: limit,
    }
  })
  render(<HostedArtifactUpload file={null} onChange={vi.fn()} />)

  expect(
    screen.getByText(`Your applications use 1.5 MiB of ${label}.`, { exact: false })
  ).toBeVisible()
})
