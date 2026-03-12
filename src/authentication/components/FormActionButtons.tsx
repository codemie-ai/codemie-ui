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

import Button from '@/components/Button'

import type { ReactNode } from 'react'

interface FormActionButtonsProps {
  isAppInitiatedAction?: boolean
  loginActionUrl: string
  cancelLabel: ReactNode
  submitLabel: ReactNode
  cancelAriaLabel: string
  submitAriaLabel: string
}

export default function FormActionButtons({
  isAppInitiatedAction,
  loginActionUrl,
  cancelLabel,
  submitLabel,
  cancelAriaLabel,
  submitAriaLabel,
}: FormActionButtonsProps) {
  const handleCancel = () => {
    const form = document.createElement('form')
    form.method = 'post'
    form.action = loginActionUrl
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'cancel-aia'
    input.value = 'true'
    form.appendChild(input)
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <div className="flex justify-end gap-3">
      {isAppInitiatedAction && (
        <Button
          buttonType="button"
          variant="secondary"
          className="w-fit"
          onClick={handleCancel}
          aria-label={cancelAriaLabel}
        >
          {cancelLabel}
        </Button>
      )}
      <Button buttonType="submit" className="w-fit" aria-label={submitAriaLabel}>
        {submitLabel}
      </Button>
    </div>
  )
}
