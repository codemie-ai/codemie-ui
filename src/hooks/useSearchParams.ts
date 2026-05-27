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
  const [searchParams, setSearchParamsState] = useState<URLSearchParams>(
    () => new URLSearchParams(window.location.search)
  )

  const setSearchParams: SetURLSearchParams = useCallback((newSearchParams, options) => {
    const newSearchString = newSearchParams.toString()
    const newUrl = `${window.location.pathname}${newSearchString ? `?${newSearchString}` : ''}${
      window.location.hash
    }`

    if (options?.replace) {
      window.history.replaceState({}, '', newUrl)
    } else {
      window.history.pushState({}, '', newUrl)
    }
    setSearchParamsState(newSearchParams)

    const { pathname } = window.location
    if (newSearchString) {
      try {
        sessionStorage.setItem(`filters:${pathname}`, newSearchString)
      } catch (error) {
        console.error('Error storing filters in sessionStorage:', error)
      }
    } else {
      try {
        sessionStorage.removeItem(`filters:${pathname}`)
      } catch (error) {
        console.error('Error removing filters from sessionStorage:', error)
      }
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setSearchParamsState(new URLSearchParams(window.location.search))
    }

    if (!window.location.search) {
      try {
        const { pathname } = window.location
        const storedFilters = sessionStorage.getItem(`filters:${pathname}`)

        if (storedFilters) {
          const restoredParams = new URLSearchParams(storedFilters)
          setSearchParams(restoredParams, { replace: true })
        }
      } catch (error) {
        console.error('Error restoring filters from sessionStorage:', error)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [setSearchParams])

  const clearParams = useCallback(() => {
    try {
      const newUrl = `${window.location.pathname}${window.location.hash}`
      window.history.replaceState({}, '', newUrl)

      sessionStorage.removeItem(`filters:${window.location.pathname}`)

      setSearchParamsState(new URLSearchParams())
    } catch (error) {
      console.error('Error clearing URL parameters:', error)
    }
  }, [])

  return [searchParams, setSearchParams, clearParams]
}
