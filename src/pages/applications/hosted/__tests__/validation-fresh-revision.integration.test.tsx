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

import './reviewRegressionSetup'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import HostedValidationDialog from '../HostedValidationDialog'

const boundary = vi.hoisted(() => ({
  store: { getValidation: vi.fn(), getVersion: vi.fn(), configure: vi.fn() },
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedAuthenticationGeneration: () => 0,
  hostedErrorMessage: (cause: Error) => cause.message,
}))

it('refreshes the version revision together with configuration options before retrying save', async () => {
  const appId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const oldVersion = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    sequence: 1,
    etag: 'version:2',
    configuration_revision: 1,
    candidate_manifest_digest: 'old-manifest',
  }
  const freshVersion = {
    ...oldVersion,
    etag: 'version:9',
    configuration_revision: 3,
    candidate_manifest_digest: 'fresh-manifest',
    job: { id: 'job9', etag: 'version:9', state: 'completed', phase: 'configuration', details: {} },
  }
  const report = {
    state: 'awaiting_configuration',
    roots: [''],
    entries: ['index.html'],
    errors: [],
    warnings: [],
    file_count: 1,
    expanded_bytes: 15,
    next_offset: null,
    etag: 'version:9',
    job_id: 'job9',
    configuration_revision: 3,
    candidate_manifest_digest: 'fresh-manifest',
  }
  boundary.store.getValidation.mockResolvedValue(report)
  boundary.store.getVersion.mockResolvedValue(freshVersion)
  boundary.store.configure
    .mockRejectedValueOnce(new Error('CONFIGURATION_CONFLICT'))
    .mockResolvedValue(undefined)
  render(
    <HostedValidationDialog
      appId={appId}
      version={oldVersion as never}
      onClose={() => undefined}
      onConfigured={() => undefined}
    />
  )
  await screen.findByRole('button', { name: 'Validate configuration' })
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Validate configuration' })).toBeEnabled()
  )
  fireEvent.click(screen.getByRole('button', { name: 'Validate configuration' }))
  await screen.findByText('CONFIGURATION_CONFLICT')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(screen.queryByText('CONFIGURATION_CONFLICT')).not.toBeInTheDocument())
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Validate configuration' })).toBeEnabled()
  )
  fireEvent.click(screen.getByRole('button', { name: 'Validate configuration' }))
  await waitFor(() => expect(boundary.store.configure).toHaveBeenCalledTimes(2))
  expect(boundary.store.configure.mock.calls[1][1]).toMatchObject({
    etag: 'version:9',
    configuration_revision: 3,
    candidate_manifest_digest: 'fresh-manifest',
  })
})

it('shows the report while the check is still running, even if it moved on between the two reads', async () => {
  const version = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    sequence: 2,
    etag: 'version:4',
    configuration_revision: 1,
    candidate_manifest_digest: 'manifest',
    job: { id: 'job4', etag: 'validation:5', state: 'running', phase: 'scan', details: {} },
  }
  boundary.store.getValidation.mockResolvedValue({
    state: 'validating',
    roots: [],
    entries: [],
    errors: [],
    warnings: [],
    file_count: 3,
    expanded_bytes: 2048,
    next_offset: null,
    etag: 'validation:4',
    job_id: 'job4',
    configuration_revision: 1,
    candidate_manifest_digest: 'manifest',
  })
  boundary.store.getVersion.mockResolvedValue(version)
  render(
    <HostedValidationDialog
      appId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
      version={version as never}
      onClose={() => undefined}
      onConfigured={() => undefined}
    />
  )
  expect(await screen.findByText(/3 files/)).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

const baseReport = {
  state: 'validating',
  roots: [],
  entries: [],
  errors: [],
  warnings: [],
  file_count: 3,
  expanded_bytes: 2048,
  next_offset: null,
  etag: 'validation:4',
  job_id: 'job4',
  configuration_revision: 1,
  candidate_manifest_digest: 'manifest',
}
const reportVersion = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  sequence: 2,
  etag: 'version:4',
  configuration_revision: 1,
  candidate_manifest_digest: 'manifest',
  job: { id: 'job4', etag: 'validation:5', state: 'running', phase: 'scan', details: {} },
}
const renderReport = () =>
  render(
    <HostedValidationDialog
      appId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
      version={reportVersion as never}
      onClose={() => undefined}
      onConfigured={() => undefined}
    />
  )

it('shows a validation state the UI does not know yet instead of failing', async () => {
  boundary.store.getValidation.mockResolvedValue({ ...baseReport, state: 'quarantined' })
  boundary.store.getVersion.mockResolvedValue(reportVersion)
  renderReport()
  expect(await screen.findByText('quarantined')).toBeInTheDocument()
})

it('keeps the errors of a later findings page and clears an earlier load-more error', async () => {
  boundary.store.getVersion.mockResolvedValue(reportVersion)
  boundary.store.getValidation
    .mockResolvedValueOnce({
      ...baseReport,
      state: 'rejected',
      errors: [{ code: 'e1', message: 'First error' }],
      warnings: [{ code: 'w1', path: 'a.js', message: 'First warning' }],
      next_offset: 1,
    })
    .mockRejectedValueOnce(new Error('Load more failed'))
    .mockResolvedValueOnce({
      ...baseReport,
      state: 'rejected',
      errors: [{ code: 'e2', message: 'Second error' }],
      warnings: [{ code: 'w2', path: 'b.js', message: 'Second warning' }],
      next_offset: null,
    })
  renderReport()
  fireEvent.click(await screen.findByRole('button', { name: 'Load more findings' }))
  expect(await screen.findByText('Load more failed')).toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Load more findings' })).toBeEnabled()
  )
  fireEvent.click(screen.getByRole('button', { name: 'Load more findings' }))
  expect(await screen.findByText('Second error')).toBeInTheDocument()
  expect(screen.getByText('First error')).toBeInTheDocument()
  expect(screen.getByText('Second warning')).toBeInTheDocument()
  expect(screen.queryByText('Load more failed')).not.toBeInTheDocument()
})
