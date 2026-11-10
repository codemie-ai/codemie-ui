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
import { ABILITY_KEY } from '@/constants'
import type { Entity } from '@/utils/entity'

/**
 * An error whose message is written for the person using the page. `hostedErrorMessage` shows
 * only these, server messages and a network hint; anything else becomes a generic message.
 */
export class HostedUserError extends Error {
  override name = 'HostedUserError'
}

export type HostedScope = 'mine' | 'project' | 'marketplace' | 'shared'

/** Actions a suspension refuses, as reported by the server in `suspension_refuses`. */
export type SuspensionRefused = 'activate' | 'move' | 'publish' | 'share_on'

/** Catalog filter values accepted on My apps only. */
export const HOSTED_SHARED_FILTERS = ['private', 'people', 'project'] as const
export type HostedSharedFilter = (typeof HOSTED_SHARED_FILTERS)[number]
/**
 * Never overlapping: `draft` = no active version and not in the Marketplace, `published` = in the
 * Marketplace, `unpublished` = an active version, not in the Marketplace.
 */
export const HOSTED_STATUS_FILTERS = ['draft', 'published', 'unpublished'] as const
export type HostedStatusFilter = (typeof HOSTED_STATUS_FILTERS)[number]

export type VersionState =
  | 'uploading'
  | 'queued'
  | 'validating'
  | 'awaiting_configuration'
  | 'accepted'
  | 'rejected'
  | 'failed'
  | 'canceled'

export interface HostedPage<T> {
  items: T[]
  next_cursor: string | null
}

export interface HostedCapabilities {
  create: boolean
  view: boolean
  disabled_reason: string | null
  /** Empty while the feature is off. */
  limits: Partial<{
    html_bytes: number
    zip_bytes: number
  }>
}

export interface HostedApplication extends Entity {
  id: string
  name: string
  description: string
  artifact_kind: 'html' | 'zip' | null
  project?: string | null
  /**
   * "Shared with project": members of `project` can open it. Grants by name or by link are
   * separate and only listed for the creator (`GET /{id}/shared-with`).
   */
  shared?: boolean
  /** Published to the marketplace. */
  is_global?: boolean
  created_by?: { id?: string; name?: string; username?: string } | null
  publisher: { display_name: string }
  updated_at: string
  [ABILITY_KEY]?: string[]
  can_share?: boolean
  can_moderate?: boolean
  /** Suspended by a moderator. */
  suspended?: boolean
  /** What the suspension refuses: every refused action while suspended, otherwise empty. */
  suspension_refuses?: SuspensionRefused[]
  has_active_version?: boolean
  selected_version_id?: string | null
  active_version_id?: string | null
  revision?: number
  etag?: string
  created_at?: string
  /** True when the owner uploaded a custom card cover image. */
  has_cover?: boolean
}

export interface HostedUsage {
  byte_limit: number
  stored_bytes: number
  reserved_bytes: number
}

export interface HostedVersion {
  id: string
  sequence: number
  filename: string
  artifact_kind: 'html' | 'zip'
  expected_bytes: number
  can_preview: boolean
  can_activate: boolean
  validation_state: VersionState
  security_state: 'clear' | 'blocked'
  revision: number
  etag: string
  configuration_revision: number
  requested_configuration: {
    routing_mode: 'static' | 'spa_history'
    site_root_hint?: string | null
    entrypoint_hint?: string | null
  }
  candidate_manifest_digest: string | null
  upload: {
    upload_id: string
    generation: number
    state: 'created' | 'receiving' | 'stored' | 'completed' | 'canceled' | 'expired'
    etag: string
    expires_at: string
    received_bytes: number
    sha256: string | null
    can_reset: boolean
  }
  job: {
    id: string
    state: string
    phase: string
    details: Record<string, unknown>
    etag: string
  } | null
  accepted: {
    entrypoint_path: string
    site_root: string
    routing_mode: 'static' | 'spa_history'
    file_count: number
    expanded_bytes: number
    accepted_at: string
  } | null
  created_at: string
}

export interface HostedUpload {
  version_id: string
  sequence: number
  upload_id: string
  generation: number
  expires_at: string
  upload_path: string
  upload_etag: string
  version_etag: string
  app_etag: string
}

export interface HostedValidationReport {
  job_id: string
  etag: string
  next_offset: number | null
  state: VersionState
  phase: string
  roots: string[]
  entries: string[]
  warnings: { code: string; path: string; message: string }[]
  errors: { code: string; message: string }[]
  file_count: number
  expanded_bytes: number
  candidate_manifest_digest: string | null
  configuration_revision: number
  scanner?: { version: string; signature_version: string }
}
