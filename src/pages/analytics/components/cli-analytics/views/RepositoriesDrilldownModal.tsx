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

import {
  type FC,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import ChevronLeftSvg from '@/assets/icons/chevron-left.svg?react'
import Button from '@/components/Button'
import Pagination from '@/components/Pagination'
import Popup from '@/components/Popup'
import Table from '@/components/Table'
import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type {
  ProjectRow,
  ProjectScope,
  RepositoryBranchRow,
  RepositoryRow,
} from '@/types/cliAnalytics'
import { DefinitionTypes } from '@/types/table'

import { AmountCost } from './SessionCostValue'
import SessionsView from './SessionsView'
import AnalyticsWidget from '../../AnalyticsWidget'
import MetricCard, { METRIC_VALUE_CLASS_NAME } from '../../widgets/MetricCard'
import { buildRepoMetrics, formatLines, linesTitle } from '../format'
import { useCliAnalyticsBranches } from '../hooks/useCliAnalyticsBranches'
import { useCliAnalyticsProjectRepositories } from '../hooks/useCliAnalyticsProjectRepositories'

type SessionScope = {
  projectName?: string
  isProjectUnattributed?: boolean
  repository?: string
  isRepositoryUnattributed?: boolean
  branch?: string
  isBranchUnattributed?: boolean
}

type DrillEntry = {
  id: string
  name: string
  kind: 'project' | 'repository' | 'sessions'
  entity: ProjectRow | RepositoryRow | RepositoryBranchRow
  scope: ProjectScope
  sessionScope?: SessionScope
  page: number
}

type RowWithId<T> = T & { __rowId: string }

interface Props {
  project: ProjectRow
  filters: AnalyticsQueryParams
  onClose: () => void
}

const columns = (label: string) => [
  { key: 'label', label, type: DefinitionTypes.Custom, sortable: false, headClassNames: '' },
  {
    key: 'sessions',
    label: 'Sessions',
    type: DefinitionTypes.Custom,
    sortable: false,
    headClassNames: 'text-right',
  },
  {
    key: 'files',
    label: 'Files',
    type: DefinitionTypes.Custom,
    sortable: false,
    headClassNames: 'text-right',
  },
  {
    key: 'lines',
    label: 'Net Lines',
    type: DefinitionTypes.Custom,
    sortable: false,
    headClassNames: 'text-right',
  },
  {
    key: 'cost',
    label: 'Est. Cost',
    type: DefinitionTypes.Custom,
    sortable: false,
    headClassNames: 'text-right',
  },
]

const listWidgetClass =
  'flex min-h-0 flex-1 flex-col !p-4 [&>div:first-child]:mb-2 [&_.widget-content]:flex [&_.widget-content]:min-h-0 [&_.widget-content]:flex-1 [&_.widget-content>.relative]:flex [&_.widget-content>.relative]:min-h-0 [&_.widget-content>.relative]:flex-1 [&_.widget-content>.relative>div:last-child]:flex [&_.widget-content>.relative>div:last-child]:min-h-0 [&_.widget-content>.relative>div:last-child]:flex-1 [&_.widget-content>.relative>div:last-child]:flex-col'

const Summary: FC<{ entry: DrillEntry }> = ({ entry }) => (
  <AnalyticsWidget
    title="Summary"
    expandable={false}
    className="shrink-0 !p-4 [&>div:first-child]:mb-2"
  >
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 max-sm:gap-2">
      {buildRepoMetrics(entry.entity).map((metric) => (
        <MetricCard
          key={metric.id}
          metric={metric}
          valueOverride={
            metric.id === 'cost_usd' ? (
              <p className={METRIC_VALUE_CLASS_NAME}>
                <AmountCost
                  value={metric.value as number | null}
                  pricing={entry.entity}
                  iconFirst={false}
                />
              </p>
            ) : undefined
          }
        />
      ))}
    </div>
  </AnalyticsWidget>
)

interface ListFrameProps {
  title: 'Repositories' | 'Branches'
  loading: boolean
  error: string | null
  isEmpty: boolean
  emptyText: string
  onRetry: () => void
  children: ReactNode
  pagination?: ReactNode
  listRef: RefObject<HTMLDivElement | null>
  onScroll: (scrollTop: number) => void
}

const ListFrame: FC<ListFrameProps> = ({
  title,
  loading,
  error,
  isEmpty,
  emptyText,
  onRetry,
  children,
  pagination,
  listRef,
  onScroll,
}) => (
  <AnalyticsWidget
    title={title}
    expandable={false}
    loading={loading}
    error={error ? { message: error } : null}
    className={listWidgetClass}
    actions={
      error ? (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : undefined
    }
  >
    {isEmpty ? (
      <div className="py-6 text-center text-sm text-text-quaternary">{emptyText}</div>
    ) : (
      <div
        ref={listRef}
        onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        {children}
      </div>
    )}
    {pagination && !error && !isEmpty && (
      <div className="-mx-4 -mb-4 mt-auto shrink-0 border-t border-border-structural bg-surface-base-secondary px-4 pt-3 pb-2">
        {pagination}
      </div>
    )}
  </AnalyticsWidget>
)

const repositoryRenderers = {
  label: (row: RowWithId<RepositoryRow>) => (
    <div className="max-w-xs" title={row.repository ?? UNATTRIBUTED_LABEL}>
      <span className="block truncate">{row.repository ?? UNATTRIBUTED_LABEL}</span>
      {row.repository === null && (
        <span className="block truncate text-xs font-normal text-text-quaternary">
          Sessions without a repository
        </span>
      )}
    </div>
  ),
  sessions: (row: RowWithId<RepositoryRow>) => (
    <div className="text-right">{row.session_count.toLocaleString()}</div>
  ),
  files: (row: RowWithId<RepositoryRow>) => (
    <div className="text-right">{row.files_changed.toLocaleString()}</div>
  ),
  lines: (row: RowWithId<RepositoryRow>) => (
    <div className="text-right" title={linesTitle(row.net_lines)}>
      {formatLines(row.net_lines)}
    </div>
  ),
  cost: (row: RowWithId<RepositoryRow>) => (
    <div className="text-right">
      <AmountCost value={row.cost_usd} pricing={row} />
    </div>
  ),
}

const branchRenderers = {
  label: (row: RowWithId<RepositoryBranchRow>) => (
    <div className="max-w-xs" title={row.branch ?? UNATTRIBUTED_LABEL}>
      <span className="block truncate">{row.branch ?? UNATTRIBUTED_LABEL}</span>
      {row.branch === null && (
        <span className="block truncate text-xs font-normal text-text-quaternary">
          Sessions without a branch
        </span>
      )}
    </div>
  ),
  sessions: (row: RowWithId<RepositoryBranchRow>) => (
    <div className="text-right">{row.session_count.toLocaleString()}</div>
  ),
  files: (row: RowWithId<RepositoryBranchRow>) => (
    <div className="text-right">{row.files_changed.toLocaleString()}</div>
  ),
  lines: (row: RowWithId<RepositoryBranchRow>) => (
    <div className="text-right" title={linesTitle(row.net_lines)}>
      {formatLines(row.net_lines)}
    </div>
  ),
  cost: (row: RowWithId<RepositoryBranchRow>) => (
    <div className="text-right">
      <AmountCost value={row.cost_usd} pricing={row} />
    </div>
  ),
}

interface LevelProps {
  entry: DrillEntry
  filters: AnalyticsQueryParams
  active: boolean
  onPage: (entryId: string, page: number) => void
  listRef: (entryId: string) => RefObject<HTMLDivElement | null>
  onScroll: (entryId: string, scrollTop: number) => void
  savedScrollTop: (entryId: string) => number
}

const ProjectLevel: FC<LevelProps & { onOpenRepository: (row: RepositoryRow) => void }> = ({
  entry,
  filters,
  active,
  onOpenRepository,
  onPage,
  listRef,
  onScroll,
  savedScrollTop,
}) => {
  const { scope } = entry
  const onPageChange = useCallback((page: number) => onPage(entry.id, page), [entry.id, onPage])
  const { rows, loading, error, page, setPage, totalPages, retry } =
    useCliAnalyticsProjectRepositories(filters, scope, { initialPage: entry.page, onPageChange })
  const selectedRows = useMemo(
    () => rows.map((row) => ({ ...row, __rowId: row.repository ?? '__unattributed__' })),
    [rows]
  )
  const scrollRef = listRef(entry.id)

  useEffect(() => {
    if (active && scrollRef.current) scrollRef.current.scrollTop = savedScrollTop(entry.id)
  }, [active, entry.id, savedScrollTop, scrollRef])

  const renderers = repositoryRenderers

  return (
    <ListFrame
      title="Repositories"
      loading={loading}
      error={error}
      isEmpty={!loading && rows.length === 0}
      emptyText="No repositories found."
      onRetry={retry}
      listRef={scrollRef}
      onScroll={(top) => onScroll(entry.id, top)}
      pagination={
        rows.length > 0 && totalPages > 1 ? (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            setPage={(next) => setPage(next)}
            // The footer band already carries the background; the control's own one reads as a dark strip.
            className="!bg-transparent !border-t-0"
          />
        ) : undefined
      }
    >
      <Table<RowWithId<RepositoryRow>>
        items={selectedRows}
        columnDefinitions={columns('Repository')}
        customRenderColumns={renderers}
        idPath="__rowId"
        loading={loading}
        embedded
        selected={[]}
        onRowClick={(row) => onOpenRepository(row)}
      />
    </ListFrame>
  )
}

const RepositoryLevel: FC<LevelProps & { onOpenBranch: (row: RepositoryBranchRow) => void }> = ({
  entry,
  filters,
  active,
  onOpenBranch,
  onPage,
  listRef,
  onScroll,
  savedScrollTop,
}) => {
  const repository = (entry.entity as RepositoryRow).repository ?? ''
  const onPageChange = useCallback((page: number) => onPage(entry.id, page), [entry.id, onPage])
  const { rows, loading, error, page, setPage, totalPages, retry } = useCliAnalyticsBranches(
    filters,
    repository,
    entry.scope,
    {
      initialPage: entry.page,
      onPageChange,
    }
  )
  const selectedRows = useMemo(
    () => rows.map((row) => ({ ...row, __rowId: row.branch ?? '__unattributed__' })),
    [rows]
  )
  const scrollRef = listRef(entry.id)

  useEffect(() => {
    if (active && scrollRef.current) scrollRef.current.scrollTop = savedScrollTop(entry.id)
  }, [active, entry.id, savedScrollTop, scrollRef])

  const renderers = branchRenderers

  return (
    <ListFrame
      title="Branches"
      loading={loading}
      error={error}
      isEmpty={!loading && rows.length === 0}
      emptyText="No branches found."
      onRetry={retry}
      listRef={scrollRef}
      onScroll={(top) => onScroll(entry.id, top)}
      pagination={
        rows.length > 0 && totalPages > 1 ? (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            setPage={(next) => setPage(next)}
            // The footer band already carries the background; the control's own one reads as a dark strip.
            className="!bg-transparent !border-t-0"
          />
        ) : undefined
      }
    >
      <Table<RowWithId<RepositoryBranchRow>>
        items={selectedRows}
        columnDefinitions={columns('Branch')}
        customRenderColumns={renderers}
        idPath="__rowId"
        loading={loading}
        embedded
        selected={[]}
        onRowClick={(row) => onOpenBranch(row)}
      />
    </ListFrame>
  )
}

const RepositoriesDrilldownModal: FC<Props> = ({ project, filters, onClose }) => {
  const initialScope: ProjectScope = project.project_name
    ? { projectName: project.project_name }
    : { isProjectUnattributed: true }
  const [stack, setStack] = useState<DrillEntry[]>([
    {
      id: `project:${project.project_name ?? '__unattributed__'}`,
      name: project.project_name ?? UNATTRIBUTED_LABEL,
      kind: 'project',
      entity: project,
      scope: initialScope,
      page: 0,
    },
  ])
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRefs = useRef(new Map<string, RefObject<HTMLDivElement | null>>())
  const scrollPositions = useRef(new Map<string, number>())

  const listRef = useCallback((id: string) => {
    let ref = scrollRefs.current.get(id)
    if (!ref) {
      ref = { current: null }
      scrollRefs.current.set(id, ref)
    }
    return ref
  }, [])
  const savedScrollTop = useCallback((id: string) => scrollPositions.current.get(id) ?? 0, [])
  const onScroll = useCallback(
    (id: string, top: number) => scrollPositions.current.set(id, top),
    []
  )
  const onPage = useCallback((entryId: string, page: number) => {
    setStack((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, page } : entry))
    )
  }, [])

  const addChild = useCallback(
    (entry: DrillEntry) => {
      setStack((current) => [...current.slice(0, activeIndex + 1), entry])
      setActiveIndex(activeIndex + 1)
    },
    [activeIndex]
  )

  const openRepository = useCallback(
    (row: RepositoryRow) => {
      const parent = stack[activeIndex]
      if (!parent) return
      if (row.repository === null) {
        addChild({
          id: `${parent.id}/unattributed-repository`,
          name: UNATTRIBUTED_LABEL,
          kind: 'sessions',
          entity: row,
          scope: parent.scope,
          sessionScope: {
            projectName: 'projectName' in parent.scope ? parent.scope.projectName : undefined,
            isProjectUnattributed: 'isProjectUnattributed' in parent.scope ? true : undefined,
            isRepositoryUnattributed: true,
          },
          page: 0,
        })
        return
      }
      addChild({
        id: `${parent.id}/repository:${row.repository}`,
        name: row.repository,
        kind: 'repository',
        entity: row,
        scope: parent.scope,
        page: 0,
      })
    },
    [activeIndex, addChild, stack]
  )

  const openBranch = useCallback(
    (row: RepositoryBranchRow) => {
      const parent = stack[activeIndex]
      if (!parent || parent.kind !== 'repository' || !('repository' in parent.entity)) return
      addChild({
        id: `${parent.id}/branch:${row.branch ?? '__unattributed__'}`,
        name: row.branch ?? UNATTRIBUTED_LABEL,
        kind: 'sessions',
        entity: row,
        scope: parent.scope,
        sessionScope: {
          projectName: 'projectName' in parent.scope ? parent.scope.projectName : undefined,
          isProjectUnattributed: 'isProjectUnattributed' in parent.scope ? true : undefined,
          repository: parent.entity.repository ?? undefined,
          ...(row.branch === null ? { isBranchUnattributed: true } : { branch: row.branch }),
        },
        page: 0,
      })
    },
    [activeIndex, addChild, stack]
  )

  const backOne = () => (activeIndex === 0 ? onClose() : setActiveIndex((index) => index - 1))
  const header = (
    <div className="flex w-full min-w-0 items-center">
      <button
        type="button"
        aria-label={
          activeIndex === 0 ? 'Return to Projects' : `Back to ${stack[activeIndex - 1]?.name}`
        }
        title={activeIndex === 0 ? 'Return to Projects' : `Back to ${stack[activeIndex - 1]?.name}`}
        onClick={backOne}
        className="mr-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-base-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-accent"
      >
        <ChevronLeftSvg aria-hidden="true" className="h-4 w-4" />
      </button>
      <nav
        aria-label="Drill-down path"
        className="flex min-w-0 items-center gap-2 overflow-hidden text-sm"
      >
        {stack.slice(0, activeIndex + 1).map((entry, index) => (
          <span key={entry.id} className="flex min-w-0 items-center gap-2">
            {index > 0 && (
              <span aria-hidden="true" className="shrink-0 text-text-quaternary">
                /
              </span>
            )}
            {index < activeIndex ? (
              <button
                type="button"
                title={entry.name}
                aria-label={`Go to ${entry.name}`}
                onClick={() => setActiveIndex(index)}
                className="max-w-[220px] truncate rounded-sm text-text-secondary hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-accent"
              >
                {entry.name}
              </button>
            ) : (
              <h2
                aria-current="page"
                title={entry.name}
                className="max-w-[260px] truncate font-semibold text-text-primary"
              >
                {entry.name}
              </h2>
            )}
          </span>
        ))}
      </nav>
    </div>
  )

  return (
    <Popup
      isFullWidth
      fullScreenOnMobile={false}
      className="!h-[80dvh] !min-h-[80dvh] !max-h-[80dvh] xl:max-w-[90vw]"
      headerContent={header}
      visible
      onHide={onClose}
      hideFooter
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden !p-4"
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
        {stack.map((entry, index) => (
          <section
            key={entry.id}
            aria-hidden={index !== activeIndex}
            className={
              index === activeIndex ? 'flex min-h-0 min-w-0 flex-1 flex-col gap-3' : 'hidden'
            }
          >
            <Summary entry={entry} />
            {entry.kind === 'project' && (
              <ProjectLevel
                entry={entry}
                filters={filters}
                active={index === activeIndex}
                onOpenRepository={openRepository}
                onPage={onPage}
                listRef={listRef}
                onScroll={onScroll}
                savedScrollTop={savedScrollTop}
              />
            )}
            {entry.kind === 'repository' && (
              <RepositoryLevel
                entry={entry}
                filters={filters}
                active={index === activeIndex}
                onOpenBranch={openBranch}
                onPage={onPage}
                listRef={listRef}
                onScroll={onScroll}
                savedScrollTop={savedScrollTop}
              />
            )}
            {entry.kind === 'sessions' && entry.sessionScope && (
              <SessionsView
                filters={filters}
                repositories={
                  entry.sessionScope.repository ? [entry.sessionScope.repository] : undefined
                }
                isUnattributed={entry.sessionScope.isRepositoryUnattributed}
                branch={entry.sessionScope.branch}
                projectName={entry.sessionScope.projectName}
                isProjectUnattributed={entry.sessionScope.isProjectUnattributed}
                isBranchUnattributed={entry.sessionScope.isBranchUnattributed}
                fillAvailableHeight
              />
            )}
          </section>
        ))}
      </div>
    </Popup>
  )
}

export default RepositoriesDrilldownModal
