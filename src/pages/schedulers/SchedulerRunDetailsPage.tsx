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

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'

import AssistantSvg from '@/assets/icons/assistant.svg?react'
import DatasourceSvg from '@/assets/icons/datasource.svg?react'
import WorkflowSvg from '@/assets/icons/workflow.svg?react'
import Button from '@/components/Button'
import DetailsProperty from '@/components/details/DetailsProperty/DetailsProperty'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge/StatusBadge'
import { useVueRouter } from '@/hooks/useVueRouter'
import { SchedulerRunDetails, SchedulerRunStatus, schedulerRunsStore } from '@/store/schedulerRuns'
import { formatDateTime } from '@/utils/helpers'

const RUN_STATUS_MAP: Record<SchedulerRunStatus, (typeof StatusEnum)[keyof typeof StatusEnum]> = {
  completed: StatusEnum.Success,
  failed: StatusEnum.Error,
  running: StatusEnum.InProgress,
  cancelled: StatusEnum.NotStarted,
}

const LOG_LEVEL_CLASS: Record<string, string> = {
  error: 'text-failed-secondary',
  warn: 'text-text-warning',
}

const formatDuration = (ms: number | null): string => {
  if (ms === null) return 'Running'
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-quaternary">
    {children}
  </p>
)

const RESOURCE_LINK_CONFIG: Record<
  string,
  { Icon: React.FC<React.SVGProps<SVGSVGElement>>; label: string }
> = {
  Assistant: { Icon: AssistantSvg, label: 'View Chat' },
  Workflow: { Icon: WorkflowSvg, label: 'View Workflow' },
  Datasource: { Icon: DatasourceSvg, label: 'View Datasource' },
}

const resolveResultLink = (run: SchedulerRunDetails): { href: string } | null => {
  const { type, id: resourceId } = run.resource
  if (type === 'Assistant' && run.conversationId) return { href: `/#/chats/${run.conversationId}` }
  if (type === 'Workflow' && run.workflowExecutionId)
    return { href: `/#/workflows/${resourceId}/workflow-executions/${run.workflowExecutionId}` }
  if (type === 'Datasource') return { href: `/#/data-sources/${resourceId}` }
  return null
}

