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

import { Controller, Control, FieldPath, FieldValues } from 'react-hook-form'

import Autocomplete from '../Autocomplete'
import { AutocompleteProps } from '../Autocomplete/Autocomplete'

interface FormAutocompleteProps<TFieldValues extends FieldValues>
  extends Omit<AutocompleteProps, 'value' | 'onChange' | 'name'> {
  name: FieldPath<TFieldValues>
  control: Control<TFieldValues>
  className?: string
}

function FormAutocomplete<TFieldValues extends FieldValues>({
  name,
  control,
  className = 'mt-4',
  ...autocompleteProps
}: FormAutocompleteProps<TFieldValues>) {
  return (
    <div className={className}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Autocomplete
            {...autocompleteProps}
            value={field.value!}
            onChange={field.onChange}
            name={name as string}
          />
        )}
      />
    </div>
  )
}

export default FormAutocomplete
