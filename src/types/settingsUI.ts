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

import * as Yup from 'yup'

import { User } from '@/types/entity'
import { ConfigItem } from '@/types/entity/configuration'

export enum CredentialComponentType {
  input = 'input',
  switch = 'switch',
  textarea = 'textarea',
  select = 'select',
  multiselect = 'multiselect',
  record = 'record',
  message = 'message',
  /** Non-input pseudo-field that renders a subsection heading + divider
   *  inline within the credential fields list. Use `label` for the heading. */
  sectionHeader = 'sectionHeader',
}

export enum CredentialComponentPosition {
  top = 'top',
  fieldsSection = 'fieldsSection', // default
}

export type GetCredentialsMappingParams = {
  settingType: string
  user: User | null
  project?: string
  checkIfAdminOfAnyProject?: boolean
  customerConfig?: readonly ConfigItem[]
}

export type CredentialFieldConfig = {
  label?: string | ((values: Record<string, unknown>) => string)
  placeholder?: string | ((values: Record<string, unknown>) => string)
  type?: CredentialComponentType
  help?: string
  sensitive?: boolean
  shouldShow?: (values: Record<string, unknown>) => boolean
  note?: string
  /** Append the constructed webhook receiving URL after the note. Only meaningful for the webhook-id field. */
  showWebhookUrl?: boolean
  /** UI-only field — value is kept in the form for gating (`shouldShow` predicates) but stripped from the
   *  credential payload on submit so it never reaches the backend. */
  virtual?: boolean
  rows?: number
  options?: { value: string; label: string }[]
  /** Shown when a `multiselect` field would be reduced to zero selections. Falls back to a generic message. */
  emptySelectionError?: string
  position?: CredentialComponentPosition
  validation?: Yup.Schema
  message?: CredentialMessage
  defaultValue?: string | boolean | (() => string | boolean)
}

export enum CredentialAccessType {
  ALL = 'all',
  USER_ONLY = 'user_only',
  PROJECT_ONLY = 'project_only',
}

export enum CredentialRoleRestriction {
  GENERAL = 'general',
  ADMIN_ONLY = 'admin_only',
}

export type CredentialMessage = {
  type: 'info' | 'warn' | 'error'
  title: string
  message: string
  link?: {
    url: string
    text: string
  }
  configKey?: string
  shouldShow?: (values: Record<string, unknown>) => boolean
}

export type FieldsManualConfiguration = {
  label: string
  sensitive: boolean
  addText: string
}

export type CredentialTypeConfig = {
  fields: Record<string, CredentialFieldConfig>
  roleRestrictionType?: CredentialRoleRestriction // Defaults to GENERAL
  accessType?: CredentialAccessType // Defaults to ALL
  enterpriseOnly?: boolean // Defaults to false
  defaultUrl?: string | (() => string)
  testable?: boolean // Defaults to false
  displayName?: string // User-friendly display name (e.g., "X-ray")
  serverEnum?: string // Backend enum value if different from capitalized key (e.g., "Xray" for "xray")
  message?: CredentialMessage
  fieldsSectionTitle?: string // Defaults to 'Authentication'
  fieldsManualConfiguration?: FieldsManualConfiguration // If present, use RecordInput instead of CredentialFields
  personalFeatureFlag?: string
}

export type CredentialUIMap = Record<string, CredentialTypeConfig>
