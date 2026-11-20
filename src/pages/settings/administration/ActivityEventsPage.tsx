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

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import DatePicker from '@/components/form/DatePicker/DatePicker'
import Input from '@/components/form/Input/Input'
import MultiSelect from '@/components/form/MultiSelect/MultiSelect'
import Select from '@/components/form/Select/Select'
import Table from '@/components/Table'
import UserSelector from '@/components/UserSelector/UserSelector'
import { DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { activityEventsStore } from '@/store/activityEvents'
import { userStore } from '@/store/user'
import { ActivityEvent } from '@/types/entity/activityEvent'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import {
  getEventActorLabel,
  getEventAttributeRows,
  getEventTargetLabel,
  PresentableActivityEvent,
} from '@/utils/activityEventPresentation'
import { formatDate } from '@/utils/helpers'
import toaster from '@/utils/toaster'

import { computeFilteredOptions, revalidateSelections } from './components/activityEventsFilters'

const columnDefinitions: ColumnDefinition[] = [
  { key: 'created_at', label: 'When', type: DefinitionTypes.Custom, headClassNames: 'w-[15%]' },
  { key: 'domain', label: 'Domain', type: DefinitionTypes.String, headClassNames: 'w-[13%]' },
  { key: 'event_type', label: 'Event', type: DefinitionTypes.String, headClassNames: 'w-[22%]' },
  { key: 'entity', label: 'Entity', type: DefinitionTypes.Custom, headClassNames: 'w-[22%]' },
  { key: 'actor', label: 'Actor', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
]

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'desc' },
  { label: 'Oldest first', value: 'asc' },
]

const DATETIME_FORMAT = 'MM/dd/yyyy, HH:mm:ss'

const SYSTEM_ACTOR_VALUE = '__system__'
const SYSTEM_ACTOR_OPTION = {
  label: 'System',
  value: SYSTEM_ACTOR_VALUE,
  email: 'Events with no user actor',
}

function renderCreatedAt(item: ActivityEvent) {
  return (
    <span className="whitespace-nowrap text-text-primary text-sm">
      {formatDate(item.created_at, DATETIME_FORMAT)}
    </span>
  )
}

function toPresentable(item: ActivityEvent): PresentableActivityEvent {
  return {
    event_type: item.event_type,
    entity_type: item.entity_type ?? undefined,
    entity_id: item.entity_id ?? undefined,
    actor_name: item.actor_name ?? undefined,
    actor_email: item.actor_email ?? undefined,
    actor_id: item.actor_id ?? undefined,
    attributes: item.attributes,
    created_at: item.created_at,
  }
}

function renderEntity(item: ActivityEvent) {
  return (
    <span className="text-text-primary text-sm truncate">
      {getEventTargetLabel(toPresentable(item))}
    </span>
  )
}

function renderActor(item: ActivityEvent) {
  return (
    <span className="text-text-primary text-sm truncate">
      {getEventActorLabel(toPresentable(item))}
    </span>
  )
}

function renderExpandedRow(item: ActivityEvent) {
  const rows = getEventAttributeRows(toPresentable(item))
  return (
    <div className="p-3 flex flex-col gap-1">
      {rows.length ? (
        rows.map((r) => (
          <div key={r.label}>
            <span className="text-text-quaternary text-xs">{r.label}: </span>
            <span className="text-text-primary text-sm">{r.value}</span>
          </div>
        ))
      ) : (
        <span className="text-text-quaternary text-sm">No additional detail</span>
      )}
    </div>
  )
}

const customRenderColumns = {
  created_at: renderCreatedAt,
  entity: renderEntity,
  actor: renderActor,
}

