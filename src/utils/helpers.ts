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

import jsYaml from 'js-yaml'
import endsWith from 'lodash/endsWith'
import includes from 'lodash/includes'
import isNumber from 'lodash/isNumber'
import isString from 'lodash/isString'
import some from 'lodash/some'
import { DateTime } from 'luxon'
import { matchPath } from 'react-router'

import { history } from '@/hooks/appLevel/useHistoryStack'
import { router, findRouteObject } from '@/hooks/useVueRouter'
import { router as hashRouter } from '@/router'
import { appInfoStore } from '@/store/appInfo'
import toaster from '@/utils/toaster'

export const DEFAULT_DATE_FORMAT = 'MM/dd/yyyy, HH:mm'
export const SHORT_DATE_FORMAT = 'MMM dd HH:mm'
export const FILE_DATE_FORMAT = 'yyyy-MM-dd_HH:mm:ss'

const SYSTEM_CREATED_BY = 'System'

export const capitalize = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const parseDate = (dateString?: string | null): DateTime => {
  const isDevMode = import.meta.env.MODE === 'development'
  const currentZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const serverZone = isDevMode ? currentZone : 'utc'

  return DateTime.fromISO(dateString, { zone: serverZone }).setZone(currentZone)
}

export const formatDate = (dateString?: string | null, format = DEFAULT_DATE_FORMAT): string => {
  if (!dateString) return '-'
  const dateObj = parseDate(dateString)

  return dateObj.toFormat(format)
}

export const truncateInput = (input?: string, maxLength?: number, default_input = '-'): string => {
  if (!input) {
    return default_input
  }
  if (!maxLength) {
    return input
  }
  return input.length > maxLength ? `${input.slice(0, maxLength)}...` : input
}

export const isElementTruncated = (element: HTMLElement | null, onlyWidth?: boolean): boolean => {
  if (!element) return false
  if (element.scrollWidth > element.clientWidth) return true

  return !onlyWidth && element.scrollHeight > element.clientHeight
}

export const humanize = (string: string): string => {
  // Special case for xray to display as X-ray
  if (string.toLowerCase() === 'xray') {
    return 'X-ray'
  }

  // Special case for sharepoint to display as SharePoint
  if (string.toLowerCase() === 'sharepoint') {
    return 'SharePoint'
  }

  const words = string.split('_')

  return words
    .map((word, _index) => {
      return capitalize(word)
    })
    .join(' ')
}

export const copyToClipboard = (message: string, notification?: string): void => {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(message)
      .then(() => {
        toaster.info(notification ?? 'Message copied to clipboard')
      })
      .catch((err) => {
        toaster.error('Could not copy text')
        console.error(err)
      })
  }
}

interface CreatedBy {
  name?: string
  username?: string
  user_id?: string
  id?: string
}

export const createdBy = (createdBy?: CreatedBy | null, fallbackToId = false): string => {
  if (!createdBy) return SYSTEM_CREATED_BY

  if (!createdBy.name && !createdBy.username) {
    return fallbackToId ? createdBy.user_id || createdBy.id || SYSTEM_CREATED_BY : SYSTEM_CREATED_BY
  }

  return (
    createdBy.name || createdBy.username || createdBy.user_id || createdBy.id || SYSTEM_CREATED_BY
  )
}

export const fileToBase64 = (file: File): Promise<string | ArrayBuffer | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

export const useCloned = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

export const cleanObject = <T extends Record<string, any>>(obj: T): Partial<T> => {
  // Remove null, undefined, empty string and empty array values
  return Object.keys(obj).reduce((acc, key) => {
    if (obj[key] === null || obj[key] === undefined || obj[key] === '') return acc
    if (Array.isArray(obj[key]) && obj[key].length === 0) return acc

    // @ts-expect-error: Type 'Partial<T>' is generic and can only be indexed for reading.ts(2862)
    acc[key] = obj[key]
    return acc
  }, {} as Partial<T>)
}

const FILENAME_SEPARATOR_REGEXP = /^\d+~/
const FILENAME_SEPARATOR_LEGACY = '_'
const FILENAME_CHAR_COUNT_REGEXP = /^\d+/

/**
 * Assuming fileName is a Base64 string
 * The format of decoded string is: 5~hello5~world, where:
 * 5 - # of characters, ~ - separator
 * Also supports legacy format: ex. mimeType_user_originalFileName
 */
export const decodeFileName = (fileName: string): string[] => {
  let data: string

  try {
    const bytesData = atob(fileName)
    const bytes = Uint8Array.from(bytesData, (char) => char.charCodeAt(0))
    data = new TextDecoder().decode(bytes)
  } catch (e) {
    return []
  }

  const result: string[] = []

  while (data.length > 0) {
    const match = data.match(FILENAME_SEPARATOR_REGEXP)

    if (!match) {
      return data.split(FILENAME_SEPARATOR_LEGACY)
    }

    const numOfChars = parseInt(data.match(FILENAME_CHAR_COUNT_REGEXP)![0], 10)
    const separatorIndex = numOfChars.toString().length + 1
    const word = data.substring(separatorIndex, separatorIndex + numOfChars)
    result.push(word)
    data = data.substring(separatorIndex + numOfChars)
  }

  return result
}

