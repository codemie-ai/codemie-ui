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

import { INDEX_TYPE_CHUNK_SUMMARY, INDEX_TYPE_SUMMARY, INDEX_TYPES } from '@/constants/dataSources'
import { DataProvider, DataSourceDetailsResponse } from '@/types/entity/dataSource'

import { mapDetailsToFormValues } from './mapDetailsToFormValues'
import { PROVIDER_FIELD_TYPES } from '../../../constants'

const PROVIDER_OTP_FIELD = 'otp'

export interface BuildCloneOptions {
  providerSchema?: DataProvider
  isProjectVisible: (projectName?: string) => boolean
}

/**
 * Builds create-mode form values from an existing data source: configuration is kept,
 * identity, runtime state, file content and secrets are not.
 */
export const buildCloneValues = (
  defaults: Partial<DataSourceDetailsResponse>,
  { providerSchema, isProjectVisible }: BuildCloneOptions
): Record<string, any> => {
  const values = mapDetailsToFormValues(defaults, { isEditing: false, providerSchema })

  const providerFields = defaults?.provider_fields ?? {}
  const sourceParams: Record<string, any> = {
    ...(providerFields.base_params ?? {}),
    ...(providerFields.create_params ?? {}),
  }
  Object.keys(sourceParams).forEach((key) => delete values[key])

  const schemaParams = [
    ...(providerSchema?.base_schema?.parameters ?? []),
    ...(providerSchema?.create_schema?.parameters ?? []),
  ]
  schemaParams.forEach((param) => {
    if (!(param.name in sourceParams)) return
    if (param.name === PROVIDER_OTP_FIELD || param.parameter_type === PROVIDER_FIELD_TYPES.UUID) {
      return
    }
    if (param.parameter_type === PROVIDER_FIELD_TYPES.SECRET) {
      values[param.name] = ''
      return
    }
    const value = sourceParams[param.name]
    // Same as edit: only Multiselect holds an array; API/SDK-created sources may store one for others.
    values[param.name] =
      Array.isArray(value) && param.parameter_type !== PROVIDER_FIELD_TYPES.MULTISELECT
        ? value[0]
        : value
  })

  const sourceType = defaults?.index_type
  if (sourceType === INDEX_TYPE_SUMMARY || sourceType === INDEX_TYPE_CHUNK_SUMMARY) {
    values.repoIndexType = sourceType
  }

  // The (visible) type selector identifies a provider by its schema id; a stored 'provider'
  // type would make the selector clear the provider metadata and break validation.
  if (values.indexType === INDEX_TYPES.PROVIDER && providerSchema) {
    values.indexType = providerSchema.id
  }

  return {
    ...values,
    name: '',
    files: [],
    uploadedFiles: [],
    sharepointAccessToken: '',
    projectName: isProjectVisible(defaults?.project_name) ? defaults?.project_name ?? '' : '',
  }
}
