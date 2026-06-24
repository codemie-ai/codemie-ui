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

import { FC } from 'react'
import { Control, Controller, FieldErrors } from 'react-hook-form'

import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea/Textarea'

import ExtraPayloadSection from './ExtraPayloadSection'
import HistorySection from './HistorySection'
import ReasoningSection from './ReasoningSection'
import Section from './Section'

export interface ReasoningFormValues {
  text_path: string
  active_path: string
  name_path: string
  args_path: string
  thoughts_path: string
}

export interface HistoryFormValues {
  history_path: string
  role_path: string
  message_path: string
  user_role: string
  assistant_role: string
}

export interface ConfigurationFormValues {
  assistantName: string
  assistantDescription: string
  messagePath: string
  extraPayload: string
  streaming: boolean
  bodyTextPath: string
  chunkTextPath: string
  reasoning: ReasoningFormValues
  history: HistoryFormValues
}

export interface ConfigurationJsonFormProps {
  control: Control<ConfigurationFormValues>
  errors: FieldErrors<ConfigurationFormValues>
  streaming: boolean
}

const ConfigurationJsonForm: FC<ConfigurationJsonFormProps> = ({ control, errors, streaming }) => {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Assistant">
        <Controller
          name="assistantName"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="assistantName"
              label="Assistant Name"
              hint="Display name for the assistant"
              required
              placeholder="My AgentCore Assistant"
              error={errors.assistantName?.message}
            />
          )}
        />

        <Controller
          name="assistantDescription"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="assistantDescription"
              label="Assistant Description"
              hint="Description for the assistant"
              required
              placeholder="Describe what this assistant does"
              error={errors.assistantDescription?.message}
              rows={5}
            />
          )}
        />
      </Section>

      <Section title="Request">
        <Controller
          name="messagePath"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="messagePath"
              label="Message Path"
              hint="Dot-notation path for the user query in the request body"
              placeholder="message"
              required
              error={errors.messagePath?.message}
            />
          )}
        />

        <HistorySection control={control} errors={errors} />
        <ExtraPayloadSection control={control} errors={errors} />
      </Section>

      <Section title="Response">
        <Controller
          name="streaming"
          control={control}
          render={({ field }) => (
            <Switch
              id="streaming"
              label="Enable Streaming"
              hint="Toggle between single-response and streaming SSE mode"
              value={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              onBlur={field.onBlur}
            />
          )}
        />

        {!streaming ? (
          <Controller
            name="bodyTextPath"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="bodyTextPath"
                label="Response Text Path"
                hint="Dot-notation path to the answer text in the response body (e.g. output, result.answer)"
                placeholder="output"
                required
                error={errors.bodyTextPath?.message}
              />
            )}
          />
        ) : (
          <Controller
            name="chunkTextPath"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="chunkTextPath"
                label="Chunk Text Path"
                hint="Dot-notation path to extract text from each SSE chunk"
                placeholder="delta"
                required
                error={errors.chunkTextPath?.message}
              />
            )}
          />
        )}

        <ReasoningSection
          prefix="reasoning"
          control={control}
          errors={errors}
          textPathHint={
            streaming
              ? 'Path to the thought/reasoning content in each chunk'
              : 'Path to the thought/reasoning content'
          }
          showActivePath={streaming}
          showThoughtsPath={!streaming}
        />
      </Section>
    </div>
  )
}

export default ConfigurationJsonForm
