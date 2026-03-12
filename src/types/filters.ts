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

export enum FilterDefinitionType {
  Select = 'select',
  Autocomplete = 'autocomplete',
  Multiselect = 'multiselect',
  CheckboxList = 'checkboxList',
  RadioGroup = 'radioGroup',
  Input = 'input',
  Date = 'date',
  Custom = 'custom',
}

export interface FilterOption {
  label: string
  value: string | number | boolean | null
  id?: string
  badge?: string
}

export interface SelectOption<
  TValue extends string | number | boolean | null = string | number | boolean | null
> {
  label: string
  value: TValue
}

export interface FilterDefinition {
  name: string
  label?: string
  placeholder?: string
  type: FilterDefinitionType
  options: FilterOption[]
  value: unknown
  config?: {
    defaultValue?: string | number | boolean | null | unknown
    [key: string]: unknown
  }
}

export type CustomFilterRenderFunction = (
  definition: FilterDefinition,
  value: unknown,
  updateValue: (value: unknown) => void
) => React.ReactNode

export interface FiltersProps {
  onApply: (filters: Record<string, unknown>) => void
  filterDefinitions: FilterDefinition[]
  searchKey: string
  searchPlaceholder?: string
  searchValue?: unknown
  renderCustomFilter?: CustomFilterRenderFunction
  onReset?: () => void
  areFiltersEmpty: boolean
  refreshOnValuesUpdate?: boolean
}

export interface InitialFilterValues {
  search?: string
  project?: string[]
  created_by?: string
  is_global?: boolean
  shared?: boolean | null
  categories?: string[]
}
