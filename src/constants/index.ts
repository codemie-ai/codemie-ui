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

export const APP_VERSION = '0.4.6'

export const USER_ID = 'codemie-user-id'

export const ENV = {
  LOCAL: 'local',
  PROD: 'prod',
} as const

export const ROLE_ASSISTANT = 'Assistant'
export const ROLE_USER = 'User'

export const AUTHOR_USER = 'user'
export const AUTHOR_OPERATOR = 'operator'

export const USER_TYPE_EXTERNAL = 'external'

export const INDEX_VALIDATION_REGEX_PATTERN = {
  beginsWith: /^(?![_-])/,
  containsChars: /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
} as const

export const INDEX_ERROR_MSGS = {
  beginsWithSpecialChars: "Index name can't begin with '_' or '-'",
  containsSpecialChars: "Index name can contain only latin letters, numbers and symbols '-', '_'",
  fileTypeNotSupported: 'Binary extensions are not supported',
  isDotOrDotDot: "Index name cannot be '.' or '..'",
} as const

export const SYSTEM_PROMPT_VARIABLES = ['current_user', 'date'] as const

export const TEXT_EMBEDDING_ADA = 'ada'
export const GPT_3_5_TURBO = 'gpt-35-turbo'

export const MIN_TOP_K = 1
export const MAX_TOP_K = 20

export const ABILITIES = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
} as const

export const ABILITY_KEY = 'user_abilities'

export const DOCUMENT_SOURCE_KEY = '###SOURCE DOCUMENT###'
export const MARKDOWN_ENABLED_AUTHORS: readonly string[] = [
  'Codemie Thoughts',
  'Browser Take Screenshot',
]
export const THEME_KEY = 'app-theme'
export const DARK_THEME_KEY = 'codemieDark'
export const LIGHT_THEME_KEY = 'codemieLight'

export enum AssistantTab {
  ALL = 'all',
  USER = 'user',
  TEMPLATES = 'templates',
  MARKETPLACE = 'marketplace',
}

export enum SettingsTab {
  PROFILE = 'profile',
  ADMINISTRATION = 'administration',
  COST_CENTERS_MANAGEMENT = 'cost_centers_management',
  PROJECTS_MANAGEMENT = 'projects_management',
  USERS_MANAGEMENT = 'users_management',
  CATEGORIES_MANAGEMENT = 'categories_management',
  MCP_MANAGEMENT = 'mcp_management',
  PROVIDERS_MANAGEMENT = 'providers_management',
  AI_ADOPTION_CONFIG = 'ai_adoption_config',
  ANALYTICS = 'analytics',
  AWS_ASSISTANTS = 'aws_assistants',
  AWS_WORKFLOWS = 'aws_workflows',
  AWS_DATA_SOURCES = 'aws_data_sources',
  AWS_GUARDRAILS = 'aws_guardrails',
}

export enum ButtonSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export enum ButtonType {
  BASE = 'base',
  PRIMARY = 'primary',
  ACTION = 'action',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  DELETE = 'delete',
  MAGICAL = 'magical',
}

export const DECIMAL_PAGINATION_OPTIONS = [
  { value: '10', label: '10 items' },
  { value: '20', label: '20 items' },
  { value: '50', label: '50 items' },
  { value: '100', label: '100 items' },
]

export const DEFAULT_PAGINATION_OPTIONS = [
  { value: '12', label: '12 items' },
  { value: '24', label: '24 items' },
  { value: '45', label: '45 items' },
  { value: '90', label: '90 items' },
]

export const CHECKER_STATUSES = {
  UNDEFINED: 'undefined',
  IN_PROGRESS: 'in-progress',
  FAILED: 'failed',
  SUCCESS: 'success',
} as const

export type CheckerStatus = (typeof CHECKER_STATUSES)[keyof typeof CHECKER_STATUSES]

export { INDEX_TYPES } from '@/constants/dataSources'

export enum InfoWarningType {
  WARNING = 'warning',
  INFO = 'info',
  ERROR = 'error',
}

export const SHARED = 'shared'
export const NOT_SHARED = 'not_shared'
export const GLOBAL = 'global'
export const CREATED_BY = 'created_by'
export const CATEGORIES = 'categories'

// Sensitive value masking
export const SENSITIVE_VALUE_MASK = '********'

export const HTTP_STATUS = {
  UNAUTHORIZED: 401,
} as const
