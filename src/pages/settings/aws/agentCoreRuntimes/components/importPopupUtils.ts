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

import * as yup from 'yup'

import {
  AgentCoreEndpointConfigurationJson,
  AgentCoreEndpointConfigurationJsonHistory,
  AgentCoreEndpointConfigurationJsonReasoning,
} from '@/types/entity/vendor'
import { tryParseJsonObject } from '@/utils/jsonHelpers'

import { IMPORT_MODES, ImportMode } from '../constants'

import type {
  ConfigurationFormValues,
  HistoryFormValues,
  ReasoningFormValues,
} from './ConfigurationJsonForm'

export const emptyReasoning: ReasoningFormValues = {
  text_path: '',
  active_path: '',
  name_path: '',
  args_path: '',
  thoughts_path: 'thoughts',
}

export const emptyHistory: HistoryFormValues = {
  history_path: 'messages',
  role_path: 'role',
  message_path: 'content',
  user_role: 'user',
  assistant_role: 'assistant',
}

export const defaultFormValues: ConfigurationFormValues = {
  assistantName: '',
  assistantDescription: '',
  messagePath: 'message',
  extraPayload: '',
  streaming: false,
  bodyTextPath: 'response',
  chunkTextPath: 'response',
  reasoning: { ...emptyReasoning },
  history: { ...emptyHistory },
}

export function parseConfigurationJson(
  raw: string | undefined,
  runtimeId: string,
  endpointName: string,
  existingName?: string,
  existingDescription?: string
): ConfigurationFormValues {
  const assistantName = existingName ?? `${runtimeId}:${endpointName}`
  const assistantDescription =
    existingDescription ?? `AgentCore Runtime: ${runtimeId}, Endpoint: ${endpointName}`
  if (!raw) return { ...defaultFormValues, assistantName, assistantDescription }
  try {
    const parsed = JSON.parse(raw) as AgentCoreEndpointConfigurationJson
    if (!parsed.response) return { ...defaultFormValues, assistantName, assistantDescription }
    const isStreaming = parsed.response.streaming ?? false
    const reasoningSource = isStreaming
      ? parsed.response.chunk?.reasoning
      : parsed.response.body?.reasoning
    return {
      assistantName,
      assistantDescription,
      messagePath: parsed.request?.message_path ?? '',
      extraPayload: parsed.request?.extra_payload
        ? JSON.stringify(parsed.request.extra_payload, null, 2)
        : '',
      streaming: isStreaming,
      chunkTextPath: parsed.response.chunk?.text_path ?? parsed.response.body?.text_path ?? '',
      bodyTextPath: parsed.response.body?.text_path ?? parsed.response.chunk?.text_path ?? '',
      reasoning: {
        text_path: reasoningSource?.text_path ?? '',
        active_path: reasoningSource?.active_path ?? '',
        name_path: reasoningSource?.name_path ?? '',
        args_path: reasoningSource?.args_path ?? '',
        thoughts_path: reasoningSource?.thoughts_path ?? 'thoughts',
      },
      history: {
        history_path: parsed.request?.history?.history_path ?? 'messages',
        role_path: parsed.request?.history?.role_path ?? 'role',
        message_path: parsed.request?.history?.message_path ?? 'content',
        user_role: parsed.request?.history?.user_role ?? 'user',
        assistant_role: parsed.request?.history?.assistant_role ?? 'assistant',
      },
    }
  } catch {
    return defaultFormValues
  }
}

export function buildHistory(
  h: HistoryFormValues
): AgentCoreEndpointConfigurationJsonHistory | undefined {
  return h.history_path
    ? {
        history_path: h.history_path,
        ...(h.role_path ? { role_path: h.role_path } : {}),
        ...(h.message_path ? { message_path: h.message_path } : {}),
        ...(h.user_role ? { user_role: h.user_role } : {}),
        ...(h.assistant_role ? { assistant_role: h.assistant_role } : {}),
      }
    : undefined
}

