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

import { Dialog } from 'primereact/dialog'
import React, { ReactNode, useEffect, useId } from 'react'

import CloseSvg from '@/assets/icons/cross.svg?react'
import CustomButton from '@/components/Button'
import { ButtonType } from '@/constants'
import { cn } from '@/utils/utils'

export interface PopupProps {
  isFullWidth?: boolean
  header?: string
  visible?: boolean
  onHide: () => void
  onSubmit?: () => void
  submitText?: string
  submitDisabled?: boolean
  overlayClassName?: string
  hideFooter?: boolean
  cancelText?: string
  bodyClassName?: string
  withBorder?: boolean
  withBorderBottom?: boolean
  hideClose?: boolean
  dismissableMask?: boolean
  className?: string
  children?: ReactNode
  headerContent?: ReactNode
  footerContent?: ReactNode
  footerClassName?: string
  cancelButtonType?: ButtonType
  submitButtonType?: ButtonType
  limitWidth?: boolean
}

const Popup: React.FC<PopupProps> = ({
  isFullWidth,
  header,
  visible,
  onHide,
  onSubmit,
  submitText = 'Create',
  submitDisabled = false,
  overlayClassName = '',
  hideFooter = false,
  cancelText = 'Cancel',
  bodyClassName = '',
  withBorder = true,
  withBorderBottom = true,
  hideClose = false,
  dismissableMask = true,
  className = '',
  children,
  headerContent,
  footerContent,
  limitWidth = false,
  footerClassName,
  cancelButtonType,
  submitButtonType,
}) => {
  const headerId = useId()

  // Handle Escape key press
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onHide()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [visible, onHide])

  // Custom header component
  const renderHeader = () => {
    if (headerContent) {
      return headerContent
    }

    return (
      <div className="flex items-center justify-between">
        {header && (
          <h4
            id={headerId}
            className="text-base font-semibold mb-0"
            dangerouslySetInnerHTML={{ __html: header }}
          />
        )}
      </div>
    )
  }

  // Custom footer component
  const renderFooter = () => {
    if (hideFooter) {
      return null
    }

    if (footerContent) {
      return footerContent
    }

    return (
      <div className={`flex justify-end gap-3 `}>
        <CustomButton variant={cancelButtonType ?? ButtonType.BASE} onClick={onHide}>
          {cancelText}
        </CustomButton>
        <CustomButton disabled={submitDisabled} onClick={onSubmit} type={submitButtonType}>
          {submitText}
        </CustomButton>
      </div>
    )
  }

  return (
    <Dialog
      focusOnShow={false}
      header={renderHeader}
      visible={visible}
      onHide={onHide}
      footer={renderFooter}
      closeIcon={hideClose ? '' : <CloseSvg />}
      className={cn(
        'rounded-lg border border-border-specific-panel-outline shadow-lg bg-surface-base-secondary h-auto max-h-[95%]',
        isFullWidth && 'w-full max-w-[90vw] xl:max-w-6xl',
        className,
        limitWidth && 'max-w-lg w-full'
      )}
      contentClassName={cn('px-4 pt-4 overflow-auto flex-1 overflow-y-auto', bodyClassName)}
      maskClassName={`fixed top-0 left-0 w-full h-full z-50 bg-black bg-opacity-50 ${overlayClassName}`}
      showHeader
      modal
      dismissableMask={dismissableMask}
      closeOnEscape
      draggable={false}
      resizable={false}
      pt={{
        root: {
          'aria-labelledby': header ? headerId : undefined,
          'aria-describedby': '',
        },
        header: {
          className: `px-4 py-3 flex items-center justify-between gap-4 bg-transparent ${
            withBorder ? 'border-b border-border-structural' : 'border-none'
          }`,
        },
        headerIcons: { className: cn('self-auto', hideClose && 'hidden') },
        mask: { className: '!z-50' },
        content: { className: 'border-none p-0 text-sm' },
        footer: {
          className: cn(
            `px-4 py-4 flex items-center justify-end gap-3 sticky bg-surface-base-secondary bottom-0 rounded-b-md bg-transparent ${
              withBorder && withBorderBottom && !footerContent && !hideFooter
                ? 'border-t border-border-structural'
                : 'border-none'
            }`,
            footerClassName
          ),
        },
      }}
    >
      {children}
    </Dialog>
  )
}

export default Popup
