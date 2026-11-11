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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import FilterMultiSelect from '@/components/Filters/FilterMultiSelect'
import { MultiSelectOptionType } from '@/components/form/MultiSelect/MultiSelect'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { costCentersStore } from '@/store/costCenters'

const DEBOUNCE_MS = 300
const EMPTY_MESSAGE = 'No cost centers found'
const NO_RESULTS_MESSAGE = 'No cost centers match your search'
const LOADING_MESSAGE = 'Loading...'
const LOAD_ERROR_MESSAGE = 'Failed to load cost centers'
const UNAVAILABLE_LABEL = 'Cost center unavailable'

interface CostCenterFilterProps {
  value: string[]
  onChange: (ids: string[]) => void
}

const getEmptyFilterMessage = (loading: boolean, loadFailed: boolean) => {
  if (loading) return LOADING_MESSAGE
  return loadFailed ? LOAD_ERROR_MESSAGE : NO_RESULTS_MESSAGE
}

const CostCenterFilter = ({ value, onChange }: CostCenterFilterProps) => {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<MultiSelectOptionType[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [notFoundIds, setNotFoundIds] = useState<Set<string>>(new Set())
  const [labels, setLabels] = useState<Map<string, string>>(new Map())
  const [lookupAttempt, setLookupAttempt] = useState(0)
  const requestIdRef = useRef(0)
  const resolvingIdsRef = useRef(new Set<string>())
  const unavailableIdsRef = useRef(new Set<string>())

  const loadOptions = useCallback(async (search: string) => {
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    setLoading(true)
    try {
      const results = await costCentersStore.getCostCenterOptions(search)
      if (requestId !== requestIdRef.current) return
      setOptions(results.map(({ label, value: id }) => ({ label, value: String(id) })))
      setLabels((current) => {
        const next = new Map(current)
        results.forEach(({ label, value: id }) => next.set(String(id), label))
        return next
      })
      setLoadFailed(false)
      setHasLoaded(true)
    } catch {
      if (requestId !== requestIdRef.current) return
      // Leave hasLoaded false so reopening the dropdown retries.
      setOptions([])
      setLoadFailed(true)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  const runSearch = useCallback(() => {
    loadOptions(query).catch(() => undefined)
  }, [loadOptions, query])

  useDebouncedApply(query, DEBOUNCE_MS, runSearch)

  const handleFilter = useCallback((next: string) => {
    requestIdRef.current += 1
    setLoading(false)
    setHasLoaded(false)
    setQuery(next)
  }, [])

  const handleShow = useCallback(() => {
    if (!hasLoaded) loadOptions(query).catch(() => undefined)
    if (unavailableIdsRef.current.size > 0) {
      unavailableIdsRef.current.clear()
      setLookupAttempt((attempt) => attempt + 1)
    }
  }, [hasLoaded, loadOptions, query])

  const resolveLabel = useCallback(async (id: string) => {
    try {
      const costCenter = await costCentersStore.getCostCenter(id, { skipErrorHandling: true })
      setLabels((current) => new Map(current).set(id, costCenter.name))
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 404
      ) {
        setNotFoundIds((current) => new Set(current).add(id))
        return
      }
      unavailableIdsRef.current.add(id)
    } finally {
      resolvingIdsRef.current.delete(id)
    }
  }, [])

  useEffect(() => {
    value
      .filter(
        (id) =>
          !labels.has(id) &&
          !notFoundIds.has(id) &&
          !resolvingIdsRef.current.has(id) &&
          !unavailableIdsRef.current.has(id)
      )
      .forEach((id) => {
        resolvingIdsRef.current.add(id)
        resolveLabel(id).catch(() => undefined)
      })
  }, [labels, lookupAttempt, notFoundIds, resolveLabel, value])

  // Deleted cost centers (404) are pruned against the current selection, whenever the lookup settles.
  useEffect(() => {
    if (value.some((id) => notFoundIds.has(id))) {
      onChange(value.filter((id) => !notFoundIds.has(id)))
    }
  }, [notFoundIds, onChange, value])

  useEffect(
    () => () => {
      requestIdRef.current += 1
    },
    []
  )

  // Selected cost centers outside the current search page still need their label in the input.
  const resolvedOptions = useMemo(() => {
    const loaded = new Set(options.map((option) => option.value))
    const extras = value
      .filter((id) => !loaded.has(id))
      .map((id) => ({ label: labels.get(id) ?? UNAVAILABLE_LABEL, value: id }))
    return [...options, ...extras]
  }, [labels, options, value])

  return (
    <FilterMultiSelect
      id="cost-center-filter"
      name="cost-center-filter"
      className="w-full tracking-normal"
      label="Cost center"
      value={value}
      options={resolvedOptions}
      onChange={onChange}
      onFilter={handleFilter}
      onShow={handleShow}
      loading={loading}
      placeholder="All cost centers"
      filterPlaceholder="Search cost centers"
      emptyMessage={loadFailed ? LOAD_ERROR_MESSAGE : EMPTY_MESSAGE}
      emptyFilterMessage={getEmptyFilterMessage(loading, loadFailed)}
    />
  )
}

export default CostCenterFilter
