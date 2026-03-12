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

import React from 'react'

import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'
import toaster from '@/utils/toaster'

interface ActionConfirmationModalProps {
  isOpen: boolean
  header: string
  message: string
  confirmText?: string
  confirmButtonType?: ButtonType
  confirmButtonIcon?: React.ReactNode
  onConfirm: () => Promise<void>
  onCancel: () => void
  onSuccess?: () => Promise<void> | void
  successMessage: string
  errorMessage?: string
}

const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({
  isOpen,
  header,
  message,
  confirmText,
  confirmButtonType,
  confirmButtonIcon,
  onConfirm,
  onCancel,
  onSuccess,
  successMessage,
  errorMessage = null,
}) => {
  const handleConfirm = async () => {
    try {
      await onConfirm()
      toaster.info(successMessage)
      await onSuccess?.()
      onCancel()
    } catch (error) {
      console.error(errorMessage, error)

      if (errorMessage) toaster.error(errorMessage)
      onCancel()
    }
  }

  return (
    <ConfirmationModal
      visible={isOpen}
      header={header}
      message={message}
      confirmText={confirmText}
      confirmButtonType={confirmButtonType}
      onConfirm={handleConfirm}
      onCancel={onCancel}
      confirmButtonIcon={confirmButtonIcon}
    />
  )
}

export default ActionConfirmationModal
