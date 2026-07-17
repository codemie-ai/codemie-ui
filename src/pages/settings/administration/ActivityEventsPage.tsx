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
import Popup from '@/components/Popup'
import Table from '@/components/Table'
import { DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { activityEventsStore } from '@/store/activityEvents'
import { userStore } from '@/store/user'
import { ActivityEvent } from '@/types/entity/activityEvent'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { formatDate } from '@/utils/helpers'
import toaster from '@/utils/toaster'

const columnDefinitions: ColumnDefinition[] = [
  { key: 'created_at', label: 'When', type: DefinitionTypes.Custom, headClassNames: 'w-[13%]' },
  { key: 'domain', label: 'Domain', type: DefinitionTypes.String, headClassNames: 'w-[11%]' },
  { key: 'event_type', label: 'Event', type: DefinitionTypes.String, headClassNames: 'w-[18%]' },
  { key: 'entity', label: 'Entity', type: DefinitionTypes.Custom, headClassNames: 'w-[18%]' },
  { key: 'actor', label: 'Actor', type: DefinitionTypes.Custom, headClassNames: 'w-[16%]' },
  { key: 'attributes', label: 'Details', type: DefinitionTypes.Custom, headClassNames: 'w-[24%]' },
]

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'desc' },
  { label: 'Oldest first', value: 'asc' },
]

const DATETIME_FORMAT = 'MM/dd/yyyy, HH:mm:ss'

function renderCreatedAt(item: ActivityEvent) {
  return (
    <span className="whitespace-nowrap text-text-primary text-sm">
      {formatDate(item.created_at, DATETIME_FORMAT)}
    </span>
  )
}

function renderEntity(item: ActivityEvent) {
  if (item.entity_type || item.entity_id) {
    return (
      <div className="flex flex-col min-w-0">
        {item.entity_type && (
          <span className="text-xs text-text-quaternary truncate">{item.entity_type}</span>
        )}
        {item.entity_id && (
          <span className="text-text-primary text-sm truncate" title={item.entity_id}>
            {item.entity_id}
          </span>
        )}
      </div>
    )
  }
  return <span className="text-text-quaternary">—</span>
}

function renderActor(item: ActivityEvent) {
  if (item.actor_name || item.actor_email) {
    return (
      <div className="flex flex-col min-w-0">
        {item.actor_name && (
          <span className="text-text-primary text-sm truncate">{item.actor_name}</span>
        )}
        {item.actor_email && (
          <span className="text-xs text-text-quaternary truncate">{item.actor_email}</span>
        )}
      </div>
    )
  }
  return <span className="text-text-quaternary text-sm">system</span>
}

interface AttributesCellProps {
  readonly item: ActivityEvent
  readonly onSelect: (item: ActivityEvent) => void
}

function AttributesCell({ item, onSelect }: AttributesCellProps) {
  const hasAttrs = item.attributes && Object.keys(item.attributes).length > 0
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="text-left w-full rounded hover:bg-surface-base-tertiary transition-colors p-1 -m-1 group"
    >
      {hasAttrs ? (
        <div className="flex flex-wrap gap-1">
          {Object.entries(item.attributes!).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-surface-base-tertiary border border-border-primary group-hover:border-border-secondary"
            >
              <span className="text-text-quaternary">{k}:</span>
              <span className="text-text-primary font-medium truncate max-w-[100px]">
                {String(v)}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <span className="text-text-quaternary text-xs group-hover:text-text-secondary">
          View details
        </span>
      )}
    </button>
  )
}

function makeAttributesRenderer(onSelect: (item: ActivityEvent) => void) {
  return (item: ActivityEvent) => <AttributesCell item={item} onSelect={onSelect} />
}

function DetailRow({ label, value }: { readonly label: string; readonly value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border-structural last:border-0">
      <span className="text-xs text-text-quaternary">{label}</span>
      <span className="text-sm text-text-primary break-all">
        {value ?? <span className="text-text-quaternary">—</span>}
      </span>
    </div>
  )
}

