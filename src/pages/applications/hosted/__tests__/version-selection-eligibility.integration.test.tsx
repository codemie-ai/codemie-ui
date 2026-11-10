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
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import HostedVersionList from '../HostedVersionList'

it('does not offer an enabled Select action for readable but activation-ineligible versions', () => {
  const application = {
    selected_version_id: null,
    active_version_id: null,
  }
  const version = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    sequence: 1,
    filename: 'static.html',
    expected_bytes: 10,
    validation_state: 'accepted',
    can_preview: true,
    can_activate: false,
    upload: { state: 'stored' },
  }
  render(
    <HostedVersionList
      application={application as never}
      versions={[version] as never}
      busy={false}
      onAction={() => undefined}
      onResume={() => undefined}
      onReport={() => undefined}
      onPreview={() => undefined}
    />
  )
  expect(screen.getByRole('button', { name: 'Preview' })).toBeEnabled()
  const select = screen.queryByRole('button', { name: 'Select version' })
  if (select) expect(select).toBeDisabled()
})

const listVersion = (over: Record<string, unknown> = {}) => ({
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  sequence: 1,
  filename: 'static.html',
  expected_bytes: 10,
  validation_state: 'accepted',
  can_preview: true,
  can_activate: true,
  upload: { state: 'stored' },
  ...over,
})
const renderList = (application: Record<string, unknown>, versions: unknown[]) =>
  render(
    <HostedVersionList
      application={{ selected_version_id: null, active_version_id: null, ...application } as never}
      versions={versions as never}
      busy={false}
      onAction={vi.fn()}
      onResume={() => undefined}
      onReport={() => undefined}
      onPreview={() => undefined}
    />
  )

it('shows a version state the UI does not know yet instead of failing', () => {
  renderList({}, [listVersion({ validation_state: 'quarantined', can_preview: false })])
  expect(screen.getByText('quarantined')).toBeInTheDocument()
})

it('never offers Use for preview: each version has its own Preview button', () => {
  renderList({}, [listVersion()])
  const menu = screen.queryByRole('button', { name: 'Version 1 actions' })
  if (menu) fireEvent.click(menu)
  expect(screen.queryByRole('menuitem', { name: 'Use for preview' })).toBeNull()
})
