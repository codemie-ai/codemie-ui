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

  return `<h2 class="codemie-toast-header">${header}</h2><p class="codemie-toast-content">${content}</p>`
}

interface Toaster {
  info: (text: string) => void
  success: (text: string) => void
  error: (text: string) => void
}

const toaster: Toaster = {
  info: (text: string) => {
    if (!text) return
    Toastify({ ...defaultOpts, ...infoOpts, text: prepareText(text) }).showToast()
    fixCloseButton()
  },
  success: (text: string) => {
    if (!text) return
    Toastify({ ...defaultOpts, ...successOpts, text: prepareText(text) }).showToast()
    fixCloseButton()
  },
  error: (text: string) => {
    if (!text) return
    Toastify({ ...defaultOpts, ...errOpts, text: prepareText(text) }).showToast()
    fixCloseButton()
  },
}

export default toaster