const ActivityEventsPage: FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useSnapshot(userStore)
  const { events, pagination, loading, filterOptions } = useSnapshot(activityEventsStore)
  const isMaintainer = currentUser?.isMaintainer ?? false

  const [domain, setDomain] = useState<string[]>([])
  const [eventType, setEventType] = useState<string[]>([])
  const [entityType, setEntityType] = useState<string[]>([])
  const [actorId, setActorId] = useState('')
  const [entityId, setEntityId] = useState('')
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [perPage, setPerPage] = useState(50)
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null)

  const hasActiveFilters =
    domain.length > 0 ||
    eventType.length > 0 ||
    entityType.length > 0 ||
    !!actorId ||
    !!entityId ||
    !!from ||
    !!to ||
    sortDir !== 'desc'

  const clearFilters = useCallback(() => {
    setDomain([])
    setEventType([])
    setEntityType([])
    setActorId('')
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
          actor_id: actorId || null,
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
    actorId,
    entityId,
    from,
    to,
    sortDir,
    perPage,
  ])

  const domainOptions = useMemo(
    () => (filterOptions?.domains ?? []).map((d) => ({ label: d, value: d })),
    [filterOptions]
  )

  const eventTypeOptions = useMemo(
    () => (filterOptions?.event_types ?? []).map((e) => ({ label: e, value: e })),
    [filterOptions]
  )

  const entityTypeOptions = useMemo(
    () => (filterOptions?.entity_types ?? []).map((t) => ({ label: t, value: t })),
    [filterOptions]
  )

  const customRenderColumns = useMemo(
    () => ({
      created_at: renderCreatedAt,
      entity: renderEntity,
      actor: renderActor,
      attributes: makeAttributesRenderer(setSelectedEvent),
    }),
    [setSelectedEvent]
  )

  if (currentUser && !isMaintainer) return null

  const content = (
    <div className="flex flex-col h-full pt-4">
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-44">
          <MultiSelect
            label="Domain"
            value={domain}
            options={domainOptions}
            onChange={(e) => setDomain(e.value ?? [])}
            placeholder="All domains"
            showCheckbox
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
          />
        </div>
        <div className="w-52">
          <Input
            label="Actor ID"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            placeholder="Filter by user ID"
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
      />

      {selectedEvent && (
        <Popup
          header={selectedEvent.event_type}
          visible
          onHide={() => setSelectedEvent(null)}
          hideFooter
          isFullWidth={false}
          className="w-full max-w-lg"
          bodyClassName="pb-4"
        >
          <div className="flex flex-col">
            <DetailRow label="When" value={formatDate(selectedEvent.created_at, DATETIME_FORMAT)} />
            <DetailRow label="Domain" value={selectedEvent.domain} />
            <DetailRow label="Event type" value={selectedEvent.event_type} />
            <DetailRow label="Entity type" value={selectedEvent.entity_type} />
            <DetailRow label="Entity ID" value={selectedEvent.entity_id} />
            <DetailRow
              label="Actor"
              value={
                selectedEvent.actor_name || selectedEvent.actor_email ? (
                  <span>
                    {selectedEvent.actor_name}
                    {selectedEvent.actor_name && selectedEvent.actor_email && ' · '}
                    {selectedEvent.actor_email}
                  </span>
                ) : (
                  'system'
                )
              }
            />
            {selectedEvent.actor_id && (
              <DetailRow label="Actor ID" value={selectedEvent.actor_id} />
            )}
            <div className="flex flex-col gap-1.5 py-2">
              <span className="text-xs text-text-quaternary">Attributes</span>
              {selectedEvent.attributes && Object.keys(selectedEvent.attributes).length > 0 ? (
                <pre className="text-xs text-text-primary bg-surface-base-tertiary border border-border-primary rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedEvent.attributes, null, 2)}
                </pre>
              ) : (
                <span className="text-sm text-text-quaternary">—</span>
              )}
            </div>
          </div>
        </Popup>
      )}
    </div>
  )

  return <SettingsLayout contentTitle="Activity events" content={content} />
}

export default ActivityEventsPage
