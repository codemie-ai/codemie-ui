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

import { FC, useState } from 'react'
import { Control, Controller, FieldErrors } from 'react-hook-form'

import Input from '@/components/form/Input'
import { cn } from '@/utils/utils'

import type { ConfigurationFormValues, HistoryFormValues } from './ConfigurationJsonForm'

export interface HistorySectionProps {
  control: Control<ConfigurationFormValues>
  errors: FieldErrors<ConfigurationFormValues>
}

const HistorySection: FC<HistorySectionProps> = ({ control, errors }) => {
  const [showHistory, setShowHistory] = useState(false)
  const historyErrors = errors.history as FieldErrors<HistoryFormValues> | undefined

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-text-quaternary hover:text-text-secondary transition w-fit"
        onClick={() => setShowHistory((v) => !v)}
        aria-expanded={showHistory}
      >
        <span className={cn('transition-transform', showHistory && 'rotate-90')} aria-hidden="true">
          ›
        </span>{' '}
        History
      </button>

      {showHistory && (
        <div className="flex flex-col gap-3 pl-4 border-l border-border-structural">
          <Controller
            name="history.history_path"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="history.history_path"
                label="History Path"
                hint="Dot-notation path for the turns array in the request body (e.g. messages)"
                placeholder="messages"
                required
                error={historyErrors?.history_path?.message}
              />
            )}
          />
          <Controller
            name="history.role_path"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="history.role_path"
                label="Role Path"
                hint="Field name for the role within each turn"
                placeholder="role"
                error={historyErrors?.role_path?.message}
              />
            )}
          />
          <Controller
            name="history.message_path"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="history.message_path"
                label="Message Path"
                hint="Field name for the text within each turn"
                placeholder="content"
                error={historyErrors?.message_path?.message}
              />
            )}
          />
          <Controller
            name="history.user_role"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="history.user_role"
                label="User Role"
                hint="Role label for user turns"
                placeholder="user"
                error={historyErrors?.user_role?.message}
              />
            )}
          />
          <Controller
            name="history.assistant_role"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="history.assistant_role"
                label="Assistant Role"
                hint="Role label for assistant turns"
                placeholder="assistant"
                error={historyErrors?.assistant_role?.message}
              />
            )}
          />
        </div>
      )}
    </div>
  )
}

export default HistorySection
