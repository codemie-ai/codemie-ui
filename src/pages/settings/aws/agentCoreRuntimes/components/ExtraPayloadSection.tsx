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

import Textarea from '@/components/form/Textarea/Textarea'
import { cn } from '@/utils/utils'

import type { ConfigurationFormValues } from './ConfigurationJsonForm'

export interface ExtraPayloadSectionProps {
  control: Control<ConfigurationFormValues>
  errors: FieldErrors<ConfigurationFormValues>
}

const ExtraPayloadSection: FC<ExtraPayloadSectionProps> = ({ control, errors }) => {
  const [showExtraPayload, setShowExtraPayload] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-text-quaternary hover:text-text-secondary transition w-fit"
        onClick={() => setShowExtraPayload((v) => !v)}
        aria-expanded={showExtraPayload}
      >
        <span
          className={cn('transition-transform', showExtraPayload && 'rotate-90')}
          aria-hidden="true"
        >
          ›
        </span>{' '}
        Extra Payload
      </button>

      {showExtraPayload && (
        <div className="pl-4 border-l border-border-structural">
          <Controller
            name="extraPayload"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="extraPayload"
                hint={'Optional JSON object merged into every request (e.g. {"sessionId": "abc"})'}
                placeholder="{}"
                rows={3}
                error={errors.extraPayload?.message}
              />
            )}
          />
        </div>
      )}
    </div>
  )
}

export default ExtraPayloadSection
