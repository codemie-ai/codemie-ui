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

import { ChatExportFormat } from '@/types/chats'

export interface FormatOption {
  value: ChatExportFormat
  label: string
  description: string
}

export const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: 'json',
    label: 'JSON',
    description: 'Raw conversation data, best for backup or re-importing elsewhere.',
  },
  {
    value: 'docx',
    label: 'DOCX',
    description: 'Formatted document, best for sharing or editing in Word.',
  },
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Formatted document, best for sharing or printing.',
  },
]
