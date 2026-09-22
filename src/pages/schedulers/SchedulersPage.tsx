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
import { useSnapshot } from 'valtio'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import PlusIcon from '@/assets/icons/plus.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import DropdownButton from '@/components/DropdownButton/DropdownButton'
import PageLayout from '@/components/Layouts/Layout'
import NavigationMore from '@/components/NavigationMore'
import SelectButton from '@/components/SelectButton/SelectButton'
import Sidebar from '@/components/Sidebar'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge/StatusBadge'
import Table from '@/components/Table'
import { DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { IntegrationOption } from '@/constants/integration'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useVueRouter } from '@/hooks/useVueRouter'
import { userStore } from '@/store'
import { Scheduler, schedulersStore, SchedulersQuery } from '@/store/schedulers'
import { ColumnDefinition } from '@/types/table'
import { getCronDescription, isValidCronExpression } from '@/utils/cronValidator'
import { parseDate } from '@/utils/helpers'
import toaster from '@/utils/toaster'

import SchedulerFilters, { SchedulerFilterValues } from './SchedulerFilters'

const LAST_RUN_STATUS_MAP: Record<string, (typeof StatusEnum)[keyof typeof StatusEnum]> = {
  completed: StatusEnum.Success,
  failed: StatusEnum.Error,
  running: StatusEnum.InProgress,
  never: StatusEnum.NotStarted,
}

const renderSchedulerProject = (item: Scheduler) => <span>{item.project.name}</span>

const getScheduleDescription = (cron: string, backendDescription: string): string => {
  if (backendDescription && backendDescription !== cron) return backendDescription
  if (isValidCronExpression(cron)) return getCronDescription(cron)
  return cron
}

const renderSchedulerSchedule = (item: Scheduler) => (
  <span>{getScheduleDescription(item.schedule.cron, item.schedule.description)}</span>
)

const SchedulerDateContent = ({ rawDate }: { rawDate: string | null | undefined }) => {
  if (!rawDate) return <span className="text-text-secondary">—</span>
  const date = parseDate(rawDate)
  return (
    <span className="flex min-w-0 flex-col">
      <span>{date.toLocaleString()}</span>
      <span className="text-text-quaternary">
        {date.toLocaleString({ hour: 'numeric', minute: '2-digit', second: '2-digit' })}
      </span>
    </span>
  )
}

