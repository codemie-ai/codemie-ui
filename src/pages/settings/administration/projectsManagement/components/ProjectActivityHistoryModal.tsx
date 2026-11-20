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

import { FC, Fragment, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import ActorSelector from '@/components/ActorSelector/ActorSelector'
import CustomButton from '@/components/Button'
import DatePicker from '@/components/form/DatePicker/DatePicker'
import MultiSelect from '@/components/form/MultiSelect/MultiSelect'
import Select from '@/components/form/Select/Select'
import Popup from '@/components/Popup'
import Table from '@/components/Table'
import { ButtonType, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { createProjectActivityEventsStore } from '@/store/projectActivityEvents'
import {
  ActivityEventListItem,
  ProjectActivityEventsParams,
} from '@/types/entity/projectActivityEvent'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import {
  getBudgetDifference,
  getEventActorLabel,
  getEventAttributeRows,
  getEventDisplayLabel,
  getEventTargetLabel,
} from '@/utils/activityEventPresentation'
import { formatLabel } from '@/utils/formatLabel'
import { formatDate } from '@/utils/helpers'

export interface ProjectActivityHistoryModalProps {
  projectInstanceId: string
  projectName: string
  onHide: () => void
}

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'desc' },
  { label: 'Oldest first', value: 'asc' },
]

const columnDefinitions: ColumnDefinition[] = [
  { key: 'created_at', label: 'When', type: DefinitionTypes.Custom, headClassNames: 'w-[18%]' },
  { key: 'label', label: 'Event', type: DefinitionTypes.Custom, headClassNames: 'w-[28%]' },
  { key: 'entity', label: 'Entity', type: DefinitionTypes.Custom, headClassNames: 'w-[24%]' },
  { key: 'actor', label: 'Actor', type: DefinitionTypes.Custom, headClassNames: 'w-[30%]' },
]

function renderCreatedAt(item: ActivityEventListItem) {
  return (
    <span className="whitespace-nowrap text-text-primary text-sm">
      {formatDate(item.created_at)}
    </span>
  )
}

function renderLabel(item: ActivityEventListItem) {
  return <span className="text-text-primary text-sm">{getEventDisplayLabel(item)}</span>
}

function renderEntity(item: ActivityEventListItem) {
  return <span className="text-text-primary text-sm">{getEventTargetLabel(item)}</span>
}

function renderActor(item: ActivityEventListItem) {
  return <span className="text-text-primary text-sm">{getEventActorLabel(item)}</span>
}

const customRenderColumns = {
  created_at: renderCreatedAt,
  label: renderLabel,
  entity: renderEntity,
  actor: renderActor,
}

function renderExpandedRow(item: ActivityEventListItem) {
  const rows = getEventAttributeRows(item)
  const budgetDifferences = [
    {
      after: 'New max budget',
      label: 'Max budget change',
      value: getBudgetDifference(item, 'max_budget'),
    },
    {
      after: 'New soft budget',
      label: 'Soft limit change',
      value: getBudgetDifference(item, 'soft_budget'),
    },
  ]
  if (!rows.length) {
    return <div className="p-3 text-sm text-text-quaternary">No additional detail</div>
  }
  return (
    <dl className="grid grid-cols-activity-details items-start gap-x-2 gap-y-1 p-3 text-sm">
      {rows.map((row) => (
        <Fragment key={row.label}>
          <dt className="min-w-0 break-words text-text-quaternary">{row.label}</dt>
          <dd className="min-w-0 break-all text-text-primary">{row.value}</dd>
          {budgetDifferences.map(
            ({ after, label, value }) =>
              row.label === after &&
              value && (
                <Fragment key={label}>
                  <dt className="min-w-0 break-words text-text-quaternary">{label}</dt>
                  <dd className={value.colorClassName}>
                    {value.triangle && (
                      <span aria-hidden="true" className="mr-1">
                        {value.triangle}
                      </span>
                    )}
                    {value.formattedValue}
                  </dd>
                </Fragment>
              )
          )}
        </Fragment>
      ))}
    </dl>
  )
}

