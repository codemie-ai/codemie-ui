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

import { useId, useEffect, useRef, useState } from 'react'

import Button from '@/components/Button'
import Select from '@/components/form/Select'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import StatusBadge from '@/components/StatusBadge'
import { hostedApplicationsStore as store, hostedErrorMessage } from '@/store/hostedApplications'
import {
  HostedUserError,
  type HostedVersion,
  type HostedValidationReport,
} from '@/types/entity/hostedApplication'

import { formatBytes, hostedVersionStatus } from './hostedVersionStatus'

interface Props {
  appId: string
  version: HostedVersion
  onClose(): void
  onConfigured(): void
}
const HostedValidationDialog = ({ appId, version, onClose, onConfigured }: Props) => {
  const selectId = useId()
  const [report, setReport] = useState<HostedValidationReport | null>(null)
  const [root, setRoot] = useState('')
  const [entry, setEntry] = useState('')
  const [routing, setRouting] = useState<'static' | 'spa_history'>(
    version.requested_configuration?.routing_mode ?? 'static'
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [snapshot, setSnapshot] = useState<HostedVersion | null>(null)
  const generation = useRef(0)
  const alive = useRef(true)
  const load = async () => {
    generation.current += 1
    const { current } = generation
    const valid = () => alive.current && current === generation.current
    setSnapshot(null)
    setBusy(true)
    setError(null)
    try {
      const [result, fresh] = await Promise.all([
        store.getValidation(appId, version.id),
        store.getVersion(appId, version.id),
      ])
      if (!valid()) return
      setSnapshot(fresh)
      setReport(result)
      const chosenRoot = result.roots.includes(root) ? root : result.roots[0] ?? ''
      setRoot(chosenRoot)
      const entries = result.entries.filter(
        (value) => !chosenRoot || value.startsWith(chosenRoot + '/')
      )
      setEntry(entries.includes(entry) ? entry : entries[0] ?? '')
    } catch (cause) {
      if (valid()) setError(hostedErrorMessage(cause))
    } finally {
      if (valid()) setBusy(false)
    }
  }
  useEffect(() => {
    alive.current = true
    load()
    return () => {
      alive.current = false
      generation.current += 1
    }
  }, [appId, version.id])
  const save = async () => {
    if (!snapshot || busy) return
    const { current } = generation
    const valid = () => alive.current && current === generation.current
    setBusy(true)
    setError(null)
    try {
      await store.configure(appId, snapshot, root, entry, routing)
      if (valid()) onConfigured()
    } catch (cause) {
      if (valid()) setError(hostedErrorMessage(cause))
    } finally {
      if (valid()) setBusy(false)
    }
  }
  return (
    <Popup
      visible
      header={'Version ' + version.sequence + ' · Security checks'}
      fullScreenOnMobile
      limitWidth
      onHide={onClose}
      dismissableMask={false}
      footerContent={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Close
          </Button>
          {report?.state === 'awaiting_configuration' && (
            <Button disabled={busy || !snapshot || !entry} isLoading={busy} onClick={save}>
              Validate configuration
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {busy && !report && <Spinner />}
        {report && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                status={hostedVersionStatus(report.state).status}
                text={hostedVersionStatus(report.state).label}
              />
              <span className="text-xs text-text-quaternary">
                {report.file_count} files · {formatBytes(report.expanded_bytes)}
              </span>
            </div>
            {report.errors.length > 0 && (
              <div
                role="alert"
                className="rounded-lg border border-failed-secondary bg-failed-tertiary p-3 text-sm text-failed-secondary"
              >
                <p className="font-semibold">This version cannot be published</p>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                  {report.errors.map((finding, index) => (
                    <li key={finding.code + index}>{finding.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.warnings.length > 0 && (
              <section aria-labelledby={selectId + '-findings'} className="flex flex-col gap-2">
                <h3
                  id={selectId + '-findings'}
                  className="text-xs font-semibold uppercase text-text-quaternary"
                >
                  Findings
                </h3>
                <ul className="flex flex-col divide-y divide-border-structural rounded-lg border border-border-structural">
                  {report.warnings.map((finding, index) => (
                    <li key={finding.code + index} className="flex flex-col gap-0.5 p-3 text-sm">
                      <span className="break-all font-medium">{finding.path}</span>
                      <span className="text-text-tertiary">{finding.message}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {report.next_offset !== null && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  setError(null)
                  const { current } = generation
                  try {
                    const page = await store.getValidation(appId, version.id, report.next_offset!)
                    if (!alive.current || current !== generation.current) return
                    // Findings of a retried check never mix with the previous one.
                    if (page.job_id !== report.job_id)
                      throw new HostedUserError('Validation changed; reopen its details.')
                    setReport({
                      ...report,
                      warnings: [...report.warnings, ...page.warnings],
                      errors: [...report.errors, ...page.errors],
                      next_offset: page.next_offset,
                    })
                  } catch (cause) {
                    if (alive.current && current === generation.current)
                      setError(hostedErrorMessage(cause))
                  } finally {
                    if (alive.current && current === generation.current) setBusy(false)
                  }
                }}
              >
                Load more findings
              </Button>
            )}
            {report.state === 'awaiting_configuration' && (
              <>
                <Select
                  id={selectId + '-site-root'}
                  label="Site root"
                  value={root || '/'}
                  disabled={busy}
                  options={report.roots.map((value) => ({
                    value: value || '/',
                    label: value || 'Artifact root',
                  }))}
                  onChangeValue={(value) => {
                    setRoot(value === '/' ? '' : String(value))
                    setEntry('')
                  }}
                />
                <Select
                  id={selectId + '-html-entrypoint'}
                  label="HTML entrypoint"
                  value={entry}
                  disabled={busy}
                  options={report.entries
                    .filter((value) => !root || value.startsWith(root + '/'))
                    .map((value) => ({ value, label: value }))}
                  onChangeValue={(value) => setEntry(String(value ?? ''))}
                />
                <Select
                  id={selectId + '-navigation'}
                  label="Navigation"
                  value={routing}
                  disabled={busy}
                  options={[
                    { value: 'static', label: 'Static pages / hash routing' },
                    { value: 'spa_history', label: 'Single-page app with history routing' },
                  ]}
                  onChangeValue={(value) => setRouting(value === 'spa_history' ? value : 'static')}
                />
              </>
            )}
            {report.scanner && (
              <p className="text-xs text-text-quaternary">
                Scanned for malware with ClamAV {report.scanner.version} (signatures{' '}
                {report.scanner.signature_version}).
              </p>
            )}
          </>
        )}
        {error && (
          <div role="alert" className="text-failed-secondary">
            {error}
            <Button variant="tertiary" size="small" onClick={load}>
              Retry
            </Button>
          </div>
        )}
      </div>
    </Popup>
  )
}
export default HostedValidationDialog
