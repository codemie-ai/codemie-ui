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

import { KATA_CONSTRAINTS } from '@/constants/katas'
import { KataLevel } from '@/types/entity/kata'

export interface KataFormData {
  title: string
  description: string
  steps: string
  level: KataLevel
  duration_minutes: number
  tags: string[]
  roles: string[]
  image_url: string
  links: Array<{ title: string; url: string; type: string }>
  references: string[]
}

export const kataSchema = yup.object().shape({
  title: yup
    .string()
    .required('Title is required')
    .max(
      KATA_CONSTRAINTS.TITLE_MAX_LENGTH,
      `Title must be less than ${KATA_CONSTRAINTS.TITLE_MAX_LENGTH} characters`
    ),
  description: yup
    .string()
    .required('Description is required')
    .max(
      KATA_CONSTRAINTS.DESCRIPTION_MAX_LENGTH,
      `Description must be less than ${KATA_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters`
    ),
  steps: yup.string().required('Steps are required'),
  level: yup
    .mixed<KataLevel>()
    .oneOf([KataLevel.BEGINNER, KataLevel.INTERMEDIATE, KataLevel.ADVANCED])
    .required('Level is required'),
  duration_minutes: yup
    .number()
    .required('Duration is required')
    .min(KATA_CONSTRAINTS.MIN_DURATION, `Minimum ${KATA_CONSTRAINTS.MIN_DURATION} minutes`)
    .max(KATA_CONSTRAINTS.MAX_DURATION, `Maximum ${KATA_CONSTRAINTS.MAX_DURATION} minutes`),
  tags: yup
    .array()
    .of(yup.string().required())
    .max(KATA_CONSTRAINTS.MAX_TAGS, `Maximum ${KATA_CONSTRAINTS.MAX_TAGS} tags allowed`)
    .default([]),
  roles: yup
    .array()
    .of(yup.string().required())
    .max(KATA_CONSTRAINTS.MAX_ROLES, `Maximum ${KATA_CONSTRAINTS.MAX_ROLES} roles allowed`)
    .default([]),
  image_url: yup
    .string()
    .url('Must be a valid URL')
    .max(
      KATA_CONSTRAINTS.IMAGE_URL_MAX_LENGTH,
      `URL must be less than ${KATA_CONSTRAINTS.IMAGE_URL_MAX_LENGTH} characters`
    )
    .default(''),
  links: yup
    .array()
    .of(
      yup.object().shape({
        title: yup.string().required(),
        url: yup.string().url().required(),
        type: yup.string().required(),
      })
    )
    .default([]),
  references: yup
    .array()
    .of(
      yup
        .string()
        .default('')
        .test('valid-url', 'Must be a valid URL', function (value) {
          if (!value || value.trim() === '') return true
          return yup.string().url().isValidSync(value)
        })
    )
    .default([]),
})

export const levelOptions = [
  { label: 'Beginner', value: KataLevel.BEGINNER },
  { label: 'Intermediate', value: KataLevel.INTERMEDIATE },
  { label: 'Advanced', value: KataLevel.ADVANCED },
]

export const defaultKataFormValues: KataFormData = {
  title: '',
  description: '',
  steps: '',
  level: KataLevel.BEGINNER,
  duration_minutes: 15,
  tags: [],
  roles: [],
  image_url: '',
  links: [],
  references: [],
}
