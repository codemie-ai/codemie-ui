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

import { AssistantPromptVariable } from '@/types/entity/assistant'

const KEY_EXISTS_ERR = 'Key already exists'
const KEY_INVALID_ERR = 'Only lower case characters and _ are allowed'
const KEY_REQUIRED_ERR = 'Key is required'

export const getSchema = (existingVariables: AssistantPromptVariable[]) => {
  return Yup.object().shape({
    key: Yup.string()
      .transform((value) => value.trim())
      .required(KEY_REQUIRED_ERR)
      .matches(/^[a-z0-9_]+$/, KEY_INVALID_ERR)
      .max(100)
      .test('unique', KEY_EXISTS_ERR, function (value) {
        if (!value) return false
        return !existingVariables.some((item: AssistantPromptVariable) => item.key === value.trim())
      }),
    description: Yup.string().max(200),
    default_value: Yup.string().max(500),
    is_sensitive: Yup.boolean(),
  })
}
