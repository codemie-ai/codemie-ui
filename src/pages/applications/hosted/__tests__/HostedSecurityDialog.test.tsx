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

import { hostedApplicationsStore } from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'

import HostedSecurityDialog from '../HostedSecurityDialog'

const app = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Demo' } as HostedApplication

describe('HostedSecurityDialog', () => {
  const onClose = vi.fn()
  const onDone = vi.fn()
  const reasonBox = () => screen.getByRole('textbox')
  const submit = (name: string) => screen.getByRole('button', { name })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(hostedApplicationsStore, 'security').mockResolvedValue({
      ...app,
      suspended: true,
    } as HostedApplication)
  })

  it('keeps Suspend disabled until a non-whitespace reason is entered', () => {
    render(<HostedSecurityDialog action="suspend" app={app} onClose={onClose} onDone={onDone} />)
    expect(submit('Suspend')).toBeDisabled()
    fireEvent.change(reasonBox(), { target: { value: '   ' } })
    expect(submit('Suspend')).toBeDisabled()
    fireEvent.change(reasonBox(), { target: { value: 'Malware' } })
    expect(submit('Suspend')).toBeEnabled()
  })

  it('sends the trimmed reason and hands the returned application to onDone', async () => {
    render(<HostedSecurityDialog action="suspend" app={app} onClose={onClose} onDone={onDone} />)
    fireEvent.change(reasonBox(), { target: { value: ' Malware ' } })
    fireEvent.click(submit('Suspend'))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ ...app, suspended: true }))
    expect(hostedApplicationsStore.security).toHaveBeenCalledWith(
      app,
      'suspend',
      'Malware',
      expect.any(String)
    )
  })

  it('reinstates with a reason and no version picker', async () => {
    render(<HostedSecurityDialog action="reinstate" app={app} onClose={onClose} onDone={onDone} />)
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.change(reasonBox(), { target: { value: 'Cleared' } })
    fireEvent.click(submit('Reinstate'))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(hostedApplicationsStore.security).toHaveBeenCalledWith(
      app,
      'reinstate',
      'Cleared',
      expect.any(String)
    )
  })

  it('uses a new request key after the reason is edited following a failure', async () => {
    const security = vi
      .spyOn(hostedApplicationsStore, 'security')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(app)
    render(<HostedSecurityDialog action="suspend" app={app} onClose={onClose} onDone={onDone} />)
    fireEvent.change(reasonBox(), { target: { value: 'first' } })
    fireEvent.click(submit('Suspend'))
    await screen.findByRole('alert')
    fireEvent.click(submit('Suspend'))
    await waitFor(() => expect(security).toHaveBeenCalledTimes(2))
    expect(security.mock.calls[1][3]).toBe(security.mock.calls[0][3])
    fireEvent.change(reasonBox(), { target: { value: 'corrected' } })
    fireEvent.click(submit('Suspend'))
    await waitFor(() => expect(security).toHaveBeenCalledTimes(3))
    expect(security.mock.calls[2][2]).toBe('corrected')
    expect(security.mock.calls[2][3]).not.toBe(security.mock.calls[0][3])
  })

  it('shows the error and stays open when the request fails', async () => {
    vi.spyOn(hostedApplicationsStore, 'security').mockRejectedValue(new Error('boom'))
    render(<HostedSecurityDialog action="suspend" app={app} onClose={onClose} onDone={onDone} />)
    fireEvent.change(reasonBox(), { target: { value: 'x' } })
    fireEvent.click(submit('Suspend'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
  })
})
