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

import { yupResolver } from '@hookform/resolvers/yup'
import { useCallback, useEffect, useState } from 'react'
import { useForm, Resolver } from 'react-hook-form'
import * as Yup from 'yup'

import { guardrailAssignmentsSchema } from '@/components/guardrails/GuardrailAssignmentPanel/schemas/guardrailAssignmentSchema'
import { INDEX_ERROR_MSGS, INDEX_VALIDATION_REGEX_PATTERN } from '@/constants'
import {
  INDEX_TYPES,
  INDEX_TYPE_CODE,
  CSV_SEPARATORS,
  FILE_SIZE_ERR,
  DEFAULT_DOCUMENTATION_PROMPT,
  SHAREPOINT_AUTH_TYPES,
} from '@/constants/dataSources'
import { useSearchParams } from '@/hooks/useSearchParams'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'
import { validateCronExpression } from '@/utils/cronValidator'
import { humanize } from '@/utils/helpers'
import { getIndexTypeCode, fileSizeValidator, googleDocLinkValidator } from '@/utils/indexing'

import { PROVIDER_FIELD_TYPES, PROVIDER_STRINGISH_TYPES } from '../../../constants'

const DESCRIPTION_REQUIRED_ERR = 'Description is required'
const CQL_REQUIRED_ERR = 'CQL is required'
const JQL_REQUIRED_ERR = 'JQL is required'
const FILE_REQUIRED_ERR = 'At least one file is required'
const ALL_FILES_REQUIRED_ERR = 'All file slots must be filled'
const FILES_MAX_COUNT_ERR = 'Files field must have less than or equal to 10 items'

