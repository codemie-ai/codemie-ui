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

import { FC, useMemo } from 'react'
import { Controller } from 'react-hook-form'

import Autocomplete from '@/components/form/Autocomplete'
import FilesDropzone from '@/components/form/FilesDropzone'
import FormAutocomplete from '@/components/form/FormAutocomplete'
import Input from '@/components/form/Input'
import { CSV_SEPARATORS } from '@/constants/dataSources'

interface Props {
  control
  csvPresent
  errors
  register
  embeddingModels
  isSubmitted?: boolean
}

const IndexTypeFile: FC<Props> = ({
  control,
  csvPresent,
  errors,
  embeddingModels,
  isSubmitted = false,
}) => {
  const fileListErrors = useMemo(
    () => (Array.isArray(errors.files) ? errors.files : [errors.files]),
    [errors.files]
  )

  return (
    <div className="mb-4" data-onboarding="datasource-file-fields">
      <Controller
        name="files"
        control={control}
        render={({ field: filesField }) => (
          <FilesDropzone
            name="files"
            onChange={filesField.onChange}
            files={filesField.value as File[]}
            errors={fileListErrors}
            showErrors={isSubmitted}
          />
        )}
      />
      {csvPresent && (
        <div className="flex gap-3 mt-2">
          <Controller
            name="csvSeparator"
            control={control}
            render={({ field: csvSepField }) => (
              <Autocomplete
                value={csvSepField.value!}
                onChange={csvSepField.onChange}
                name="csvSeparator"
                label="CSV Separator"
                options={CSV_SEPARATORS}
                error={errors.csvSeparator?.message}
              />
            )}
          />

          <Controller
            name="csvStartRow"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                name="csvStartRow"
                label="CSV Start Row #"
                error={errors.csvStartRow?.message}
              />
            )}
          />

          <Controller
            name="csvRowsPerDocument"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                name="csvRowsPerDocument"
                label="CSV Rows Per Document #"
                error={errors.csvRowsPerDocument?.message}
              />
            )}
          />
        </div>
      )}

      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />
    </div>
  )
}

export default IndexTypeFile
