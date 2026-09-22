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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useSnapshot } from 'valtio'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import ChevronUpSvg from '@/assets/icons/chevron-up.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import ViewIcon from '@/assets/icons/view.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import Filters from '@/components/Filters'
import DatePicker from '@/components/form/DatePicker'
import PageLayout from '@/components/Layouts/Layout'
import NavigationMore from '@/components/NavigationMore'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge/StatusBadge'
import Table from '@/components/Table'
import { DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { SCHEDULERS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import AnalyticsWidget from '@/pages/analytics/components/AnalyticsWidget'
import MetricsGrid from '@/pages/analytics/components/widgets/MetricsGrid'
import {
  SchedulerRun,
  SchedulerRunStats,
  SchedulerRunStatus,
  schedulerRunsStore,
  SchedulerRunsQuery,
} from '@/store/schedulerRuns'
import { schedulersStore } from '@/store/schedulers'
import { ColumnType, Metric } from '@/types/analytics'
import { FilterDefinitionType } from '@/types/filters'
import { ColumnDefinition } from '@/types/table'
import { checkEmptyFilters } from '@/utils/filters'
import { HttpError } from '@/utils/handleMultipartError'
import { formatDateTime } from '@/utils/helpers'
import toaster from '@/utils/toaster'

const formatDuration = (ms: number | null): string => {
  if (ms === null) return 'Running'
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

const EMPTY_STATS: SchedulerRunStats = {
  total: 0,
  completed: 0,
  failed: 0,
  running: 0,
  cancelled: 0,
  successRate: 0,
  averageDurationMs: 0,
}

const RUN_STATUS_MAP: Record<SchedulerRunStatus, (typeof StatusEnum)[keyof typeof StatusEnum]> = {
  completed: StatusEnum.Success,
  failed: StatusEnum.Error,
  running: StatusEnum.InProgress,
  cancelled: StatusEnum.NotStarted,
}

const resolveDateFrom = (range: string): string => {
  const now = new Date()
  if (range === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  return ''
}

const renderRunStatus = (run: SchedulerRun) => (
  <StatusBadge
    status={RUN_STATUS_MAP[run.status] ?? StatusEnum.NotStarted}
    text={run.status}
    className="text-[10px]"
  />
)

const renderRunStartedAt = (run: SchedulerRun) => (
  <span className="whitespace-nowrap">{formatDateTime(run.startedAt)}</span>
)

const renderRunDuration = (run: SchedulerRun) => (
  <span className="whitespace-nowrap text-text-secondary">{formatDuration(run.durationMs)}</span>
)

const renderRunTrigger = (run: SchedulerRun) => <span className="capitalize">{run.trigger}</span>

interface RunActionsCellProps {
  run: SchedulerRun
  schedulerId: string
  onDelete: (run: SchedulerRun) => void
  router: { push: (path: string | object) => void }
}

const RunActionsCell = ({ run, schedulerId, onDelete, router }: RunActionsCellProps) => {
  const menuItems = [
    {
      title: 'View run',
      icon: <ViewIcon />,
      onClick: () => router.push(`/schedulers/${schedulerId}/runs/${run.id}`),
    },
    {
      title: 'Delete run',
      icon: <DeleteSvg />,
      onClick: () => onDelete(run),
    },
  ]
  return (
    <div className="flex justify-end">
      <NavigationMore hideOnClickInside items={menuItems} />
    </div>
  )
}

const SchedulerRunHistoryPage = () => {
  const { schedulerId } = useParams<{ schedulerId: string }>()
  const router = useVueRouter()
  const [searchParams, setSearchParams] = useSearchParams()

  const { runs, pagination, stats, loading } = useSnapshot(schedulerRunsStore)
  const { schedulers } = useSnapshot(schedulersStore)

  const scheduler = useMemo(
    () => schedulers.find((s) => s.id === schedulerId),
    [schedulers, schedulerId]
  )

  const [page, setPage] = useState(Number(searchParams.get('page') ?? 0))
  const [perPage, setPerPage] = useState(Number(searchParams.get('pageSize') ?? 10))
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false)
  const [runToDelete, setRunToDelete] = useState<SchedulerRun | null>(null)

  const [filters, setFilters] = useState({
    status: (searchParams.get('status')?.split(',').filter(Boolean) ?? []) as SchedulerRunStatus[],
    dateRange: searchParams.get('dateRange') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
  })

  const syncUrl = useCallback(
    (nextFilters: typeof filters, nextPage = 0, nextPerPage = perPage) => {
      const next = new URLSearchParams()
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length) next.set(key, value.join(','))
        } else if (value) {
          next.set(key, String(value))
        }
      })
      next.set('page', String(nextPage))
      next.set('pageSize', String(nextPerPage))
      setSearchParams(next, { replace: true })
    },
    [perPage, setSearchParams]
  )

  const query = useMemo<SchedulerRunsQuery>(
    () => ({
      schedulerId: schedulerId ?? '',
      page,
      pageSize: perPage,
      status: filters.status.length ? filters.status : undefined,
      dateFrom: filters.dateFrom || resolveDateFrom(filters.dateRange) || undefined,
      dateTo: filters.dateTo || undefined,
    }),
    [schedulerId, page, perPage, filters]
  )

  useEffect(() => {
    if (!schedulerId) return
    schedulerRunsStore.fetchRuns(query)
    schedulerRunsStore.fetchStats({
      schedulerId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    })
  }, [query, schedulerId])

  const handleDeleteConfirm = useCallback(async () => {
    if (!runToDelete) return
    const { id } = runToDelete
    setRunToDelete(null)
    try {
      await schedulerRunsStore.deleteRun(id)
      toaster.info('Run deleted successfully')
      schedulerRunsStore.fetchRuns(query)
      schedulerRunsStore.fetchStats({
        schedulerId: query.schedulerId,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })
    } catch (err) {
      if (err instanceof HttpError && err.response.status === 409) {
        toaster.error('Cannot delete a run that is still in progress.')
      } else {
        toaster.error('Failed to delete run')
      }
    }
  }, [runToDelete, query])

  const filterDefinitions = useMemo(
    () => [
      {
        name: 'status',
        label: 'Status',
        type: FilterDefinitionType.CheckboxList,
        value: filters.status,
        options: [
          { label: 'Completed', value: 'completed' },
          { label: 'Failed', value: 'failed' },
          { label: 'Running', value: 'running' },
        ],
      },
      {
        name: 'dateRange',
        label: 'Date Range',
        type: FilterDefinitionType.RadioGroup,
        value: filters.dateRange,
        options: [
          { label: 'All time', value: '' },
          { label: 'Last 24 hours', value: '24h' },
          { label: 'Last 7 days', value: '7d' },
          { label: 'Last 30 days', value: '30d' },
          { label: 'Custom range', value: 'custom' },
        ],
      },
      ...(filters.dateRange === 'custom'
        ? [
            {
              name: 'dateFrom',
              label: 'From',
              type: FilterDefinitionType.Custom,
              value: filters.dateFrom,
              options: [],
            },
            {
              name: 'dateTo',
              label: 'To',
              type: FilterDefinitionType.Custom,
              value: filters.dateTo,
              options: [],
            },
          ]
        : []),
    ],
    [filters]
  )

  const renderCustomFilter = useCallback(
    (definition: { name: string }, value: unknown, updateValue: (v: string | null) => void) => (
      <DatePicker
        id={definition.name}
        value={value as string}
        onChange={updateValue}
        showTime
        hourFormat="24"
        placeholder={definition.name === 'dateFrom' ? 'Start date' : 'End date'}
      />
    ),
    []
  )

  const areFiltersEmpty = useMemo(() => checkEmptyFilters(filters), [filters])

  const applyFilters = useCallback(
    (next: Record<string, unknown>) => {
      const nextFilters = {
        status: (Array.isArray(next.status) ? next.status : []) as SchedulerRunStatus[],
        dateRange: (next.dateRange as string) || '',
        dateFrom: (next.dateFrom as string) || '',
        dateTo: (next.dateTo as string) || '',
      }
      setFilters(nextFilters)
      setPage(0)
      syncUrl(nextFilters)
    },
    [syncUrl]
  )

  const columnDefinitions: ColumnDefinition[] = useMemo(
    () => [
      { label: 'Status', key: 'status', type: 'custom' },
      { label: 'Started', key: 'startedAt', type: 'custom' },
      { label: 'Duration', key: 'durationMs', type: 'custom' },
      { label: 'Trigger', key: 'trigger', type: 'custom' },
      { label: 'Actions', key: 'actions', type: 'custom' },
    ],
    []
  )

  const renderRunActions = useCallback(
    (run: SchedulerRun) => (
      <RunActionsCell
        run={run}
        schedulerId={schedulerId ?? ''}
        onDelete={setRunToDelete}
        router={router}
      />
    ),
    [router, schedulerId, setRunToDelete]
  )

  const customRenderColumns = useMemo(
    () => ({
      status: renderRunStatus,
      startedAt: renderRunStartedAt,
      durationMs: renderRunDuration,
      trigger: renderRunTrigger,
      actions: renderRunActions,
    }),
    [renderRunActions]
  )

  const tablePagination = useMemo(
    () => ({ page, perPage, totalPages: pagination.totalPages, totalCount: pagination.totalCount }),
    [page, perPage, pagination]
  )

  const metricItems: Metric[] = useMemo(() => {
    const s = stats ?? EMPTY_STATS
    return [
      {
        id: 'total-runs',
        label: 'Total runs',
        type: ColumnType.INTEGER,
        value: s.total,
        description: 'All scheduler executions',
      },
      {
        id: 'completed',
        label: 'Completed',
        type: ColumnType.INTEGER,
        value: s.completed,
        description: 'Successfully completed runs',
      },
      {
        id: 'failed',
        label: 'Failed',
        type: ColumnType.INTEGER,
        value: s.failed,
        description: 'Runs finished with an error',
      },
      {
        id: 'running',
        label: 'Running',
        type: ColumnType.INTEGER,
        value: s.running,
        description: 'Currently active runs',
      },
    ]
  }, [stats])

  if (!schedulerId) return <Spinner rootClassName="min-h-full" />

  const schedulerName = scheduler?.name ?? schedulerId

  return (
    <div className="flex h-full">
      <Sidebar title="Run History" description={schedulerName}>
        <Filters
          areFiltersEmpty={areFiltersEmpty}
          onApply={applyFilters}
          filterDefinitions={filterDefinitions}
          renderCustomFilter={renderCustomFilter}
          refreshOnValuesUpdate
        />
      </Sidebar>
      <PageLayout onBack={() => router.push({ name: SCHEDULERS })}>
        {loading && runs.length === 0 ? (
          <Spinner rootClassName="min-h-full" />
        ) : (
          <div className="flex flex-col gap-4 py-5">
            <AnalyticsWidget
              title={schedulerName}
              description={
                scheduler ? (
                  <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
                    <p className="text-sm text-text-secondary">
                      {'Resource: '}
                      <strong className="font-semibold text-text-primary">
                        {scheduler.resource.name}
                      </strong>
                      <strong className="font-semibold text-text-primary">
                        {' '}
                        {scheduler.resource.type}
                      </strong>
                      {'   Project: '}
                      <strong className="font-semibold text-text-primary">
                        {scheduler.project.name}
                      </strong>
                    </p>
                  </div>
                ) : undefined
              }
              expandable={false}
              contentVisible={isMetricsExpanded}
              minLoadingHeight="0px"
              actions={
                <button
                  type="button"
                  aria-label={
                    isMetricsExpanded ? 'Collapse summary metrics' : 'Expand summary metrics'
                  }
                  aria-expanded={isMetricsExpanded}
                  className="rounded-lg p-2 text-text-quaternary transition-colors hover:bg-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[rgb(var(--colors-border-accent))]"
                  onClick={() => setIsMetricsExpanded((v) => !v)}
                >
                  {isMetricsExpanded ? (
                    <ChevronUpSvg className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ChevronDownSvg className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              }
            >
              <MetricsGrid
                metrics={metricItems}
                mutedTextClassName="text-[10px] leading-4 line-clamp-1 text-text-quaternary"
              />
            </AnalyticsWidget>

            <Table<SchedulerRun>
              items={runs}
              loading={loading}
              columnDefinitions={columnDefinitions}
              customRenderColumns={customRenderColumns}
              pagination={tablePagination}
              onPaginationChange={(nextPage, nextPerPage) => {
                setPage(nextPage)
                const nextSize = nextPerPage ?? perPage
                setPerPage(nextSize)
                syncUrl(filters, nextPage, nextSize)
              }}
              perPageOptions={DECIMAL_PAGINATION_OPTIONS}
            />
          </div>
        )}
      </PageLayout>
      <ConfirmationModal
        header="Confirm Delete"
        message="Are you sure you want to delete this run?"
        visible={runToDelete !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setRunToDelete(null)}
      />
    </div>
  )
}

export default SchedulerRunHistoryPage