const baseValidationSchema = Yup.object({
  name: Yup.string()
    .required('Data source name is required')
    .matches(INDEX_VALIDATION_REGEX_PATTERN.beginsWith, {
      message: INDEX_ERROR_MSGS.beginsWithSpecialChars,
      excludeEmptyString: true,
    })
    .matches(INDEX_VALIDATION_REGEX_PATTERN.containsChars, {
      message: INDEX_ERROR_MSGS.containsSpecialChars,
      excludeEmptyString: true,
    })
    .max(25)
    .min(4),
  description: Yup.string().required(DESCRIPTION_REQUIRED_ERR).max(500),
  projectSpaceVisible: Yup.boolean().required(),
  indexType: Yup.string().required(),

  // TODO: add validation regex from BE error response
  // ^https?:\\/\\/[A-Za-z0-9][A-Za-z0-9\\-\\.]*[A-Za-z0-9]\\.[A-Za-z]{2,}(?:\\/.*)?$
  repoLink: Yup.string().when('indexType', {
    is: INDEX_TYPES.GIT,
    then: (schema) => schema.required('Repo Link is required'),
  }),
  branch: Yup.string().when('indexType', {
    is: INDEX_TYPES.GIT,
    then: (schema) => schema.required('Branch is required'),
  }),

  filesFilter: Yup.string().notRequired(),
  docsGeneration: Yup.string().notRequired(),

  googleDoc: Yup.string().when(['indexType', 'isEditing'], {
    is: (indexType, isEditing) => indexType === INDEX_TYPES.GOOGLE && isEditing === false,
    then: (schema) =>
      schema
        .required('Google Docs link is required')
        .test('googleDoc', 'Invalid Google Docs link', googleDocLinkValidator),
  }),

  // SharePoint fields
  siteUrl: Yup.string().when('indexType', {
    is: INDEX_TYPES.SHAREPOINT,
    then: (schema) => schema.required('SharePoint Site URL is required').url('Must be a valid URL'),
  }),
  includePages: Yup.boolean().notRequired(),
  includeDocuments: Yup.boolean().notRequired(),
  includeLists: Yup.boolean().notRequired(),
  sharepointAuthType: Yup.string().notRequired(),
  sharepointCustomClientId: Yup.string().when(['indexType', 'sharepointAuthType'], {
    is: (indexType: string, sharepointAuthType: string) =>
      indexType === INDEX_TYPES.SHAREPOINT &&
      sharepointAuthType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM,
    then: (schema) =>
      schema
        .required('Azure Application (client) ID is required')
        .matches(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          'Must be a valid GUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)'
        ),
    otherwise: (schema) => schema.notRequired(),
  }),
  sharepointTenantId: Yup.string().when(['indexType', 'sharepointAuthType'], {
    is: (indexType: string, sharepointAuthType: string) =>
      indexType === INDEX_TYPES.SHAREPOINT &&
      sharepointAuthType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM,
    then: (schema) =>
      schema
        .required('Azure Directory (tenant) ID is required')
        .matches(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          'Must be a valid GUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)'
        ),
    otherwise: (schema) => schema.notRequired(),
  }),
  sharepointAccessToken: Yup.string().when(['indexType', 'sharepointAuthType', 'isEditing'], {
    is: (indexType: string, sharepointAuthType: string, isEditing: boolean) =>
      indexType === INDEX_TYPES.SHAREPOINT &&
      sharepointAuthType !== SHAREPOINT_AUTH_TYPES.INTEGRATION &&
      isEditing === false,
    then: (schema) => schema.required('Please sign in with Microsoft before saving'),
    otherwise: (schema) => schema.notRequired(),
  }),
  sharepointFilesFilter: Yup.string().notRequired(),

  files: Yup.array().when(['indexType'], {
    is: (indexType) => indexType === INDEX_TYPES.FILE,
    then: (schema) =>
      schema
        .min(1, FILE_REQUIRED_ERR)
        .max(10, FILES_MAX_COUNT_ERR)
        .of(
          Yup.mixed<File>()
            .test('file-required', function (value) {
              const { parent } = this
              const message = parent.length > 1 ? ALL_FILES_REQUIRED_ERR : FILE_REQUIRED_ERR
              return value instanceof File || this.createError({ message })
            })
            .test('file-size', FILE_SIZE_ERR, fileSizeValidator)
        ),
  }),

  csvSeparator: Yup.string().when(['indexType', 'files', 'isEditing'], {
    is: (indexType, files, isEditing) =>
      indexType === INDEX_TYPES.FILE &&
      Array.isArray(files) &&
      files.some((file) => file?.type === 'text/csv') &&
      isEditing === false,
    then: (schema) => schema.required('CSV separator is required'),
  }),

  csvStartRow: Yup.number().when(['indexType', 'files', 'isEditing'], {
    is: (indexType, files, isEditing) =>
      indexType === INDEX_TYPES.FILE &&
      Array.isArray(files) &&
      files.some((file) => file?.type === 'text/csv') &&
      isEditing === false,
    then: (schema) => schema.required('CSV start line is required'),
  }),

  cql: Yup.string().when('indexType', {
    is: (indexType) => indexType === INDEX_TYPES.CONFLUENCE,
    then: (schema) => schema.required(CQL_REQUIRED_ERR),
  }),

  jql: Yup.string().when('indexType', {
    is: (indexType) => indexType === INDEX_TYPES.JIRA || indexType === INDEX_TYPES.XRAY,
    then: (schema) => schema.required(JQL_REQUIRED_ERR),
  }),

  wikiQuery: Yup.string().optional(),

  wikiName: Yup.string().optional(),

  wiqlQuery: Yup.string().when('indexType', {
    is: INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM,
    then: (schema) =>
      schema.required('WIQL Query is required').min(1, 'WIQL Query is required').trim(),
    otherwise: (schema) => schema.optional(),
  }),

  setting_id: Yup.string().when(['indexType', 'sharepointAuthType'], {
    is: (indexType, sharepointAuthType) => {
      if (indexType === INDEX_TYPES.SHAREPOINT) {
        return !sharepointAuthType || sharepointAuthType === SHAREPOINT_AUTH_TYPES.INTEGRATION
      }
      return [
        INDEX_TYPES.JIRA,
        INDEX_TYPES.XRAY,
        INDEX_TYPES.CONFLUENCE,
        INDEX_TYPES.GIT,
        INDEX_TYPES.AZURE_DEVOPS_WIKI,
        INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM,
      ].includes(indexType)
    },
    then: (schema) => schema.required('Integration is required for this data source type'),
  }),

  repoIndexType: Yup.string().optional(),
  csvRowsPerDocument: Yup.number().optional(),

  projectName: Yup.string().required(),
  new_project_name: Yup.string().notRequired(),
  reindexOnEdit: Yup.string().notRequired(),
  isEditing: Yup.boolean().required(),
  embeddingsModel: Yup.string().notRequired(),
  summarizationModel: Yup.string().notRequired(),
  enableCustomPrompts: Yup.boolean().notRequired(),
  promptTemplate: Yup.string().notRequired(),
  indexMetadata: Yup.object({ schema: Yup.string() }).notRequired(),
  cronExpression: Yup.string()
    .notRequired()
    .test('valid-cron', function (value) {
      if (!value || value.trim() === '') return true
      const error = validateCronExpression(value)
      if (error) {
        return this.createError({ message: error })
      }
      return true
    }),
}).shape(guardrailAssignmentsSchema)