const SchedulerRunDetailsPage = () => {
  const { schedulerId, runId } = useParams<{ schedulerId: string; runId: string }>()
  const router = useVueRouter()
  const [searchParams] = useSearchParams()
  const [run, setRun] = useState<SchedulerRunDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (runId) {
      setLoading(true)
      schedulerRunsStore
        .fetchRunDetails(runId)
        .then((result) => {
          if (!cancelled) setRun(result)
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }
    return () => {
      cancelled = true
    }
  }, [runId])

  const handleBack = () => {
    const query = Object.fromEntries(searchParams.entries())
    router.push({ name: 'scheduler-runs', params: { schedulerId }, query })
  }

  const runLabel = run?.executionId ? `Run ${run.executionId}` : 'Run details'

  return (
    <div className="flex h-full">
      <Sidebar title="View Run" description="View your scheduled run details" />
      <PageLayout title={runLabel} onBack={handleBack}>
        {loading && <Spinner rootClassName="min-h-full" />}
        {!loading && error && (
          <p className="p-8 text-center text-text-secondary">Failed to load scheduler run.</p>
        )}
        {!loading && run && (
          <div className="flex flex-col py-3">
            {/* Overview */}
            <section className="pb-4">
              <SectionTitle>Overview</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailsProperty label="Status">
                  <StatusBadge
                    status={RUN_STATUS_MAP[run.status] ?? StatusEnum.NotStarted}
                    text={run.status}
                  />
                </DetailsProperty>
                <DetailsProperty label="Scheduler" value={run.scheduler.name} />
                <DetailsProperty label="Resource" value={run.resource.name} />
                <DetailsProperty label="Resource type" value={run.resource.type} />
                <DetailsProperty label="Project" value={run.project.name} />
                <DetailsProperty label="Trigger" value={run.trigger} />
                <DetailsProperty label="Started" value={formatDateTime(run.startedAt)} />
                <DetailsProperty
                  label="Finished"
                  value={run.finishedAt ? formatDateTime(run.finishedAt) : '—'}
                />
                <DetailsProperty label="Duration" value={formatDuration(run.durationMs)} />
                <DetailsProperty label="Execution ID" value={run.executionId} />
                <DetailsProperty
                  label="Schedule"
                  value={run.schedulerConfig.humanReadableSchedule}
                />
                <DetailsProperty label="Timezone" value={run.schedulerConfig.timezone} />
                {run.metrics && (
                  <>
                    <DetailsProperty
                      label="Input tokens"
                      value={run.metrics.inputTokens.toLocaleString()}
                    />
                    <DetailsProperty
                      label="Output tokens"
                      value={run.metrics.outputTokens.toLocaleString()}
                    />
                    <DetailsProperty label="Cost" value={`$${run.metrics.cost.toFixed(4)}`} />
                  </>
                )}
              </div>

              {run.error && (
                <div className="mt-4 rounded-lg border border-failed-secondary bg-failed-tertiary p-4">
                  <p className="text-sm font-semibold text-failed-secondary">{run.error.code}</p>
                  <p className="text-sm text-text-primary">{run.error.message}</p>
                  {run.error.details && (
                    <p className="mt-1 text-xs text-text-secondary">{run.error.details}</p>
                  )}
                </div>
              )}
            </section>

            {/* Input — hidden for Datasource */}
            {run.resource.type !== 'Datasource' && run.input && (
              <section className="border-t border-border-structural py-4">
                <SectionTitle>Input</SectionTitle>
                <p className="mb-2 text-xs text-text-quaternary">Initial prompt</p>
                <pre className="whitespace-pre-wrap rounded-lg border border-border-structural bg-surface-base-content p-4 text-sm text-text-primary">
                  {(run.input?.task as string) ?? ''}
                </pre>
              </section>
            )}

            {/* Result */}
            <section className="border-t border-border-structural py-4">
              <SectionTitle>Result</SectionTitle>
              {(() => {
                const link = resolveResultLink(run)
                const config = RESOURCE_LINK_CONFIG[run.resource.type]
                if (link && config) {
                  const { Icon, label } = config
                  return (
                    <a href={link.href} target="_blank" rel="noreferrer">
                      <Button type="primary" size="medium">
                        <Icon /> {label}
                      </Button>
                    </a>
                  )
                }
                if (run.result.available) {
                  return (
                    <pre className="whitespace-pre-wrap rounded-lg border border-border-structural bg-surface-base-content p-4 text-sm text-text-primary">
                      {run.result.content}
                    </pre>
                  )
                }
                return <p className="text-sm text-text-secondary">Result not available</p>
              })()}
            </section>

            {/* Logs */}
            {run.logs.length > 0 && (
              <section className="border-t border-border-structural py-4">
                <SectionTitle>Logs</SectionTitle>
                <div className="flex flex-col gap-3">
                  {run.logs.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex gap-4 border-b border-border-structural pb-3 last:border-b-0"
                    >
                      <span className="w-36 shrink-0 text-xs text-text-quaternary">
                        {formatDateTime(entry.timestamp)}
                      </span>
                      <span
                        className={`w-12 shrink-0 rounded px-1 text-xs font-medium ${
                          LOG_LEVEL_CLASS[entry.level] ?? 'text-text-secondary'
                        }`}
                      >
                        {entry.level}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-sm text-text-primary leading-none">
                          {entry.message}
                        </p>
                        {entry.step && <p className="text-xs text-text-quaternary">{entry.step}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </PageLayout>
    </div>
  )
}

export default SchedulerRunDetailsPage