export const sleep = async (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export const preprocessYamlConfig = (yamlConfig: string): string => {
  try {
    const yamlObject = jsYaml.load(yamlConfig)
    // Perform any necessary manipulations on the yamlObject here
    return jsYaml.dump(yamlObject)
  } catch (error) {
    console.error('Error parsing YAML:', error)
    return yamlConfig // Fallback to original if parsing fails
  }
}

export const pluralize = (
  count: number | null,
  word: string,
  customPlural: string | null = null
): string => {
  if (count === 1) return word
  if (customPlural) return customPlural

  if (endsWith(word, 'y') && !includes(['a', 'e', 'i', 'o', 'u'], word[word.length - 2])) {
    return word.slice(0, -1) + 'ies'
  }

  if (some(['s', 'x', 'z', 'sh', 'ch'], (suffix) => endsWith(word, suffix))) {
    return word + 'es'
  }

  return word + 's'
}

interface RouteLocation {
  name: string
  params?: Record<string, any>
  query?: Record<string, any>
}

type AllowedRoute = string | RouteLocation

/**
 * Navigates back to the last allowed route or falls back to parent route. Examples:
 * await navigateBack('home', 'profile', 'settings')
 * await navigateBack({ name: 'dashboard', params{ id: 1 } }, 'setting')
 *
 * If no history exists, it will navigate to parent route by removing the last path segment
 * e.g., /assistants/123/edit -> /assistants/123 -> /assistants
 */
export const navigateBack = async (...allowedRoutesArgs: AllowedRoute[]): Promise<void> => {
  if (!allowedRoutesArgs.length) {
    router.push({ name: 'root' })
    return
  }
  const allowedRoutes: RouteLocation[] = allowedRoutesArgs.map((route) =>
    isString(route) ? { name: route } : route
  )
  const allowedRouteNames = allowedRoutes
    .map((route) => route.name)
    .filter((name) => name !== hashRouter.state.matches.at(-1)?.route.id)

  // @ts-expect-error: roperty 'findLast' does not exist on type 'HistoryStoreItem[]'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2023' or later.ts(2550)
  const prevRoute = history.stack.findLast((item: any) => allowedRouteNames.includes(item.name))
  if (prevRoute) {
    const { name, params, query } = prevRoute
    router.push({ name, params, query })
    return
  }

  // If no history found, try to navigate to parent route by path parameters
  const currentRoute = hashRouter.state.matches.at(-1)

  // @ts-expect-error: Property 'toReversed' does not exist on type 'string[]'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2023' or later.ts(2550)
  for (const allowedRouteName of allowedRouteNames.toReversed()) {
    const allowedRouteObject = findRouteObject(allowedRouteName)
    if (allowedRouteObject) {
      // Check if currente route is a sub path of the route object
      const path = matchPath(
        { path: allowedRouteObject.path!, end: false },
        currentRoute?.pathname ?? ''
      )?.pathname

      if (path && path !== currentRoute?.pathname) {
        hashRouter.navigate(path)
        return
      }
    }
  }

  router.push({ name: allowedRouteNames[0] })
}

export const getRootPath = (): string => {
  const { host } = window.location
  const protocol = import.meta.env.MODE === 'development' ? 'http' : 'https'
  let suffix = import.meta.env.VITE_SUFFIX?.length ? `${import.meta.env.VITE_SUFFIX}` : ''
  if (suffix && !host.endsWith('/') && !suffix.startsWith('/')) suffix = '/' + suffix

  return `${protocol}://${host}${suffix}`
}

export const isNumberValue = (num: any): boolean => {
  return isNumber(num)
}

export const getSidebarMaxWidthClass = (): string => {
  if (!appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded) return 'max-w-navbar'
  if (appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
    return 'max-w-[calc(theme(spacing.navbar)+theme(spacing.sidebar))]'
  if (!appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
    return 'max-w-navbar-expanded'
  if (appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
    return 'max-w-[calc(theme(spacing.navbar-expanded)+theme(spacing.sidebar))]'

  return ''
}

export const getSidebarOffsetClass = (): string => {
  if (!appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded) return 'left-navbar'
  if (appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
    return 'left-[calc(theme(spacing.navbar)+theme(spacing.sidebar))]'
  if (!appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
    return 'left-navbar-expanded'
  if (appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
    return 'left-[calc(theme(spacing.navbar-expanded)+theme(spacing.sidebar))]'

  return ''
}

// Re-export generateThemes for backwards compatibility
export { generateThemes } from './themeHelpers'
