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

import * as yup from 'yup'

export const applicationMetadataSchema = yup.object({
  name: yup.string().trim().required('Name is required').max(120, 'Use at most 120 characters'),
  // Required when creating; an existing application without a project can still be edited.
  project: yup
    .string()
    .trim()
    .defined()
    .test(
      'required-on-create',
      'Project is required',
      (value, context) => !context.options.context?.creating || !!value
    ),
  shared: yup.boolean().required(),
  description: yup
    .string()
    .trim()
    .required('Description is required')
    .max(2000, 'Use at most 2,000 characters'),
})
export type ApplicationMetadataForm = yup.InferType<typeof applicationMetadataSchema>