const editingSchema = baseValidationSchema.omit(['files', 'name'])

export type FormValues = Yup.InferType<typeof baseValidationSchema>

export const useEditPopupForm = (
  defaults: Partial<DataSourceDetailsResponse>,
  isEditing?: boolean
) => {
  const [searchParams] = useSearchParams()
  const defaultQueryProject = searchParams.get('addToProject')

  const validationSchema = Yup.lazy((values) => {
    let schema: typeof baseValidationSchema = baseValidationSchema

    if (isEditing) schema = editingSchema as typeof baseValidationSchema

    if (values?.indexMetadata?.base_schema?.parameters) {
      const providerFields = [
        ...(values.indexMetadata.base_schema?.parameters ?? []),
        ...(values.indexMetadata.create_schema?.parameters ?? []),
      ]

      const providerValidations = providerFields.reduce((acc, field) => {
        let fieldSchema
        const humanizedName = humanize(field.name)

        if (
          PROVIDER_STRINGISH_TYPES.includes(field.parameter_type) ||
          field.parameter_type === PROVIDER_FIELD_TYPES.LIST
        ) {
          fieldSchema = Yup.string()
        }

        if (field.parameter_type === PROVIDER_FIELD_TYPES.MULTISELECT) {
          fieldSchema = Yup.array()
        }

        if (field.required) {
          fieldSchema = fieldSchema.required(`${humanizedName} is required`)
        }

        if (field.parameter_type === PROVIDER_FIELD_TYPES.URL) {
          fieldSchema = fieldSchema.test(
            'starts-with-http',
            `${humanizedName} must be a valid URL`,
            (value) => !value || value?.startsWith('http://') || value?.startsWith('https://')
          )
        }

        acc[field.name] = fieldSchema
        return acc
      }, {}) as Record<string, any>

      schema = schema.shape(providerValidations) as typeof schema
    }

    return schema
  })

  const {
    register,
    handleSubmit,
    control,
    formState,
    formState: { errors },
    setError,
    setValue,
    getValues,
    watch,
    reset,
    clearErrors,
    trigger,
  } = useForm<FormValues>({
    resolver: yupResolver(validationSchema) as Resolver<FormValues>,
    defaultValues: {
      projectName: defaults?.project_name ?? '',
      name: '',
      description: '',
      projectSpaceVisible: true,
      indexType: INDEX_TYPES.GIT,
      reindexOnEdit: '',
      isEditing: false,
      repoIndexType: INDEX_TYPE_CODE,
      repoLink: '',
      branch: '',
      filesFilter: '',
      embeddingsModel: '',
      summarizationModel: '',
      files: [],
      csvSeparator: CSV_SEPARATORS[0].value,
      csvStartRow: 1,
      csvRowsPerDocument: 1,
      googleDoc: '',
      cql: '',
      jql: '',
      wikiQuery: '',
      wikiName: '',
      wiqlQuery: '',
      setting_id: '',
      enableCustomPrompts: false,
      promptTemplate: DEFAULT_DOCUMENTATION_PROMPT,
      guardrail_assignments: defaults?.guardrail_assignments ?? [],
      cronExpression: '',
      siteUrl: '',
      includePages: true,
      includeDocuments: true,
      includeLists: true,
      sharepointAuthType: SHAREPOINT_AUTH_TYPES.INTEGRATION,
      sharepointCustomClientId: '',
      sharepointTenantId: '',
      sharepointAccessToken: '',
      sharepointFilesFilter: '',
    },
    mode: 'onChange',
  })

  const resetInitFormValues = useCallback(() => {
    const providerFields = defaults?.provider_fields ?? {}
    const baseParams = providerFields.base_params ?? {}
    const createParams = providerFields.create_params ?? {}

    const mergedValues = {
      projectName: defaults?.project_name ?? defaultQueryProject ?? '',
      name: defaults?.repo_name ?? '',
      description: defaults?.description ?? '',
      projectSpaceVisible: defaults?.project_space_visible ?? true,
      indexType: getIndexTypeCode(defaults?.index_type) ?? INDEX_TYPES.GIT,
      reindexOnEdit: '',
      isEditing: true,

      repoIndexType: INDEX_TYPE_CODE,
      repoLink: defaults?.link ?? '',
      branch: defaults?.branch ?? '',
      filesFilter: defaults?.files_filter ?? '',
      embeddingsModel: defaults?.embeddings_model ?? '',
      summarizationModel: defaults?.summarization_model ?? '',

      files: [],
      csvSeparator: CSV_SEPARATORS[0].value,
      csvStartRow: 1,
      csvRowsPerDocument: 1,
      googleDoc: defaults?.google_doc_link ?? '',
      cql: defaults?.confluence?.cql ?? '',
      jql: defaults?.jira?.jql ?? defaults?.xray?.jql ?? '',
      wikiQuery: defaults?.azure_devops_wiki?.wiki_query ?? '',
      wikiName: defaults?.azure_devops_wiki?.wiki_name ?? '',
      wiqlQuery: defaults?.azure_devops_work_item?.wiql_query ?? '',
      siteUrl: defaults?.sharepoint?.site_url ?? '',
      includePages:
        defaults?.sharepoint?.include_pages !== undefined
          ? defaults.sharepoint.include_pages
          : true,
      includeDocuments:
        defaults?.sharepoint?.include_documents !== undefined
          ? defaults.sharepoint.include_documents
          : true,
      includeLists:
        defaults?.sharepoint?.include_lists !== undefined
          ? defaults.sharepoint.include_lists
          : true,
      sharepointAuthType: defaults?.sharepoint?.auth_type ?? SHAREPOINT_AUTH_TYPES.INTEGRATION,
      sharepointCustomClientId: defaults?.sharepoint?.oauth_client_id ?? '',
      sharepointTenantId: defaults?.sharepoint?.oauth_tenant_id ?? '',
      sharepointAccessToken: '',
      sharepointFilesFilter: defaults?.sharepoint?.files_filter ?? '',
      setting_id: defaults?.setting_id ?? '',
      enableCustomPrompts: !!defaults?.prompt,
      promptTemplate: defaults?.prompt ?? DEFAULT_DOCUMENTATION_PROMPT,
      guardrail_assignments: defaults?.guardrail_assignments ?? [],
      cronExpression: defaults?.cron_expression ?? '',

      ...baseParams,
      ...createParams,
    }

    reset(mergedValues)
  }, [defaultQueryProject, defaults, reset])

  useEffect(() => {
    if (!defaults.id) return
    resetInitFormValues()
  }, [defaults, resetInitFormValues])

  const [childSubmitHandlers, setChildSubmitHandlers] = useState<
    Array<(values?: FormValues) => Promise<boolean> | boolean>
  >([])

  const addSubmitHandler = useCallback(
    (handler: (values?: FormValues) => Promise<boolean> | boolean) => {
      setChildSubmitHandlers((handlers) => [...handlers, handler])
    },
    []
  )

  const removeSubmitHandler = useCallback(
    (handler: (values?: FormValues) => Promise<boolean> | boolean) => {
      setChildSubmitHandlers((handlers) => handlers.filter((h) => h !== handler))
    },
    []
  )

  return {
    control,
    errors,
    childSubmitHandlers,
    watch,
    register,
    setError,
    setValue,
    getValues,
    handleSubmit,
    addSubmitHandler,
    removeSubmitHandler,
    resetInitFormValues,
    clearErrors,
    formState,
    trigger,
  }
}
