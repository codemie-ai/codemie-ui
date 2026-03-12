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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { providersStore } from '@/store/providers'
import toaster from '@/utils/toaster'

import ProvidersCreatePage from '../ProvidersCreatePage'

const mockPush = vi.fn()

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: mockPush,
    params: {},
  }),
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/store/providers', () => ({
  providersStore: {
    createProvider: vi.fn(),
    loading: false,
    error: null,
  },
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ contentTitle, content, rightContent, onBack }: any) => (
    <div data-testid="settings-layout">
      <div data-testid="content-title">{contentTitle}</div>
      <button onClick={onBack} data-testid="back-button">
        Back
      </button>
      {rightContent}
      {content}
    </div>
  ),
}))

vi.mock('../components/ProviderForm', () => ({
  default: ({ jsonValue, jsonError, onJsonChange }: any) => (
    <div data-testid="provider-form">
      <textarea
        data-testid="json-input"
        value={jsonValue}
        onChange={(e) => onJsonChange(e.target.value)}
      />
      {jsonError && <div data-testid="json-error">{jsonError}</div>}
    </div>
  ),
}))

describe('ProvidersCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create provider page with correct title', () => {
    render(<ProvidersCreatePage />)

    expect(screen.getByTestId('content-title')).toHaveTextContent('Create Provider')
  })

  it('renders provider form', () => {
    render(<ProvidersCreatePage />)

    expect(screen.getByTestId('provider-form')).toBeInTheDocument()
  })

  it('renders cancel and create buttons', () => {
    render(<ProvidersCreatePage />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('navigates back when cancel button is clicked', () => {
    render(<ProvidersCreatePage />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockPush).toHaveBeenCalledWith({ name: 'providers-management' })
  })

  it('navigates back when back button is clicked', () => {
    render(<ProvidersCreatePage />)

    const backButton = screen.getByTestId('back-button')
    fireEvent.click(backButton)

    expect(mockPush).toHaveBeenCalledWith({ name: 'providers-management' })
  })

  it('updates json value when input changes', () => {
    render(<ProvidersCreatePage />)

    const jsonInput = screen.getByTestId('json-input')
    const newValue = '{"name": "Test Provider"}'

    fireEvent.change(jsonInput, { target: { value: newValue } })

    expect(jsonInput).toHaveValue(newValue)
  })

  it('clears json error when input changes', () => {
    render(<ProvidersCreatePage />)

    const jsonInput = screen.getByTestId('json-input')
    const createButton = screen.getByRole('button', { name: /save/i })

    // First, trigger an error by submitting invalid JSON
    fireEvent.change(jsonInput, { target: { value: 'invalid json' } })
    fireEvent.click(createButton)

    expect(screen.getByTestId('json-error')).toBeInTheDocument()

    // Now change the input and verify error is cleared
    fireEvent.change(jsonInput, { target: { value: '{"name": "Test"}' } })

    expect(screen.queryByTestId('json-error')).not.toBeInTheDocument()
  })

  it('shows error when submitting invalid JSON', async () => {
    render(<ProvidersCreatePage />)

    const jsonInput = screen.getByTestId('json-input')
    const createButton = screen.getByRole('button', { name: /save/i })

    fireEvent.change(jsonInput, { target: { value: 'invalid json' } })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByTestId('json-error')).toBeInTheDocument()
      expect(screen.getByTestId('json-error')).toHaveTextContent(/Invalid JSON/)
    })

    expect(providersStore.createProvider).not.toHaveBeenCalled()
  })

  it('creates provider successfully with valid JSON', async () => {
    const mockProvider = { id: '1', name: 'Test Provider' }
    vi.mocked(providersStore.createProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersCreatePage />)

    const jsonInput = screen.getByTestId('json-input')
    const createButton = screen.getByRole('button', { name: /save/i })

    const validJson = '{"name": "Test Provider"}'
    fireEvent.change(jsonInput, { target: { value: validJson } })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(providersStore.createProvider).toHaveBeenCalledWith({ name: 'Test Provider' })
      expect(toaster.info).toHaveBeenCalledWith('Provider created successfully')
      expect(mockPush).toHaveBeenCalledWith({ name: 'providers-management' })
    })
  })

  it('handles provider creation error', async () => {
    vi.mocked(providersStore.createProvider).mockRejectedValue(new Error('Creation failed'))

    render(<ProvidersCreatePage />)

    const jsonInput = screen.getByTestId('json-input')
    const createButton = screen.getByRole('button', { name: /save/i })

    const validJson = '{"name": "Test Provider"}'
    fireEvent.change(jsonInput, { target: { value: validJson } })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(providersStore.createProvider).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('disables buttons while submitting', async () => {
    vi.mocked(providersStore.createProvider).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({} as any), 100) // nosonar
        })
    )

    render(<ProvidersCreatePage />)

    const jsonInput = screen.getByTestId('json-input')
    const createButton = screen.getByRole('button', { name: /save/i })
    const cancelButton = screen.getByRole('button', { name: /cancel/i })

    fireEvent.change(jsonInput, { target: { value: '{"name": "Test"}' } })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(createButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })
  })

  it('initializes with empty JSON object', () => {
    render(<ProvidersCreatePage />)

    const jsonInput = screen.getByTestId('json-input')
    expect(jsonInput).toHaveValue('{}')
  })

  it('does not show error initially', () => {
    render(<ProvidersCreatePage />)

    expect(screen.queryByTestId('json-error')).not.toBeInTheDocument()
  })

  it('handles JSON with multiple properties', async () => {
    const mockProvider = {
      id: '1',
      name: 'Test Provider',
      description: 'Test Description',
      config: { key: 'value' },
    }
    vi.mocked(providersStore.createProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersCreatePage />)

    const jsonInput = screen.getByTestId('json-input')
    const createButton = screen.getByRole('button', { name: /save/i })

    const complexJson = JSON.stringify({
      name: 'Test Provider',
      description: 'Test Description',
      config: { key: 'value' },
    })

    fireEvent.change(jsonInput, { target: { value: complexJson } })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(providersStore.createProvider).toHaveBeenCalledWith({
        name: 'Test Provider',
        description: 'Test Description',
        config: { key: 'value' },
      })
    })
  })
})
