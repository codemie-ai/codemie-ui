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

import PlusSvg from '@/assets/icons/plus.svg?react'
import EyeSvg from '@/assets/icons/view.svg?react'
import Button from '@/components/Button'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import type { NavigationMenuItem } from '@/components/NavigationMore/NavigationMore'
import StatusBadge from '@/components/StatusBadge'
import type { HostedApplication, HostedVersion } from '@/types/entity/hostedApplication'
import { formatDateTime } from '@/utils/helpers'

import { suspensionRefuses } from './hostedAccess'
import { HOSTED_VERSION_IN_PROGRESS, formatBytes, hostedVersionStatus } from './hostedVersionStatus'

interface Props {
  application: HostedApplication
  versions: HostedVersion[]
  busy: boolean
  onAction(version: HostedVersion, action: 'select' | 'activate' | 'cancel' | 'retry'): void
  onResume(version: HostedVersion): void
  onReport(version: HostedVersion): void
  onPreview(version: HostedVersion): void
  /** Shown as Upload version above the list when the person may upload one. */
  onUpload?(): void
}

const Tag = ({ children, tone }: { children: string; tone: 'live' | 'neutral' }) => (
  <span
    className={
      tone === 'live'
        ? 'rounded-full border border-success-primary bg-success-secondary px-2 text-xs-1 font-bold uppercase leading-4 text-success-primary'
        : 'rounded-full border border-border-structural bg-surface-base-primary px-2 text-xs-1 font-bold uppercase leading-4 text-text-tertiary'
    }
  >
    {children}
  </span>
)

const versionHint = (version: HostedVersion) => {
  if (version.validation_state === 'uploading')
    return version.upload.state === 'stored'
      ? 'The file is uploaded and ready to be checked.'
      : 'The upload was interrupted. Resume it with the same file, or cancel this version.'
  if (version.validation_state === 'rejected')
    return 'This version failed the security checks and cannot be published. Upload a corrected file.'
  if (version.validation_state === 'failed')
    return 'Checking did not finish. Retry, or upload the file again.'
  if (version.validation_state === 'awaiting_configuration')
    return 'Choose the entry page and routing for this bundle.'
  if (version.validation_state === 'accepted' && !version.can_preview)
    return 'This version is unavailable under the current security policy. Upload a new version.'
  return null
}

const HostedVersionList = ({
  application: app,
  versions,
  busy,
  onAction,
  onReport,
  onResume,
  onPreview,
  onUpload,
}: Props) => (
  <section aria-labelledby="hosted-versions-heading" className="flex flex-col gap-3">
    <div className="flex items-center justify-between gap-3">
      <h2 id="hosted-versions-heading" className="text-sm font-bold">
        Versions
      </h2>
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-quaternary">
          {versions.length} {versions.length === 1 ? 'version' : 'versions'}
        </span>
        {onUpload && (
          <Button size="small" variant="secondary" disabled={busy} onClick={onUpload}>
            <PlusSvg aria-hidden className="size-4" />
            Upload version
          </Button>
        )}
      </div>
    </div>
    {!versions.length && (
      <div className="rounded-lg border border-dashed border-border-structural p-6 text-center text-sm text-text-tertiary">
        Upload an HTML file or a ZIP with your static build to add the first version.
      </div>
    )}
    {versions.map((version) => {
      const status = hostedVersionStatus(version.validation_state)
      const live = app.active_version_id === version.id
      const selected = app.selected_version_id === version.id
      const hint = versionHint(version)
      const activatable = version.can_activate && !suspensionRefuses(app, 'activate')
      const { accepted } = version
      const menu: NavigationMenuItem[] = [
        {
          title:
            version.validation_state === 'awaiting_configuration'
              ? 'Choose configuration'
              : 'Validation details',
          hidden: !version.job,
          onClick: () => onReport(version),
        },
        {
          title: 'Cancel version…',
          hidden: !HOSTED_VERSION_IN_PROGRESS.includes(version.validation_state),
          disabled: busy,
          onClick: () => onAction(version, 'cancel'),
        },
      ]
      return (
        <article
          key={version.id}
          aria-label={'Version ' + version.sequence}
          className="flex flex-col gap-3 rounded-lg border border-border-structural bg-surface-base-secondary p-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-structural bg-surface-elevated text-sm font-semibold"
            >
              v{version.sequence}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 truncate text-sm font-semibold" title={version.filename}>
                  {version.filename}
                </h3>
                <StatusBadge status={status.status} text={status.label} />
                {live && <Tag tone="live">Active</Tag>}
                {selected && <Tag tone="neutral">Selected</Tag>}
              </div>
              <p className="mt-1 text-xs text-text-quaternary">
                {formatBytes(accepted?.expanded_bytes ?? version.expected_bytes)}
                {accepted ? ' · ' + accepted.file_count + ' files' : ''}
                {' · uploaded ' + formatDateTime(version.created_at, 'relative')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {version.validation_state === 'uploading' && (
                <Button
                  size="small"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onResume(version)}
                >
                  {version.upload.state === 'stored' ? 'Check file' : 'Resume upload'}
                </Button>
              )}
              {version.validation_state === 'failed' && (
                <Button
                  size="small"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onAction(version, 'retry')}
                >
                  Retry
                </Button>
              )}
              {version.can_preview && (
                <Button
                  size="small"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onPreview(version)}
                >
                  <EyeSvg aria-hidden className="size-4" />
                  Preview
                </Button>
              )}
              {version.can_preview && !live && activatable && (
                <Button size="small" disabled={busy} onClick={() => onAction(version, 'activate')}>
                  Activate version
                </Button>
              )}
              {menu.some((item) => !('hidden' in item && item.hidden)) && (
                <NavigationMore
                  renderInRoot
                  placement="bottom-end"
                  hideOnClickInside
                  data-tooltip-content={'Version ' + version.sequence + ' actions'}
                  items={menu}
                />
              )}
            </div>
          </div>
          {hint && <p className="text-xs text-text-tertiary">{hint}</p>}
        </article>
      )
    })}
  </section>
)

export default HostedVersionList
