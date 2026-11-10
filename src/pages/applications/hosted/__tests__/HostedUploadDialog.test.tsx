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
import { describe, it, expect, vi } from 'vitest'

import type { HostedApplication } from '@/types/entity/hostedApplication'

import HostedUploadDialog from '../HostedUploadDialog'

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChanges: () => ({ attemptFormClose: (close: () => void) => close() }),
}))

const app = { id: 'app-1', name: 'Demo App' } as HostedApplication

describe('HostedUploadDialog', () => {
  it('describes switching versions as activating, not making live', async () => {
    render(<HostedUploadDialog application={app} onClose={vi.fn()} onUploaded={vi.fn()} />)
    expect(
      await screen.findByText(
        'The new version is checked for security first. People keep seeing the active version until you activate the new one.'
      )
    ).toBeInTheDocument()
    expect(screen.queryByText(/\blive\b/i)).toBeNull()
  })
})
