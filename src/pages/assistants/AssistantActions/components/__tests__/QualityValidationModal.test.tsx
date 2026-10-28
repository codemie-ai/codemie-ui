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
import { describe, it, expect, vi } from 'vitest'

import { Assistant, QualityValidation } from '@/types/entity/assistant'

import QualityValidationModal from '../QualityValidationModal'

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

const assistant = { id: 'a-1' } as Assistant
const qualityValidation = {} as QualityValidation

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof QualityValidationModal>> = {}
) =>
  render(
    <QualityValidationModal
      visible
      assistant={assistant}
      qualityValidation={qualityValidation}
      onHide={vi.fn()}
      onPublishAnyway={vi.fn().mockResolvedValue(undefined)}
      {...overrides}
    />
  )

describe('QualityValidationModal — Publish Anyway', () => {
  it('hides Publish Anyway when the user may not waive the verdict', () => {
    renderModal({ canPublishAnyway: false })

    expect(screen.queryByTestId('quality-validation-publish-anyway')).not.toBeInTheDocument()
  })

  it('calls onPublishAnyway immediately, without a reason, when no reason is required', async () => {
    const onPublishAnyway = vi.fn().mockResolvedValue(undefined)
    renderModal({ canPublishAnyway: true, onPublishAnyway })

    fireEvent.click(screen.getByTestId('quality-validation-publish-anyway'))

    await waitFor(() => expect(onPublishAnyway).toHaveBeenCalledWith(undefined))
  })

  it('leaves closing to the parent after a Publish Anyway that resolved', async () => {
    const onHide = vi.fn()
    const onPublishAnyway = vi.fn().mockResolvedValue(undefined)
    renderModal({ canPublishAnyway: true, onPublishAnyway, onHide })

    fireEvent.click(screen.getByTestId('quality-validation-publish-anyway'))

    await waitFor(() => expect(onPublishAnyway).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByTestId('quality-validation-publish-anyway')).toBeInTheDocument()
    )
    expect(onHide).not.toHaveBeenCalled()
  })

  it('hides footer buttons while publishing', async () => {
    let resolve: () => void = () => {}
    const onPublishAnyway = vi.fn().mockReturnValue(
      new Promise<void>((r) => {
        resolve = r
      })
    )
    renderModal({ canPublishAnyway: true, onPublishAnyway })

    fireEvent.click(screen.getByTestId('quality-validation-publish-anyway'))

    expect(screen.queryByTestId('quality-validation-publish-anyway')).not.toBeInTheDocument()
    resolve()
  })

  describe('when a reason is required', () => {
    it('asks for a reason of at least the minimum length before publishing', async () => {
      const onPublishAnyway = vi.fn().mockResolvedValue(undefined)
      renderModal({ canPublishAnyway: true, requireReason: true, onPublishAnyway })

      fireEvent.click(screen.getByTestId('quality-validation-publish-anyway'))
      expect(onPublishAnyway).not.toHaveBeenCalled()

      const confirm = screen.getByTestId('quality-validation-reason-confirm')
      expect(confirm).toBeDisabled()

      fireEvent.change(screen.getByTestId('quality-validation-reason-input'), {
        target: { value: '  Reviewed by hand, the findings are false positives.  ' },
      })
      fireEvent.click(confirm)

      await waitFor(() =>
        expect(onPublishAnyway).toHaveBeenCalledWith(
          'Reviewed by hand, the findings are false positives.'
        )
      )
    })
  })
})
