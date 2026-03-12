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

import {
  MAX_CONTENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_SKILL_CATEGORIES,
  MAX_SKILL_NAME_LENGTH,
  MIN_CONTENT_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MIN_SKILL_NAME_LENGTH,
  SKILL_NAME_PATTERN,
} from '@/constants/skills'
import { AssistantToolkit } from '@/types/entity/assistant'
import { SkillVisibility } from '@/types/entity/skill'

export const skillValidationSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(MIN_SKILL_NAME_LENGTH, `Name must be at least ${MIN_SKILL_NAME_LENGTH} characters`)
    .max(MAX_SKILL_NAME_LENGTH, `Name must not exceed ${MAX_SKILL_NAME_LENGTH} characters`)
    .matches(
      SKILL_NAME_PATTERN,
      'Name must be kebab-case (lowercase letters, numbers, and hyphens only)'
    ),

  description: Yup.string()
    .required('Description is required')
    .min(
      MIN_DESCRIPTION_LENGTH,
      `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`
    )
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`
    ),

  content: Yup.string()
    .required('Instructions are required')
    .min(MIN_CONTENT_LENGTH, `Instructions must be at least ${MIN_CONTENT_LENGTH} characters`)
    .max(MAX_CONTENT_LENGTH, `Instructions must not exceed ${MAX_CONTENT_LENGTH} characters`),

  project: Yup.string().required('Project is required'),

  visibility: Yup.string<SkillVisibility>()
    .oneOf(Object.values(SkillVisibility), 'Invalid visibility')
    .required('Visibility is required'),

  categories: Yup.array()
    .of(Yup.string().defined())
    .max(MAX_SKILL_CATEGORIES, `Maximum ${MAX_SKILL_CATEGORIES} categories allowed`)
    .default([]),

  toolkits: Yup.array().of(Yup.mixed<AssistantToolkit>().required()).default([]),
})
