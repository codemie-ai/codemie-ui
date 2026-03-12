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

import React, { ReactNode } from 'react'

import DeleteDangerSvg from '@/assets/icons/delete.svg?react'
import Button from '@/components/Button/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { cn } from '@/utils/utils'

export interface ConfirmationModalProps {
  header: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonType?: ButtonType
  confirmButtonIcon?: ReactNode
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
  children?: ReactNode
  className?: string
  limitWidth?: boolean
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  header,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmButtonType = ButtonType.PRIMARY,
  confirmButtonIcon,
  visible,
  onCancel,
  onConfirm,
  children,
  className,
  limitWidth = false,
}) => {
  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button
        variant={ButtonType.BASE}
        onClick={(e) => {
          e.stopPropagation()
          onCancel()
        }}
      >
        {cancelText}
      </Button>
      <Button
        variant={confirmButtonType}
        onClick={(e) => {
          e.stopPropagation()
          onConfirm()
        }}
      >
        {confirmButtonIcon ?? confirmButtonType === ButtonType.DELETE ? <DeleteDangerSvg /> : null}
        {confirmText}
      </Button>
    </div>
  )

  return (
    <Popup
      className={cn('min-w-[380px] min-h-[170px]', className)}
      overlayClassName="z-60"
      hideClose
      header={header}
      visible={visible}
      onHide={onCancel}
      withBorder
      limitWidth={limitWidth}
      footerContent={footerContent}
    >
      <p className="mb-2 text-sm text-text-quaternary">{message}</p>
      {children}
    </Popup>
  )
}

export default ConfirmationModal
