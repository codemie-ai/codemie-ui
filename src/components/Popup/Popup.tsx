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

import React, { createContext, ReactNode, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import CloseSvg from '@/assets/icons/cross.svg?react'
import gradientModal from '@/assets/images/gradient-modal.png'
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
  isMagic?: boolean
  hideHeader?: boolean
}

// Selectors for focusable elements (WAI-ARIA dialog focus trap)
const FOCUSABLE_QUERY = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

const bodyScrollLocks = new Set<symbol>()
let bodyOverflowBeforeLock = ''

const acquireBodyScrollLock = () => {
  const lock = Symbol('popup-scroll-lock')

  if (bodyScrollLocks.size === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyScrollLocks.add(lock)

  return () => {
    if (!bodyScrollLocks.delete(lock) || bodyScrollLocks.size > 0) return
    document.body.style.overflow = bodyOverflowBeforeLock
  }
}

// Context that exposes a DOM node inside the <dialog> for PrimeReact overlay portals.
// When showModal() is active, only descendants of <dialog> are not inert, so dropdowns
// that portal to document.body become unclickable. Components can read this context and
// use it as their PrimeReact `appendTo` target to stay within the dialog's DOM tree.
export const OverlayPortalContext = createContext<HTMLElement | null>(null)

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
  isMagic = false,
  hideHeader = false,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const headerId = useId()
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(null)

  // Capture the element that triggered the dialog so we can return focus on close
  useEffect(() => {
    if (visible) {
      triggerRef.current = document.activeElement as HTMLElement
    }
  }, [visible])

  // Promote the dialog to the native top layer and make the rest of the document inert
  useEffect(() => {
    if (!visible) return () => {}

    const dialog = dialogRef.current
    if (!dialog) return () => {}

    if (!dialog.open) dialog.showModal()

    return () => {
      if (dialog.open) dialog.close()
    }
  }, [visible])

  // Move focus into the dialog when it opens; return focus to trigger when it closes
  useEffect(() => {
    if (!visible) {
      triggerRef.current?.focus()
      return () => {}
    }
    // rAF ensures the portal is painted before we query focusable elements
    const raf = requestAnimationFrame(() => {
      if (!dialogRef.current) return
      if (dialogRef.current.contains(document.activeElement)) return
      dialogRef.current.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [visible])

  // Prevent background scroll while dialog is open
  useEffect(() => {
    if (!visible) return () => {}
    return acquireBodyScrollLock()
  }, [visible])

  // Native dialog events are registered imperatively because static JSX analyzers
  // treat <dialog> as non-interactive despite its built-in modal semantics.
  useEffect(() => {
    if (!visible) return () => {}

    const dialog = dialogRef.current
    if (!dialog) return () => {}

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_QUERY))
      if (!focusable.length) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // The native cancel event fires when Escape is pressed on a showModal() dialog.
    // Prevent the browser's default close and delegate to onHide() so our state handles it.
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onHide()
    }

    const handleBackdropClick = (event: MouseEvent) => {
      if (!dismissableMask || event.target !== dialog) return

      const { clientX, clientY } = event
      const { left, right, top, bottom } = dialog.getBoundingClientRect()
      const isOutsideDialog = clientX < left || clientX > right || clientY < top || clientY > bottom

      if (isOutsideDialog) onHide()
    }

    dialog.addEventListener('keydown', handleKeyDown)
    dialog.addEventListener('cancel', handleCancel)
    dialog.addEventListener('click', handleBackdropClick)

    return () => {
      dialog.removeEventListener('keydown', handleKeyDown)
      dialog.removeEventListener('cancel', handleCancel)
      dialog.removeEventListener('click', handleBackdropClick)
    }
  }, [visible, dismissableMask, onHide])

  if (!visible) return null

  const showHeader = !hideHeader
  const showFooter = !hideFooter

  return createPortal(
    <>
      {/* Visual backdrop — native dialog backdrop handles pointer interaction */}
      <div aria-hidden="true" className={cn('fixed inset-0 bg-black/50 z-50', overlayClassName)} />

      {/* Dialog — native semantics with a custom backdrop and focus trap */}
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={header && !hideHeader ? headerId : undefined}
        tabIndex={-1}
        className={cn(
          'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'm-0 p-0 text-inherit flex flex-col rounded-lg shadow-lg bg-surface-base-secondary',
          !isMagic && 'border border-border-specific-panel-outline',
          'max-h-[95vh] h-fit focus:outline-none backdrop:bg-transparent',
          isFullWidth && 'w-full max-w-[90vw] xl:max-w-6xl',
          limitWidth && 'max-w-lg w-full',
          className
        )}
        style={
          isMagic
            ? {
                backgroundImage: `url(${gradientModal})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
            : undefined
        }
      >
        {/* Header */}
        {showHeader && (
          <div
            className={cn(
              'px-4 py-3 flex items-center bg-transparent',
              !hideClose && 'gap-4',
              withBorder ? 'border-b border-border-structural' : 'border-none'
            )}
          >
            <div className="flex items-center justify-between grow">
              {headerContent ??
                (header && (
                  <h4 id={headerId} className="text-base font-semibold m-0">
                    {header}
                  </h4>
                ))}
            </div>

            {!hideClose && (
              <button
                type="button"
                aria-label="Close"
                onClick={onHide}
                className="shrink-0 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <CloseSvg />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <OverlayPortalContext.Provider value={overlayContainer}>
          <div className={cn('px-4 pt-4 overflow-y-auto flex-1', bodyClassName)}>{children}</div>
        </OverlayPortalContext.Provider>

        {/* Footer */}
        {showFooter && (
          <div
            className={cn(
              'px-4 py-4 flex items-center justify-end gap-4 sticky bottom-0 rounded-b-md bg-transparent',
              withBorder && withBorderBottom && !footerContent && !hideFooter
                ? 'border-t border-border-structural'
                : 'border-none',
              footerClassName
            )}
          >
            {footerContent ?? (
              <>
                <CustomButton variant={cancelButtonType ?? ButtonType.SECONDARY} onClick={onHide}>
                  {cancelText}
                </CustomButton>
                <CustomButton
                  disabled={submitDisabled}
                  onClick={onSubmit}
                  variant={submitButtonType ?? ButtonType.PRIMARY}
                >
                  {submitText}
                </CustomButton>
              </>
            )}
          </div>
        )}

        {/* Portal target for PrimeReact overlay panels — keeps them inside the dialog DOM
            tree so they remain interactive when showModal() marks the rest of the page inert */}
        <div ref={setOverlayContainer} />
      </dialog>
    </>,
    document.body
  )
}

export default Popup
