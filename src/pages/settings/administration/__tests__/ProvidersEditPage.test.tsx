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

import ProvidersEditPage from '../ProvidersEditPage'

const mockPush = vi.fn()
const mockParams = { id: 'test-id-123' }

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: mockPush,
    params: mockParams,
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
    getProvider: vi.fn(),
    updateProvider: vi.fn(),
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

vi.mock('@/components/Spinner', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

const mockProvider = {
  id: 'test-id-123',
  name: 'Test Provider',
  description: 'Test Description',
  date: '2024-01-01',
  update_date: '2024-01-02',
  config: { key: 'value' },
}

describe('ProvidersEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams.id = 'test-id-123'
  })

  it('shows loading spinner initially', () => {
    vi.mocked(providersStore.getProvider).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<ProvidersEditPage />)

    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('fetches provider data on mount', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      expect(providersStore.getProvider).toHaveBeenCalledWith('test-id-123')
    })
  })

  it('displays provider name as title after loading', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      expect(screen.getByTestId('content-title')).toHaveTextContent('Test Provider')
    })
  })

  it('displays "Edit Provider" as default title when provider has no name', async () => {
    const providerWithoutName = { ...mockProvider, name: undefined }
    vi.mocked(providersStore.getProvider).mockResolvedValue(providerWithoutName as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      expect(screen.getByTestId('content-title')).toHaveTextContent('Edit Provider')
    })
  })

  it('shows "Provider not found" when provider fetch returns null', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(null as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      expect(screen.getByText('Provider not found')).toBeInTheDocument()
    })
  })

  it('shows error message when provider fetch fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(providersStore.getProvider).mockRejectedValue(new Error('Fetch failed'))

    render(<ProvidersEditPage />)

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to load provider:', expect.any(Error))
    })

    consoleError.mockRestore()
  })

  it('populates form with provider data excluding id and dates', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const jsonInput = screen.getByTestId('json-input')
      const expectedJson = JSON.stringify(
        {
          name: 'Test Provider',
          description: 'Test Description',
          config: { key: 'value' },
        },
        null,
        2
      )
      expect(jsonInput).toHaveValue(expectedJson)
    })
  })

  it('renders cancel and update buttons after loading', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })
  })

  it('does not render action buttons while loading', () => {
    vi.mocked(providersStore.getProvider).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<ProvidersEditPage />)

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
  })

  it('does not render action buttons when provider not found', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(null as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    })
  })

  it('navigates back when cancel button is clicked', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)
    })

    expect(mockPush).toHaveBeenCalledWith({ name: 'providers-management' })
  })

  it('navigates back when back button is clicked', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const backButton = screen.getByTestId('back-button')
      fireEvent.click(backButton)
    })

    expect(mockPush).toHaveBeenCalledWith({ name: 'providers-management' })
  })

  it('updates json value when input changes', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const jsonInput = screen.getByTestId('json-input')
      const newValue = '{"name": "Updated Provider"}'

      fireEvent.change(jsonInput, { target: { value: newValue } })

      expect(jsonInput).toHaveValue(newValue)
    })
  })

  it('clears json error when input changes', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const jsonInput = screen.getByTestId('json-input')
      const updateButton = screen.getByRole('button', { name: /save/i })

      // First, trigger an error
      fireEvent.change(jsonInput, { target: { value: 'invalid json' } })
      fireEvent.click(updateButton)

      expect(screen.getByTestId('json-error')).toBeInTheDocument()

      // Now change the input and verify error is cleared
      fireEvent.change(jsonInput, { target: { value: '{"name": "Test"}' } })

      expect(screen.queryByTestId('json-error')).not.toBeInTheDocument()
    })
  })

  it('shows error when submitting invalid JSON', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const jsonInput = screen.getByTestId('json-input')
      const updateButton = screen.getByRole('button', { name: /save/i })

      fireEvent.change(jsonInput, { target: { value: 'invalid json' } })
      fireEvent.click(updateButton)
    })

    await waitFor(() => {
      expect(screen.getByTestId('json-error')).toBeInTheDocument()
      expect(screen.getByTestId('json-error')).toHaveTextContent(/Invalid JSON/)
    })

    expect(providersStore.updateProvider).not.toHaveBeenCalled()
  })

  it('updates provider successfully with valid JSON', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)
    const updatedProvider = { ...mockProvider, name: 'Updated Provider' }
    vi.mocked(providersStore.updateProvider).mockResolvedValue(updatedProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const jsonInput = screen.getByTestId('json-input')
      const updateButton = screen.getByRole('button', { name: /save/i })

      const validJson = '{"name": "Updated Provider"}'
      fireEvent.change(jsonInput, { target: { value: validJson } })
      fireEvent.click(updateButton)
    })

    await waitFor(() => {
      expect(providersStore.updateProvider).toHaveBeenCalledWith('test-id-123', {
        name: 'Updated Provider',
      })
      expect(toaster.info).toHaveBeenCalledWith('Provider updated successfully')
      expect(mockPush).toHaveBeenCalledWith({ name: 'providers-management' })
    })
  })

  it('handles provider update error', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)
    vi.mocked(providersStore.updateProvider).mockRejectedValue(new Error('Update failed'))

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const jsonInput = screen.getByTestId('json-input')
      const updateButton = screen.getByRole('button', { name: /save/i })

      const validJson = '{"name": "Updated Provider"}'
      fireEvent.change(jsonInput, { target: { value: validJson } })
      fireEvent.click(updateButton)
    })

    await waitFor(() => {
      expect(providersStore.updateProvider).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('disables buttons while submitting', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)
    vi.mocked(providersStore.updateProvider).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockProvider as any), 100) // nosonar
        })
    )

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const jsonInput = screen.getByTestId('json-input')
      const updateButton = screen.getByRole('button', { name: /save/i })

      fireEvent.change(jsonInput, { target: { value: '{"name": "Test"}' } })
      fireEvent.click(updateButton)
    })

    await waitFor(() => {
      const updateButton = screen.getByRole('button', { name: /save/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      expect(updateButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })
  })

  it('does not attempt update when provider ID is missing', async () => {
    mockParams.id = ''
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const updateButton = screen.queryByRole('button', { name: /save/i })
      if (updateButton) {
        fireEvent.click(updateButton)
      }
    })

    expect(providersStore.updateProvider).not.toHaveBeenCalled()
  })

  it('handles JSON with multiple properties', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)
    const updatedProvider = {
      ...mockProvider,
      name: 'Updated Provider',
      description: 'Updated Description',
      config: { newKey: 'newValue' },
    }
    vi.mocked(providersStore.updateProvider).mockResolvedValue(updatedProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      const jsonInput = screen.getByTestId('json-input')
      const updateButton = screen.getByRole('button', { name: /save/i })

      const complexJson = JSON.stringify({
        name: 'Updated Provider',
        description: 'Updated Description',
        config: { newKey: 'newValue' },
      })

      fireEvent.change(jsonInput, { target: { value: complexJson } })
      fireEvent.click(updateButton)
    })

    await waitFor(() => {
      expect(providersStore.updateProvider).toHaveBeenCalledWith('test-id-123', {
        name: 'Updated Provider',
        description: 'Updated Description',
        config: { newKey: 'newValue' },
      })
    })
  })

  it('renders provider form after loading', async () => {
    vi.mocked(providersStore.getProvider).mockResolvedValue(mockProvider as any)

    render(<ProvidersEditPage />)

    await waitFor(() => {
      expect(screen.getByTestId('provider-form')).toBeInTheDocument()
    })
  })
})