const SchedulersPage = () => {
  const router = useVueRouter()
  const { schedulers, pagination, loading, filterOptions } = useSnapshot(schedulersStore)
  const { user: currentUser } = useSnapshot(userStore)

  const [searchParams, setSearchParams, clearParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(10)
  const [schedulerToDelete, setSchedulerToDelete] = useState<Scheduler | null>(null)

  const schedulerOptions = useMemo(() => {
    const hasProjectPermission = currentUser?.applicationsAdmin?.length || currentUser?.isAdmin
    return [IntegrationOption.USER, IntegrationOption.PROJECT].filter(
      (opt) => opt !== IntegrationOption.PROJECT || hasProjectPermission
    )
  }, [currentUser])
  const [schedulerType, setSchedulerType] = useState(IntegrationOption.USER)

  const filters = useMemo<SchedulerFilterValues>(
    () => ({
      search: searchParams.get('search') || undefined,
      resourceType:
        (searchParams.get('resourceType') as SchedulerFilterValues['resourceType']) || undefined,
      projectId: searchParams.get('projectId') || undefined,
      resourceId: searchParams.get('resourceId') || undefined,
      status: (searchParams.get('status') as SchedulerFilterValues['status']) || undefined,
      lastRunStatus:
        (searchParams.get('lastRunStatus') as SchedulerFilterValues['lastRunStatus']) || undefined,
    }),
    [searchParams]
  )

  const query = useMemo<SchedulersQuery>(
    () => ({
      page,
      pageSize: perPage,
      search: filters.search,
      resourceType: filters.resourceType || undefined,
      projectId: filters.projectId,
      resourceId: filters.resourceId,
      status: filters.status || undefined,
      lastRunStatus: filters.lastRunStatus || undefined,
      ownerType: schedulerType,
    }),
    [page, perPage, filters, schedulerType]
  )

  useEffect(() => {
    schedulersStore.fetchFilterOptions()
  }, [])

  useEffect(() => {
    schedulersStore.fetchSchedulers(query)
  }, [query])

  const handleApplyFilters = useCallback(
    (values: SchedulerFilterValues) => {
      setPage(0)
      const next = new URLSearchParams()
      if (values.search) next.set('search', values.search)
      if (values.resourceType) next.set('resourceType', values.resourceType)
      if (values.projectId) next.set('projectId', values.projectId)
      if (values.resourceId) next.set('resourceId', values.resourceId)
      if (values.status) next.set('status', values.status)
      if (values.lastRunStatus) next.set('lastRunStatus', values.lastRunStatus)
      setSearchParams(next)
    },
    [setSearchParams]
  )

  const handlePaginationChange = useCallback((p: number, pp?: number) => {
    setPage(p)
    if (pp !== undefined) setPerPage(pp)
  }, [])

  const handleChangeSchedulerType = (type: IntegrationOption) => {
    clearParams()
    setPage(0)
    setSchedulerType(type)
  }

  const createActionOptions = useMemo(() => {
    const hasProjectPermission = currentUser?.applicationsAdmin?.length || currentUser?.isAdmin
    return [
      {
        label: 'Create User Scheduler',
        onClick: () => router.push({ path: '/schedulers/user/new' }),
      },
      ...(hasProjectPermission
        ? [
            {
              label: 'Create Project Scheduler',
              onClick: () => router.push({ path: '/schedulers/project/new' }),
            },
          ]
        : []),
    ]
  }, [currentUser, router])

  const handleToggle = useCallback(async (scheduler: Scheduler) => {
    await schedulersStore.toggleScheduler(scheduler.id, !scheduler.isEnabled)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!schedulerToDelete) return
    const { id } = schedulerToDelete
    setSchedulerToDelete(null)
    try {
      await schedulersStore.deleteScheduler(id)
      toaster.info('Scheduler deleted successfully')
    } catch {
      toaster.error('Failed to delete scheduler')
    }
  }, [schedulerToDelete])

  const renderActions = useCallback(
    (item: Scheduler) => {
      const menuItems = [
        {
          title: item.isEnabled ? 'Disable' : 'Enable',
          icon: <InfoSvg />,
          onClick: () => handleToggle(item),
        },
        {
          title: 'View details',
          icon: <InfoSvg />,
          onClick: () => router.push(`/schedulers/${item.id}/runs`),
        },
        {
          title: 'Edit',
          icon: <EditSvg />,
          onClick: () =>
            router.push({
              path:
                schedulerType === IntegrationOption.PROJECT
                  ? '/schedulers/project/edit'
                  : '/schedulers/user/edit',
              query: {
                project_name: item.project.name,
                credential_type: 'Scheduler',
                alias: item.name,
              },
            }),
        },
        {
          title: 'Delete',
          icon: <DeleteSvg />,
          onClick: () => setSchedulerToDelete(item),
        },
      ]
      return (
        <div className="flex justify-end">
          <NavigationMore hideOnClickInside items={menuItems} />
        </div>
      )
    },
    [router, handleToggle, schedulerType]
  )

  const renderLastRun = useCallback((item: Scheduler) => {
    if (!item.lastRun) {
      return <span className="text-text-secondary">Never run</span>
    }
    return <SchedulerDateContent rawDate={item.lastRun.startedAt} />
  }, [])

  const renderLastRunStatus = useCallback((item: Scheduler) => {
    if (!item.lastRun) {
      return <span className="text-text-secondary">—</span>
    }
    const statusVariant = LAST_RUN_STATUS_MAP[item.lastRun.status] ?? StatusEnum.NotStarted
    return (
      <StatusBadge
        status={statusVariant}
        text={item.lastRun.status}
        className="font-semibold text-[10px]"
      />
    )
  }, [])

  const renderNextRun = useCallback((item: Scheduler) => {
    return <SchedulerDateContent rawDate={item.schedule.nextRunAt} />
  }, [])

  const renderStatus = useCallback((item: Scheduler) => {
    return (
      <StatusBadge
        status={item.isEnabled ? StatusEnum.Success : StatusEnum.NotStarted}
        text={item.isEnabled ? 'Enabled' : 'Disabled'}
        className="font-semibold text-[10px]"
      />
    )
  }, [])

  const renderName = useCallback(
    (item: Scheduler) => (
      <button
        className="text-left text-link hover:underline font-medium"
        onClick={() => router.push(`/schedulers/${item.id}/runs`)}
      >
        {item.name}
      </button>
    ),
    [router]
  )

  const renderResource = useCallback(
    (item: Scheduler) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium">{item.resource.name}</span>
        <span className="text-xs text-text-secondary">{item.resource.type}</span>
      </div>
    ),
    []
  )

  const columnDefinitions: ColumnDefinition[] = useMemo(
    () => [
      { label: 'Name', key: 'name', type: 'custom', shrink: true, semiBold: true },
      { label: 'Resource', key: 'resource', type: 'custom', shrink: true },
      { label: 'Project', key: 'project', type: 'custom' },
      { label: 'Schedule', key: 'schedule', type: 'custom' },
      { label: 'Last run', key: 'lastRun', type: 'custom' },
      { label: 'Last Run Status', key: 'lastRunStatus', type: 'custom' },
      { label: 'Next run', key: 'nextRun', type: 'custom' },
      { label: 'Status', key: 'status', type: 'custom' },
      { label: 'Actions', key: 'actions', type: 'custom' },
    ],
    []
  )

  const customRenderColumns = useMemo(
    () => ({
      name: renderName,
      resource: renderResource,
      project: renderSchedulerProject,
      schedule: renderSchedulerSchedule,
      lastRun: renderLastRun,
      lastRunStatus: renderLastRunStatus,
      nextRun: renderNextRun,
      status: renderStatus,
      actions: renderActions,
    }),
    [
      renderName,
      renderResource,
      renderLastRun,
      renderLastRunStatus,
      renderNextRun,
      renderStatus,
      renderActions,
    ]
  )

  const tablePagination = useMemo(
    () => ({
      page,
      perPage,
      totalPages: pagination.totalPages,
      totalCount: pagination.totalCount,
    }),
    [page, perPage, pagination]
  )

  return (
    <div className="flex h-full">
      <Sidebar title="Schedulers" description="View and manage your scheduled automation runs">
        <SchedulerFilters
          filterOptions={filterOptions}
          values={filters}
          onApply={handleApplyFilters}
        />
      </Sidebar>
      <PageLayout
        rightContent={
          <div className="flex items-center text-white">
            {schedulerOptions.length > 0 && (
              <>
                <SelectButton
                  caption="Scheduler Type:"
                  value={schedulerType}
                  options={schedulerOptions}
                  onChange={handleChangeSchedulerType}
                />
                <div className="border-l border-border-primary h-[21px] mx-5" />
              </>
            )}
            <DropdownButton
              label="Create"
              size="medium"
              iconLeft={<PlusIcon />}
              items={createActionOptions}
            />
          </div>
        }
      >
        <Table<Scheduler>
          items={schedulers}
          loading={loading}
          columnDefinitions={columnDefinitions}
          customRenderColumns={customRenderColumns}
          pagination={tablePagination}
          onPaginationChange={handlePaginationChange}
          perPageOptions={DECIMAL_PAGINATION_OPTIONS}
        />
      </PageLayout>
      <ConfirmationModal
        header="Confirm Delete"
        message="Are you sure you want to delete this scheduler?"
        visible={schedulerToDelete !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSchedulerToDelete(null)}
      />
    </div>
  )
}

export default SchedulersPage
