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

import { ClassValue, clsx } from 'clsx'
import jsYaml from 'js-yaml'
import { DateTime } from 'luxon'
import QuillImageDropAndPaste from 'quill-image-drop-and-paste'
import { twMerge } from 'tailwind-merge'

import { TOOLKITS } from '@/constants/assistants'
import { MCPServerDetails } from '@/types/entity/mcp'
import toaster from '@/utils/toaster'

const FILE_KIND = 'file'

export const DEFAULT_DATE_FORMAT = 'MM/dd/yyyy, HH:mm'
export const SHORT_DATE_FORMAT = 'MMM dd HH:mm'
export const HUMAN_DAY_FORMAT = 'MMM dd yyyy'
export const FILE_DATE_FORMAT = 'yyyy-MM-dd_HH:mm:ss'
export const SHARED = {
  NOT_SHARED: 'Not shared',
  WITH_PROJECT: 'With Project',
  GLOBAL: 'Marketplace',
}

const SYSTEM_CREATED_BY = 'System'

/**
 * Patches Quill's image paste handler to only process clipboard data that contains files.
 * This prevents Quill from intercepting text paste events while still allowing image pastes.
 */
export function monkeyPatchQuill(): void {
  const originalHandlePaste = QuillImageDropAndPaste.prototype.handlePaste

  QuillImageDropAndPaste.prototype.handlePaste = function (e: ClipboardEvent) {
    try {
      if (!e.clipboardData?.items) return

      const items = Array.from(e.clipboardData?.items || [])
      const onlyFiles = items.every((item) => item.kind === FILE_KIND)
      if (onlyFiles) originalHandlePaste.call(this, e)
    } catch (err) {
      console.error('Error in patched QuillImageDropAndPaste.handlePaste:', err)
      originalHandlePaste.call(this, e)
    }
  }
}

/** Returns the current environment mode */
export function getMode(): string {
  return window?._env_?.VITE_ENV || import.meta.env.VITE_ENV
}

/** Returns the configured Identity Provider (IDP) */
export function getIdpProvider(): string {
  return window?._env_?.VITE_IDP_PROVIDER || import.meta.env.VITE_IDP_PROVIDER || 'keycloak'
}

/** Returns whether local authentication is enabled */
export function getIsLocalAuth(): boolean {
  return getIdpProvider() === 'local'
}

export const hash = (str: string, seed = 0): number => {
  /* eslint-disable no-bitwise */
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  // eslint-disable-next-line no-plusplus
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export function removeTextFormattingOnCopy(): void {
  document.addEventListener('copy', (e: ClipboardEvent) => {
    const selection = window.getSelection()
    e.clipboardData?.setData('text/plain', selection?.toString() ?? '')
    e.preventDefault()
  })
}

export const capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export const parseDate = (dateString) => {
  const isDevMode = import.meta.env.MODE === 'development'
  const currentZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const serverZone = isDevMode ? currentZone : 'utc'

  return DateTime.fromISO(dateString, { zone: serverZone }).setZone(currentZone)
}

export const formatDate = (dateString, format = DEFAULT_DATE_FORMAT) => {
  if (!dateString) return '-'
  const dateObj = parseDate(dateString)

  return dateObj.toFormat(format)
}

export const truncateInput = (input: string, maxLength: number, default_input = '-') => {
  if (!input) {
    return default_input
  }
  if (!maxLength) {
    return input
  }
  return input.length > maxLength ? `${input.slice(0, maxLength)}...` : input
}

export const copyToClipboard = (message, notification) => {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(message)
      .then(() => {
        toaster.info(notification || 'Message copied to clipboard')
      })
      .catch(() => {
        toaster.error('Could not copy text')
      })
  }
}

/**
 * Copies rich text content to clipboard, preserving formatting and links.
 * This function writes both HTML and plain text formats to the clipboard,
 * allowing applications like Slack and Word to paste with formatting intact.
 *
 * @param htmlContent - The HTML string to copy (with formatting and links)
 * @param plainTextFallback - Plain text fallback for applications that don't support HTML
 * @param notification - Optional success message to display
 */
