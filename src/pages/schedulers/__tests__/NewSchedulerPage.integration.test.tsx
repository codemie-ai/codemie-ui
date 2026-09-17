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

import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { mockAPI, renderPage } from '@/test-utils/integration'

beforeEach(() => {
  mockAPI('GET', 'v1/config', [])
})

describe('NewProjectSchedulerPage (/schedulers/project/new)', () => {
  it('renders "New Project Scheduler" title', async () => {
    renderPage('/schedulers/project/new')
    await waitFor(() => {
      expect(screen.getByText('New Project Scheduler')).toBeInTheDocument()
    })
  })

  it('does not render Credential Type field', async () => {
    renderPage('/schedulers/project/new')
    await waitFor(() => {
      expect(screen.getByText('New Project Scheduler')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Credential Type')).not.toBeInTheDocument()
  })
})

describe('NewUserSchedulerPage (/schedulers/user/new)', () => {
  it('renders "New User Scheduler" title', async () => {
    renderPage('/schedulers/user/new')
    await waitFor(() => {
      expect(screen.getByText('New User Scheduler')).toBeInTheDocument()
    })
  })

  it('does not render Credential Type field', async () => {
    renderPage('/schedulers/user/new')
    await waitFor(() => {
      expect(screen.getByText('New User Scheduler')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Credential Type')).not.toBeInTheDocument()
  })
})
