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

import type { SchedulePreset, SchedulePresetOption, CronExample } from '@/types/entity/dataSource'

export const INDEX_TYPE_SUMMARY = 'summary'
export const INDEX_TYPE_CODE = 'code'
export const INDEX_TYPE_CHUNK_SUMMARY = 'chunk-summary'

export const INDEX_TYPES = {
  GIT: 'git',
  CONFLUENCE: 'confluence',
  JIRA: 'jira',
  XRAY: 'xray',
  FILE: 'file',
  GOOGLE: 'google',
  AZURE_DEVOPS_WIKI: 'azure_devops_wiki',
  AZURE_DEVOPS_WORK_ITEM: 'azure_devops_work_item',
  SHAREPOINT: 'sharepoint',
  PROVIDER: 'provider',
  BEDROCK: 'bedrock',
} as const

export type IndexType = (typeof INDEX_TYPES)[keyof typeof INDEX_TYPES]

export const SHAREPOINT_AUTH_TYPES = {
  INTEGRATION: 'integration',
  OAUTH_CODEMIE: 'oauth_codemie',
  OAUTH_CUSTOM: 'oauth_custom',
} as const

export type SharePointAuthType = (typeof SHAREPOINT_AUTH_TYPES)[keyof typeof SHAREPOINT_AUTH_TYPES]

export const INDEX_STATUSES = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  IN_PROGRESS: 'in_progress',
  QUEUED: 'queued',
} as const

interface IndexTypeOption {
  value: string
  label: string
}

export const REPO_INDEX_TYPE_OPTIONS: IndexTypeOption[] = [
  { value: INDEX_TYPE_CODE, label: 'Whole codebase' },
  { value: INDEX_TYPE_SUMMARY, label: 'Summarization per file' },
  { value: INDEX_TYPE_CHUNK_SUMMARY, label: 'Summarization per chunks' },
]

export const FILTER_INITIAL_STATE = {
  name: '',
  project: [],
  index_type: [],
  created_by: '',
  status: '',
  start_date: null,
  end_date: null,
} as const

export const MAX_FILE_SIZE = 104_857_600 // 100MB

export const FILE_SIZE_ERR = 'File size is too big, max 100MB allowed'
export const FILE_FILTER_PLACEHOLDER = `*.py
*.txt
debug.log*
`

export const FILES_FILTER_TOOLTIP = `- Patterns (e.g., *.pdf): Include ONLY matching files
- !Patterns (e.g., !*.tmp): EXCLUDE matching files
- Combined (e.g., *.docx + !draft_*.docx): Include .docx files except draft_*.docx files`

interface CsvSeparatorOption {
  value: string
  label: string
}

export const CSV_SEPARATORS: CsvSeparatorOption[] = [
  { value: ';', label: '; (semicolon)' },
  { value: ',', label: ', (comma)' },
  { value: '\t', label: '\\t (tab)' },
]

export const DEFAULT_DOCUMENTATION_PROMPT =
  'You are acting as a code documentation expert for a project.\n' +
  "Below is the code from a file that has the name '{fileName}'.\n" +
  'Write a detailed technical explanation of what this code does.\n' +
  'Focus on the low-level purpose of the code.\n' +
  'DO NOT RETURN MORE THAN 100 WORDS.\n' +
  'Do not just list the methods and classes in this file.\n' +
  '\n' +
  'code:\n' +
  '{fileContents}\n' +
  '\n' +
  'Response:'

// Scheduling constants
export const SCHEDULE_PRESETS = {
  NONE: 'none',
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
} as const

export const SCHEDULE_PRESET_OPTIONS: SchedulePresetOption[] = [
  { value: SCHEDULE_PRESETS.NONE, label: 'No schedule (manual only)' },
  { value: SCHEDULE_PRESETS.HOURLY, label: 'Every hour' },
  { value: SCHEDULE_PRESETS.DAILY, label: 'Daily at midnight' },
  { value: SCHEDULE_PRESETS.WEEKLY, label: 'Weekly on Sunday at midnight' },
  { value: SCHEDULE_PRESETS.MONTHLY, label: 'Monthly on the 1st at midnight' },
  { value: SCHEDULE_PRESETS.CUSTOM, label: 'Custom cron expression' },
]

export const CRON_PRESETS: Record<SchedulePreset, string> = {
  [SCHEDULE_PRESETS.NONE]: '',
  [SCHEDULE_PRESETS.HOURLY]: '0 * * * *',
  [SCHEDULE_PRESETS.DAILY]: '0 0 * * *',
  [SCHEDULE_PRESETS.WEEKLY]: '0 0 * * 0',
  [SCHEDULE_PRESETS.MONTHLY]: '0 0 1 * *',
  [SCHEDULE_PRESETS.CUSTOM]: '',
}

export const CRON_EXAMPLES: CronExample[] = [
  { expression: '0 * * * *', description: 'Every hour at minute 0' },
  { expression: '0 */2 * * *', description: 'Every 2 hours' },
  { expression: '0 */6 * * *', description: 'Every 6 hours' },
  { expression: '0 */12 * * *', description: 'Every 12 hours' },
  { expression: '0 0 * * *', description: 'Every day at midnight' },
  { expression: '0 2 * * *', description: 'Every day at 2:00 AM' },
  { expression: '0 0 * * 0', description: 'Every Sunday at midnight' },
  { expression: '0 0 1 * *', description: 'First day of every month at midnight' },
]

export const CRON_HELP_TEXT = 'Cron expression format: minute hour day month weekday'
export const CRON_PLACEHOLDER = '0 0 * * *'
export const CRON_HELP_URL =
  'https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules'

// Reindex types
export const REINDEX_TYPES = {
  SCHEDULER: 'scheduler',
} as const

export type ReindexType = (typeof REINDEX_TYPES)[keyof typeof REINDEX_TYPES]

interface ReindexTypeOption {
  value: ReindexType
  label: string
}

export const REINDEX_TYPE_OPTIONS: ReindexTypeOption[] = [
  { value: REINDEX_TYPES.SCHEDULER, label: 'Scheduler' },
]