export const copyRichTextToClipboard = async (
  htmlContent: string,
  plainTextFallback: string,
  notification?: string
) => {
  try {
    // Check if the browser supports ClipboardItem API
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      // Create blobs for both HTML and plain text formats
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' })
      const textBlob = new Blob([plainTextFallback], { type: 'text/plain' })

      // Create a ClipboardItem with both formats
      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      })

      await navigator.clipboard.write([clipboardItem])
      toaster.info(notification || 'Message copied to clipboard')
    } else {
      // Fallback to plain text if ClipboardItem is not supported
      await navigator.clipboard.writeText(plainTextFallback)
      toaster.info(notification || 'Message copied to clipboard')
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    toaster.error('Could not copy text')
  }
}

export const createdBy = (createdBy) => {
  if (!createdBy) return SYSTEM_CREATED_BY
  return (
    createdBy.name || createdBy.username || createdBy.user_id || createdBy.id || SYSTEM_CREATED_BY
  )
}

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

export const makeCleanObject = (obj) => {
  // Remove null, undefined, empty string and empty array values
  return Object.keys(obj).reduce((acc, key) => {
    if (obj[key] === null || obj[key] === undefined || obj[key] === '') return acc
    if (Array.isArray(obj[key]) && obj[key].length === 0) return acc

    acc[key] = obj[key]
    return acc
  }, {})
}

export const preprocessYamlConfig = (yamlConfig) => {
  try {
    const yamlObject = jsYaml.load(yamlConfig)
    // Perform any necessary manipulations on the yamlObject here
    return jsYaml.dump(yamlObject)
  } catch (error) {
    console.error('Error parsing YAML:', error)
    return yamlConfig // Fallback to original if parsing fails
  }
}

export const getSharedValue = (isGlobal?: boolean, shared?: boolean) => {
  if (isGlobal) return SHARED.GLOBAL
  if (shared) return SHARED.WITH_PROJECT
  return SHARED.NOT_SHARED
}

export const getToolkitFromMcpServers = (
  mcpServers: MCPServerDetails[] = [],
  filterEnabled = false
) => {
  const servers = filterEnabled ? mcpServers.filter((mcp) => mcp.enabled) : mcpServers
  return {
    toolkit: TOOLKITS.MCP,
    label: 'MCP',
    tools: servers.map((mcp) => ({
      name: mcp.name,
      label: mcp.name,
      serverConfig: {
        ...mcp,
      },
      settings: mcp.settings,
    })),
  }
}

export const getRootPath = () => {
  const { host } = window.location
  const protocol = import.meta.env.MODE === 'development' ? 'http' : 'https'
  let suffix = import.meta.env.VITE_SUFFIX.length ? `${import.meta.env.VITE_SUFFIX}` : ''
  if (suffix && !host.endsWith('/') && !suffix.startsWith('/')) suffix = '/' + suffix

  return `${protocol}://${host}${suffix}`
}

const FILENAME_SEPARATOR_REGEXP = /^\d+~/
const FILENAME_SEPARATOR_LEGACY = '_'
const FILENAME_CHAR_COUNT_REGEXP = /^\d+/

export const decodeFileName = (fileName: string) => {
  let data: string

  const bytesData = atob(fileName)
  const bytes = Uint8Array.from(bytesData, (char) => char.charCodeAt(0))
  data = new TextDecoder().decode(bytes)

  const result: string[] = []

  while (data.length > 0) {
    const match = data.match(FILENAME_SEPARATOR_REGEXP)

    if (!match) {
      const values = data.split(FILENAME_SEPARATOR_LEGACY)
      return { mimeType: values[0], user: values[1], originalFileName: '' }
    }

    const charCountMatch = data.match(FILENAME_CHAR_COUNT_REGEXP)
    if (!charCountMatch) {
      throw new Error('Invalid data format')
    }

    const numOfChars = parseInt(charCountMatch[0], 10)
    const separatorIndex = numOfChars.toString().length + 1
    const word = data.substring(separatorIndex, separatorIndex + numOfChars)
    result.push(word)
    data = data.substring(separatorIndex + numOfChars)
  }

  return { mimeType: result[0], user: result[1], originalFileName: result[2] }
}
