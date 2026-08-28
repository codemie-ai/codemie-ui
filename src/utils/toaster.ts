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

import DOMPurify from 'dompurify'
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

const fixCloseButton = () => {
  const closeButton = document.querySelector('.toast-close') as HTMLButtonElement
  if (closeButton) {
    closeButton.setAttribute('aria-label', 'Close notification')
    closeButton.innerHTML = '<div aria-hidden="true" class="toast-close-icon">&#10006;</div>'
  }
}

interface ToastOptions {
  text?: string
  className?: string
  newWindow?: boolean
  close?: boolean
  gravity?: 'top' | 'bottom'
  position?: 'left' | 'center' | 'right'

  /** Prevents dismissing of toast on hover */
  stopOnFocus?: boolean
  escapeMarkup?: boolean
  selector?: string
  duration?: number

  /** Callback after click */
  onClick?: () => void
}

const defaultOpts: ToastOptions = {
  text: 'This is a toast',
  className: 'codemie-toast',
  newWindow: true,
  close: true,
  gravity: 'top',
  position: 'right',
  stopOnFocus: true,
  escapeMarkup: false,
  selector: 'toast-container',
  onClick() {},
}

const infoOpts: ToastOptions = {
  className: 'codemie-toast codemie-toast-info',
  duration: 3000,
}

const successOpts: ToastOptions = {
  className: 'codemie-toast codemie-toast-success',
  duration: 3000,
}

const errOpts: ToastOptions = {
  className: 'codemie-toast codemie-toast-err',
  duration: 10000,
}

const prepareText = (text: string): string => {
  const separatorRegex = /<br\s*\/?>/ // Matches <br>, <br/>, or </br>
  let [header, content] = text.split(separatorRegex, 2)

  if (!header) header = ''
  if (!content) content = ''

  const allowedTags = { ALLOWED_TAGS: ['br', 'i', 'b', 'em', 'strong'] }
  return `<h2 class="codemie-toast-header">${DOMPurify.sanitize(
    header,
    allowedTags
  )}</h2><p class="codemie-toast-content">${DOMPurify.sanitize(content, allowedTags)}</p>`
}

interface Toaster {
  info: (text: string) => void
  success: (text: string) => void
  error: (text: string) => void
}

// Toastify writes its DOM directly into #toast-container, which screen readers do not reliably
// pick up even with aria-live on the container. A React-owned announcer element (mounted once by
// <ToasterAnnouncer />) registers itself through setToasterAnnouncer; each toast call routes its
// plain text here in parallel with the visual toast (WCAG 4.1.3).
let announcer: ((message: string) => void) | null = null

/**
 * Registers or clears the callback that mirrors toast text into the screen-reader live region.
 *
 * Pass a function to install it as the active announcer, or `null` to clear the slot — but a
 * `null` call clears only when the current announcer is `expected`. That guard matters if two
 * `<ToasterAnnouncer />` instances briefly coexist (HMR hot-swap, mistaken double-mount): the old
 * instance's unmount cleanup must not evict the new instance's registration and silently swallow
 * every subsequent toast.
 */
export const setToasterAnnouncer = (
  fn: ((message: string) => void) | null,
  expected?: ((message: string) => void) | null
): void => {
  if (fn === null && expected !== undefined && announcer !== expected) return
  announcer = fn
}

// Toast messages use a `<header><br><content>` convention (see prepareText). The visual toast
// renders sanitized HTML, but a screen reader must hear a plain sentence — otherwise the literal
// `<br>` string is announced. Parse the source as HTML, swap <br> nodes for spaces so header and
// content stay separated, then read textContent. Everything walks the input in linear time and
// touches no regex — no ReDoS surface, and Sonar has no hotspot to review.
const WHITESPACE_CHARS = new Set([' ', '\t', '\n', '\r', '\f', '\v'])

const collapseWhitespace = (input: string): string => {
  let out = ''
  let prevWasSpace = true
  for (const ch of input) {
    if (WHITESPACE_CHARS.has(ch)) {
      if (!prevWasSpace) {
        out += ' '
        prevWasSpace = true
      }
    } else {
      out += ch
      prevWasSpace = false
    }
  }
  return prevWasSpace ? out.slice(0, -1) : out
}

const toAnnouncement = (text: string): string => {
  const doc = new DOMParser().parseFromString(text, 'text/html')
  doc.body.querySelectorAll('br').forEach((br) => br.replaceWith(' '))
  return collapseWhitespace(doc.body.textContent ?? '')
}

const toaster: Toaster = {
  info: (text: string) => {
    if (!text) return
    Toastify({ ...defaultOpts, ...infoOpts, text: prepareText(text) }).showToast()
    fixCloseButton()
    announcer?.(toAnnouncement(text))
  },
  success: (text: string) => {
    if (!text) return
    Toastify({ ...defaultOpts, ...successOpts, text: prepareText(text) }).showToast()
    fixCloseButton()
    announcer?.(toAnnouncement(text))
  },
  error: (text: string) => {
    if (!text) return
    Toastify({ ...defaultOpts, ...errOpts, text: prepareText(text) }).showToast()
    fixCloseButton()
    announcer?.(toAnnouncement(text))
  },
}

export default toaster
