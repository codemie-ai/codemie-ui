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

interface PaginationOption {
  value: number
  label: string
}

export const DECIMAL_PAGINATION_OPTIONS: PaginationOption[] = [
  { value: 10, label: '10 items' },
  { value: 20, label: '20 items' },
  { value: 50, label: '50 items' },
  { value: 100, label: '100 items' },
]

export const DEFAULT_PAGINATION_OPTIONS: PaginationOption[] = [
  { value: 12, label: '12 items' },
  { value: 24, label: '24 items' },
  { value: 45, label: '45 items' },
  { value: 90, label: '90 items' },
]

export const CHECKER_STATUSES = {
  UNDEFINED: 'undefined',
  IN_PROGRESS: 'in-progress',
  FAILED: 'failed',
  SUCCESS: 'success',
} as const

export const CONFIG_FEEDBACK_ASST_KEY = 'feedbackAssistant'
export const CONFIG_USER_SURVEY_KEY = 'userSurvey'
export const CONFIG_LIKE_FORM_KEY = 'likeForm'

const SUPPORTED_IMAGE_FORMATS = 'JPEG, PNG, JPG, GIF'
export const SUPPORTED_FILE_FORMATS_MESSAGE_BASE =
  'Supported formats: PPTX, DOCX, XLSX, PDF, CSV (others as plain text).'
export const SUPPORTED_FILE_FORMATS_MESSAGE_CHAT = `Supported formats: PPTX, DOCX, XLSX, PDF, CSV, ${SUPPORTED_IMAGE_FORMATS} (others as plain text).`

export const ADDITIONAL_USER_MATERIALS = {
  VIDEO_PORTAL: 'videoPortal',
  USER_GUIDE: 'userGuide',
  YOUTUBE_CHANNEL: 'youtubeChannel',
}
