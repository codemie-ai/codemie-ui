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

import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import HostedTransferProgress from '../HostedTransferProgress'

it('does not show a percentage from partial or merely queued client bytes', () => {
  render(<HostedTransferProgress progress={{ total: 100, confirmed: 25 }} />)
  const indicator = screen.getByRole('progressbar', { name: 'Confirmed artifact transfer' })
  expect(indicator).not.toHaveAttribute('value')
  expect(screen.queryByText(/100% uploaded/)).not.toBeInTheDocument()
  expect(screen.getByText(/Waiting for the verified receipt/)).toBeInTheDocument()
})

it('shows completed transfer only for a confirmed complete receipt and makes no validation acceptance claim', () => {
  render(<HostedTransferProgress progress={{ total: 100, confirmed: 100 }} />)
  expect(screen.getByRole('progressbar', { name: 'Confirmed artifact transfer' })).toHaveAttribute(
    'value',
    '100'
  )
  expect(screen.getByText('100% uploaded. Starting security checks…')).toBeInTheDocument()
  expect(screen.queryByText(/accepted|safe to publish/i)).not.toBeInTheDocument()
})
