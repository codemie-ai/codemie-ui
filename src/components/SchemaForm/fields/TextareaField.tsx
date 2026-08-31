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

import Textarea from '@/components/form/Textarea'

import { FieldComponentProps } from '../fieldRegistry'

const TextareaField: FC<FieldComponentProps> = ({ field, value, error, onChange }) => (
  <Textarea
    id={field.name}
    label={field.label}
    hint={field.description ?? undefined}
    error={error}
    value={typeof value === 'string' ? value : ''}
    onChange={(event) => onChange(event.target.value)}
  />
)

export default TextareaField
