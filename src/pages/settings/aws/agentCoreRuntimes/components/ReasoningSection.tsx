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

import type { ConfigurationFormValues, ReasoningFormValues } from './ConfigurationJsonForm'

export interface ReasoningSectionProps {
  prefix: 'reasoning'
  control: Control<ConfigurationFormValues>
  errors: FieldErrors<ConfigurationFormValues>
  textPathHint: string
  showActivePath?: boolean
  showThoughtsPath?: boolean
}

const ReasoningSection: FC<ReasoningSectionProps> = ({
  prefix,
  control,
  errors,
  textPathHint,
  showActivePath = true,
  showThoughtsPath = false,
}) => {
  const [showReasoning, setShowReasoning] = useState(false)
  const reasoningErrors = errors[prefix] as FieldErrors<ReasoningFormValues> | undefined

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-text-quaternary hover:text-text-secondary transition w-fit"
        onClick={() => setShowReasoning((v) => !v)}
        aria-expanded={showReasoning}
      >
        <span
          className={cn('transition-transform', showReasoning && 'rotate-90')}
          aria-hidden="true"
        >
          ›
        </span>{' '}
        Thought Extraction
      </button>

      {showReasoning && (
        <div className="flex flex-col gap-3 pl-4 border-l border-border-structural">
          {showThoughtsPath && (
            <Controller
              name={`${prefix}.thoughts_path`}
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id={`${prefix}.thoughts_path`}
                  label="Thought Array Path"
                  hint="Dot-notation path to the array of thought objects in the response body"
                  placeholder="thoughts"
                  error={
                    (reasoningErrors as FieldErrors<ReasoningFormValues>)?.thoughts_path?.message
                  }
                />
              )}
            />
          )}
          <Controller
            name={`${prefix}.text_path`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id={`${prefix}.text_path`}
                label="Thought Text Path"
                hint={textPathHint}
                placeholder="thinking"
                error={reasoningErrors?.text_path?.message}
              />
            )}
          />
          {showActivePath && (
            <Controller
              name={`${prefix}.active_path`}
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id={`${prefix}.active_path`}
                  label="Thought Active Path"
                  hint="Boolean path — true = thought in progress, false = closed"
                  placeholder="in_progress"
                  error={reasoningErrors?.active_path?.message}
                />
              )}
            />
          )}
          <Controller
            name={`${prefix}.name_path`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id={`${prefix}.name_path`}
                label="Thought Name Path"
                hint="Path to the thought title/name"
                placeholder="name"
                error={reasoningErrors?.name_path?.message}
              />
            )}
          />
          <Controller
            name={`${prefix}.args_path`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id={`${prefix}.args_path`}
                label="Thought Args Path"
                hint="Path to the thought arguments"
                placeholder="args"
                error={reasoningErrors?.args_path?.message}
              />
            )}
          />
        </div>
      )}
    </div>
  )
}

export default ReasoningSection
