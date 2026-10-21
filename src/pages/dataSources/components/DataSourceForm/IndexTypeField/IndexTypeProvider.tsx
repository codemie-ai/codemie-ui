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
import { Controller } from 'react-hook-form'

import IndexProviderForm from '../../IndexProviderForm'

interface Props {
  control: any
  index: any
  /** Clone mode: values the form already holds are kept instead of being overwritten by defaults. */
  isClone?: boolean
  getValues?: (name: string) => any
  projectName: string
  errors?: Record<string, any>
  setValue?: (name: string, value: any, options?: any) => void
}

const IndexTypeProvider: FC<Props> = ({
  index,
  isClone,
  getValues,
  control,
  projectName,
  errors = {},
  setValue,
}) => {
  return (
    <div data-onboarding="datasource-provider-fields">
      <Controller
        name="indexMetadata"
        control={control}
        render={({ field }) => {
          return field.value ? (
            <IndexProviderForm
              dataProvider={field.value}
              projectName={projectName}
              values={index?.provider_fields}
              isClone={isClone}
              getValues={getValues}
              control={control}
              errors={errors}
              setValue={setValue}
            />
          ) : (
            <div />
          )
        }}
      />
    </div>
  )
}

export default IndexTypeProvider