export function buildReasoning(
  r: ReasoningFormValues
): AgentCoreEndpointConfigurationJsonReasoning | undefined {
  return r.text_path
    ? {
        text_path: r.text_path,
        ...(r.thoughts_path ? { thoughts_path: r.thoughts_path } : {}),
        ...(r.active_path ? { active_path: r.active_path } : {}),
        ...(r.name_path ? { name_path: r.name_path } : {}),
        ...(r.args_path ? { args_path: r.args_path } : {}),
      }
    : undefined
}

export function buildResponsePayload(
  values: ConfigurationFormValues
): AgentCoreEndpointConfigurationJson['response'] {
  const reasoning = buildReasoning(values.reasoning)
  if (values.streaming) {
    return {
      streaming: true,
      chunk: {
        text_path: values.chunkTextPath,
        ...(reasoning ? { reasoning } : {}),
      },
    }
  }
  return {
    streaming: false,
    body: {
      text_path: values.bodyTextPath,
      ...(reasoning ? { reasoning } : {}),
    },
  }
}

export function parseExtraPayload(raw: string): Record<string, unknown> | undefined {
  const trimmed = raw.trim()
  return trimmed ? tryParseJsonObject(trimmed) ?? undefined : undefined
}

export function serializeToJson(values: ConfigurationFormValues): string {
  const history = buildHistory(values.history)
  const extraPayload = parseExtraPayload(values.extraPayload)
  const json: AgentCoreEndpointConfigurationJson = {
    request: {
      ...(values.messagePath ? { message_path: values.messagePath } : {}),
      ...(history ? { history } : {}),
      ...(extraPayload ? { extra_payload: extraPayload } : {}),
    },
    response: buildResponsePayload(values),
  }

  return JSON.stringify(json)
}

export const reasoningSchema = yup.object({
  text_path: yup.string().default(''),
  active_path: yup.string().default(''),
  name_path: yup.string().default(''),
  args_path: yup.string().default(''),
  thoughts_path: yup.string().default('thoughts'),
})

export const historySchema = yup.object({
  history_path: yup.string().default('messages'),
  role_path: yup.string().default('role'),
  message_path: yup.string().default('content'),
  user_role: yup.string().default('user'),
  assistant_role: yup.string().default('assistant'),
})

export const schema = yup
  .object({
    assistantName: yup.string().required('Assistant name is required').default(''),
    assistantDescription: yup.string().required('Assistant description is required').default(''),
    messagePath: yup.string().required('Message path is required').default('message'),
    extraPayload: yup
      .string()
      .default('')
      .test('is-json-object', 'Must be a valid JSON object', (value) => {
        if (!value?.trim()) return true
        return tryParseJsonObject(value) !== null
      }),
    streaming: yup.boolean().required().default(false),
    bodyTextPath: yup.string().when('streaming', {
      is: false,
      then: (s) => s.required('Response text path is required').default('response'),
      otherwise: (s) => s.default('response'),
    }),
    chunkTextPath: yup.string().when('streaming', {
      is: true,
      then: (s) => s.required('Chunk text path is required').default('response'),
      otherwise: (s) => s.default('response'),
    }),
    reasoning: reasoningSchema,
    history: historySchema,
  })
  .test('thoughts-path-required', 'Thought array path is required', function (values) {
    if (!values?.streaming && values?.reasoning?.text_path && !values?.reasoning?.thoughts_path) {
      return this.createError({
        path: 'reasoning.thoughts_path',
        message: 'Thought array path is required',
      })
    }
    return true
  })

export const MODE_LABELS: Record<ImportMode, { header: string; submit: string }> = {
  [IMPORT_MODES.INSTALL]: { header: 'Install endpoint', submit: 'Install' },
  [IMPORT_MODES.REINSTALL]: { header: 'Reinstall endpoint', submit: 'Reinstall' },
  [IMPORT_MODES.CONFIGURE]: { header: 'Configure endpoint', submit: 'Save' },
}
