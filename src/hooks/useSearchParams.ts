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

import { useState, useCallback, useEffect } from 'react'

type SetURLSearchParams = (
  newSearchParams: URLSearchParams,
  options?: { replace?: boolean }
) => void

type UseSearchParamsReturn = [URLSearchParams, SetURLSearchParams, () => void]

export const useSearchParams = (): UseSearchParamsReturn => {
  // Initialize with current URL parameters on component mount
  const [searchParams, setSearchParamsState] = useState<URLSearchParams>(
    () => new URLSearchParams(getQueryStringFromHash())
  )

  const setSearchParams: SetURLSearchParams = useCallback((newSearchParams, options) => {
    const newSearchString = newSearchParams.toString()
    const fullNewHash = updateHashWithQuery(newSearchString ? `?${newSearchString}` : '')

    if (options?.replace) {
      window.history.replaceState({}, '', fullNewHash)
    } else {
      window.history.pushState({}, '', fullNewHash)
    }
    setSearchParamsState(newSearchParams)

    // Store the search params in sessionStorage for persistence across page refreshes
    if (newSearchString) {
      try {
        const currentPath = window.location.hash.split('?')[0]
        sessionStorage.setItem(`filters:${currentPath}`, newSearchString)
      } catch (error) {
        console.error('Error storing filters in sessionStorage:', error)
      }
    } else {
      // If search params are empty, remove from sessionStorage
      try {
        const currentPath = window.location.hash.split('?')[0]
        sessionStorage.removeItem(`filters:${currentPath}`)
      } catch (error) {
        console.error('Error removing filters from sessionStorage:', error)
      }
    }
  }, [])

  // Handle hash change and page refresh
  useEffect(() => {
    const handleHashChange = () => {
      // When hash changes, update the search params state
      const queryString = getQueryStringFromHash()
      setSearchParamsState(new URLSearchParams(queryString))
    }

    // Handle page refresh - restore filters from sessionStorage if no query params in URL
    const currentQueryString = getQueryStringFromHash()
    if (!currentQueryString) {
      try {
        const currentPath = window.location.hash.split('?')[0]
        const storedFilters = sessionStorage.getItem(`filters:${currentPath}`)

        if (storedFilters) {
          // Restore filters from sessionStorage
          const restoredParams = new URLSearchParams(storedFilters)
          setSearchParams(restoredParams, { replace: true })
        }
      } catch (error) {
        console.error('Error restoring filters from sessionStorage:', error)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [setSearchParams])

  // Function to clear all filter parameters from URL and sessionStorage
  const clearParams = useCallback(() => {
    try {
      // Get the current hash without query parameters
      const { hash } = window.location
      const questionMarkIndex = hash.indexOf('?')
      const basePathInHash = questionMarkIndex !== -1 ? hash.substring(0, questionMarkIndex) : hash

      // Update the URL without query parameters
      window.history.replaceState({}, '', basePathInHash)

      // Clear from sessionStorage
      const currentPath = basePathInHash
      sessionStorage.removeItem(`filters:${currentPath}`)

      // Update the state
      setSearchParamsState(new URLSearchParams())
    } catch (error) {
      console.error('Error clearing URL parameters:', error)
    }
  }, [setSearchParams])

  return [searchParams, setSearchParams, clearParams]
}

const getQueryStringFromHash = (): string => {
  const { hash } = window.location
  const questionMarkIndex = hash.indexOf('?')
  if (questionMarkIndex !== -1) {
    return hash.substring(questionMarkIndex)
  }
  return ''
}

const updateHashWithQuery = (newSearchString: string): string => {
  const { hash } = window.location
  const questionMarkIndex = hash.indexOf('?')

  let basePathInHash = hash
  if (questionMarkIndex !== -1) {
    basePathInHash = hash.substring(0, questionMarkIndex)
  }

  return `${basePathInHash}${newSearchString ?? ''}`
}