const ProjectActivityHistoryModal: FC<ProjectActivityHistoryModalProps> = ({
  projectInstanceId,
  projectName,
  onHide,
}) => {
  const [store] = useState(() => createProjectActivityEventsStore())
  const { events, pagination, loading, error, metadata, metadataLoading, metadataError } =
    useSnapshot(store)
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false)

  // `useSnapshot` under the unit-test harness returns the live store instead of a reactive
  // snapshot (see src/setupTests.unit.ts), so store mutations made inside async callbacks do
  // not, by themselves, schedule a re-render there. Bumping this counter after each store call
  // resolves forces React to re-render and read the store's current values in both harnesses.
  const [, forceRerender] = useReducer((tick: number) => tick + 1, 0)

  const [category, setCategory] = useState<string[]>([])
  const [domain, setDomain] = useState<string[]>([])
  const [eventType, setEventType] = useState<string[]>([])
  const [actorId, setActorId] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [perPage, setPerPage] = useState(50)
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([])

  // Guards against a slower, earlier listEvents response overwriting the store with
  // stale events/pagination after a newer request (for a filter/page the user already
  // changed away from) has already resolved.
  const requestIdRef = useRef(0)
  // Incremented just before every explicit onPaginationChange-driven perPage change, so the
  // perPage effect below can skip exactly that many of its own runs — one count per change,
  // so two rapid page-size changes before the first effect run fires don't let the second
  // change's skip get silently swallowed by the first.
  const skipNextPerPageEffectCountRef = useRef(0)
  // The perPage effect's very first run (on mount) is redundant with the filter-deps effect
  // below, which already issues the initial load — this skips only that one run.
  const isInitialPerPageMountRef = useRef(true)
  // Guards every async-callback-driven forceRerender call (listEvents/loadMetadata settling
  // after the modal has closed mid-flight) so a stale request's resolution never re-renders a
  // component that is no longer mounted.
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const buildParams = useCallback(
    (page: number, limit: number): ProjectActivityEventsParams => ({
      category: category.length ? category : null,
      domain: domain.length ? domain : null,
      event_type: eventType.length ? eventType : null,
      actor_id: actorId || null,
      sort_dir: sortDir,
      from: from || null,
      to: to || null,
      limit,
      offset: page * limit,
    }),
    [category, domain, eventType, actorId, sortDir, from, to]
  )

  const loadEvents = useCallback(
    (page = 0, limit = perPage) => {
      requestIdRef.current += 1
      const requestId = requestIdRef.current
      store.listEvents(projectInstanceId, buildParams(page, limit)).finally(() => {
        if (requestId === requestIdRef.current && isMountedRef.current) {
          setHasLoadedEvents(true)
          forceRerender()
        }
      })
    },
    [store, projectInstanceId, buildParams, perPage, forceRerender]
  )

  const loadMetadata = useCallback(() => {
    // store.loadMetadata sets metadataLoading synchronously before its first await, so a
    // render triggered right after kicking it off picks that up — needed so domain/event_type
    // show disabled while metadata is in flight, not only once it settles.
    const promise = store.loadMetadata(projectInstanceId)
    forceRerender()
    promise.finally(() => {
      if (isMountedRef.current) forceRerender()
    })
  }, [store, projectInstanceId, forceRerender])

  useEffect(() => {
    loadMetadata()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectInstanceId])

  useEffect(() => {
    setExpandedRowIds([])
    loadEvents(0, perPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.join(','), domain.join(','), eventType.join(','), actorId, sortDir, from, to])

  useEffect(() => {
    if (isInitialPerPageMountRef.current) {
      isInitialPerPageMountRef.current = false
      return
    }
    if (skipNextPerPageEffectCountRef.current > 0) {
      skipNextPerPageEffectCountRef.current -= 1
      return
    }
    loadEvents(0, perPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPage])

  const toggleExpand = useCallback((id: string) => {
    setExpandedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )
  }, [])

  const domainOptions = useMemo(() => {
    return (metadata?.domains ?? []).map((d) => ({ label: formatLabel(d), value: d }))
  }, [metadata?.domains])

  const categoryOptions = useMemo(
    () => (metadata ? metadata.categories.map((value) => ({ label: value, value })) : []),
    [metadata?.categories]
  )

  const eventTypeOptions = useMemo(
    () => (metadata?.event_types ?? []).map((t) => ({ label: t.label, value: t.event_type })),
    [metadata?.event_types]
  )

  const hasActiveFilters =
    category.length > 0 ||
    domain.length > 0 ||
    eventType.length > 0 ||
    !!actorId ||
    !!from ||
    !!to ||
    sortDir !== 'desc'

  const clearFilters = useCallback(() => {
    setCategory([])
    setDomain([])
    setEventType([])
    setActorId('')
    setFrom(null)
    setTo(null)
    setSortDir('desc')
  }, [])

  const handleRetry = useCallback(() => {
    if (metadataError) loadMetadata()
    if (error) loadEvents(pagination.page, pagination.perPage || perPage)
  }, [metadataError, error, loadMetadata, loadEvents, pagination.page, pagination.perPage, perPage])

  const recordingDisabled = metadata?.recording_enabled === false

  const renderBody = () => {
    if (error || metadataError) {
      return (
        <div className="flex flex-col items-start gap-3 p-4">
          <span className="text-sm text-text-primary">{error || metadataError}</span>
          <CustomButton variant={ButtonType.SECONDARY} onClick={handleRetry}>
            Retry
          </CustomButton>
        </div>
      )
    }

    if (recordingDisabled) {
      return (
        <div className="p-4 text-sm text-text-quaternary">
          Activity recording is disabled for this project.
        </div>
      )
    }

    return (
      <>
        <div className="text-sm text-text-quaternary px-1">
          {pagination.totalCount} total event{pagination.totalCount === 1 ? '' : 's'}
        </div>
        <Table
          items={events}
          columnDefinitions={columnDefinitions}
          customRenderColumns={customRenderColumns}
          loading={loading}
          emptyState={
            hasLoadedEvents ? (
              <div className="p-4 text-sm text-text-quaternary">
                No activity events for this project generation.
              </div>
            ) : null
          }
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            perPage: pagination.perPage,
            totalCount: pagination.totalCount,
          }}
          onPaginationChange={(page, newPerPage) => {
            const limit = newPerPage ?? perPage
            if (limit !== perPage) {
              skipNextPerPageEffectCountRef.current += 1
              setPerPage(limit)
            }
            setExpandedRowIds([])
            loadEvents(page, limit)
          }}
          perPageOptions={DECIMAL_PAGINATION_OPTIONS}
          paginationVariant="neutral"
          expandedRowIds={expandedRowIds}
          onToggleExpand={toggleExpand}
          renderExpandedRow={renderExpandedRow}
          isModalFooter
        />
      </>
    )
  }

  return (
    <Popup
      isFullWidth
      header={`Activity history — ${projectName}`}
      visible
      onHide={onHide}
      hideFooter
      bodyClassName="flex flex-col overflow-hidden pb-4"
    >
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <p className="text-sm text-text-quaternary">
          Project generation:{' '}
          <span className="break-all text-text-secondary">{projectInstanceId}</span>
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="w-52">
            <MultiSelect
              label="Category"
              value={category}
              options={categoryOptions}
              onChange={(e) => setCategory(e.value ?? [])}
              placeholder="All categories"
              showCheckbox
              loading={metadataLoading}
              disabled={metadataLoading}
            />
          </div>
          <div className="w-44">
            <DatePicker label="From" value={from} onChange={setFrom} showTime hourFormat="24" />
          </div>
          <div className="w-44">
            <DatePicker label="To" value={to} onChange={setTo} showTime hourFormat="24" />
          </div>
          <div className="w-44">
            <MultiSelect
              label="Domain"
              value={domain}
              options={domainOptions}
              onChange={(e) => setDomain(e.value ?? [])}
              placeholder="All domains"
              showCheckbox
              panelSize="md"
              loading={metadataLoading}
              disabled={metadataLoading}
            />
          </div>
          <div className="w-52">
            <MultiSelect
              label="Event type"
              value={eventType}
              options={eventTypeOptions}
              onChange={(e) => setEventType(e.value ?? [])}
              placeholder="All events"
              showCheckbox
              panelSize="md"
              loading={metadataLoading}
              disabled={metadataLoading}
            />
          </div>
          <div className="w-52">
            <ActorSelector
              value={actorId || null}
              onChange={(id) => setActorId(id ?? '')}
              placeholder="Filter by actor"
            />
          </div>
          <div className="w-40">
            <Select
              id="activity-history-sort-dir"
              label="Sort"
              value={sortDir}
              options={SORT_OPTIONS}
              onChangeValue={(v) => setSortDir(v ?? 'desc')}
            />
          </div>
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="h-8 px-3 text-sm text-text-accent hover:text-text-accent-hover border border-border-primary hover:border-border-secondary rounded-lg transition-colors whitespace-nowrap"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {renderBody()}
      </div>
    </Popup>
  )
}

export default ProjectActivityHistoryModal