const ActivityEventsPage: FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useSnapshot(userStore)
  const { events, pagination, loading, filterOptions } = useSnapshot(activityEventsStore)
  const isMaintainer = currentUser?.isMaintainer ?? false

  const [domain, setDomain] = useState<string[]>([])
  const [eventType, setEventType] = useState<string[]>([])
  const [entityType, setEntityType] = useState<string[]>([])
  const [actorId, setActorId] = useState<string[]>([])
  const [entityId, setEntityId] = useState('')
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [perPage, setPerPage] = useState(50)
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([])

  const toggleExpand = useCallback((id: string) => {
    setExpandedRowIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }, [])

  const hasActiveFilters =
    domain.length > 0 ||
    eventType.length > 0 ||
    entityType.length > 0 ||
    actorId.length > 0 ||
    !!entityId ||
    !!from ||
    !!to ||
    sortDir !== 'desc'

  const clearFilters = useCallback(() => {
    setDomain([])
    setEventType([])
    setEntityType([])
    setActorId([])
    setEntityId('')
    setFrom(null)
    setTo(null)
    setSortDir('desc')
  }, [])

  useEffect(() => {
    if (currentUser && !isMaintainer) {
      toaster.error('Access denied. This page is for maintainers only.')
      navigate('/settings/administration')
    }
  }, [isMaintainer, currentUser, navigate])

  useEffect(() => {
    if (!isMaintainer) return
    activityEventsStore.loadFilterOptions()
  }, [isMaintainer])

  const loadEvents = useCallback(
    (page = 0, limit = perPage) => {
      activityEventsStore
        .listEvents({
          limit,
          offset: page * limit,
          domain: domain.length ? domain : null,
          event_type: eventType.length ? eventType : null,
          entity_type: entityType.length ? entityType : null,
          actor_id: actorId.filter((id) => id !== SYSTEM_ACTOR_VALUE),
          include_system: actorId.includes(SYSTEM_ACTOR_VALUE),
          entity_id: entityId || null,
          from: from || null,
          to: to || null,
          sort_dir: sortDir,
        })
        .catch((error) => console.error('Failed to load activity events:', error))
    },
    [domain, eventType, entityType, actorId, entityId, from, to, sortDir, perPage]
  )

  useEffect(() => {
    if (!isMaintainer) return
    loadEvents(0, perPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMaintainer,
    domain.join(','),
    eventType.join(','),
    entityType.join(','),
    actorId.join(','),
    entityId,
    from,
    to,
    sortDir,
    perPage,
  ])

  useEffect(() => {
    const { eventType: validEventTypes, entityType: validEntityTypes } = revalidateSelections(
      filterOptions,
      domain,
      eventType,
      entityType
    )
    if (validEventTypes.length !== eventType.length) setEventType(validEventTypes)
    if (validEntityTypes.length !== entityType.length) setEntityType(validEntityTypes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, filterOptions])

  const domainOptions = useMemo(
    () => (filterOptions?.domains ?? []).map((d) => ({ label: d, value: d })),
    [filterOptions]
  )

  const { eventTypeOptions, entityTypeOptions } = useMemo(() => {
    const { eventTypeOptions: evtOpts, entityTypeOptions: entOpts } = computeFilteredOptions(
      filterOptions,
      domain
    )
    return {
      eventTypeOptions: evtOpts.map((e) => ({ label: e, value: e })),
      entityTypeOptions: entOpts.map((t) => ({ label: t, value: t })),
    }
  }, [filterOptions, domain])

  if (currentUser && !isMaintainer) return null

  const content = (
    <div className="flex flex-col h-full pt-4">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="w-44">
            <MultiSelect
              label="Domain"
              value={domain}
              options={domainOptions}
              onChange={(e) => setDomain(e.value ?? [])}
              placeholder="All domains"
              showCheckbox
              panelSize="md"
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
            />
          </div>
          <div className="w-44">
            <MultiSelect
              label="Entity type"
              value={entityType}
              options={entityTypeOptions}
              onChange={(e) => setEntityType(e.value ?? [])}
              placeholder="All entity types"
              showCheckbox
              panelSize="md"
            />
          </div>
          <div className="w-52">
            <UserSelector
              label="Actor"
              placeholder="Filter by actor"
              value={actorId}
              onChange={setActorId}
              extraOption={SYSTEM_ACTOR_OPTION}
            />
          </div>
          <div className="w-52">
            <Input
              label="Entity ID"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Filter by entity ID"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="w-44">
            <DatePicker label="From" value={from} onChange={setFrom} showTime hourFormat="24" />
          </div>
          <div className="w-44">
            <DatePicker label="To" value={to} onChange={setTo} showTime hourFormat="24" />
          </div>
          <div className="w-40">
            <Select
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
      </div>

      <Table
        items={events}
        columnDefinitions={columnDefinitions}
        customRenderColumns={customRenderColumns}
        loading={loading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          perPage: pagination.perPage,
        }}
        onPaginationChange={(page, newPerPage) => {
          const limit = newPerPage ?? perPage
          setPerPage(limit)
          loadEvents(page, limit)
        }}
        perPageOptions={DECIMAL_PAGINATION_OPTIONS}
        expandedRowIds={expandedRowIds}
        onToggleExpand={toggleExpand}
        renderExpandedRow={renderExpandedRow}
      />
    </div>
  )

  return <SettingsLayout contentTitle="Activity events" content={content} />
}

export default ActivityEventsPage
