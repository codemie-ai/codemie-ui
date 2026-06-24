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
import { FC, useEffect } from 'react'
import { Resolver, useForm } from 'react-hook-form'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { awsVendorStore } from '@/store/vendor'
import { VendorAgentCoreEndpoint } from '@/types/entity/vendor'

import { IMPORT_MODES, ImportMode } from '../constants'
import ConfigurationJsonForm, { ConfigurationFormValues } from './ConfigurationJsonForm'
import {
  defaultFormValues,
  MODE_LABELS,
  parseConfigurationJson,
  schema,
  serializeToJson,
} from './importPopupUtils'

interface Props {
  settingId: string
  runtimeId: string
  endpoint: VendorAgentCoreEndpoint | null
  mode?: ImportMode
  onHide: () => void
  onSuccess: () => void
}

const AwsAgentCoreImportPopup: FC<Props> = ({
  settingId,
  runtimeId,
  endpoint,
  mode = IMPORT_MODES.INSTALL,
  onHide,
  onSuccess,
}) => {
  const { header, submit } = MODE_LABELS[mode]
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConfigurationFormValues>({
    resolver: yupResolver(schema) as Resolver<ConfigurationFormValues>,
    defaultValues: parseConfigurationJson(
      endpoint?.configurationJson,
      runtimeId,
      endpoint?.name ?? '',
      endpoint?.assistantName,
      endpoint?.assistantDescription
    ),
  })

  const streaming = watch('streaming')

  useEffect(() => {
    reset(
      parseConfigurationJson(
        endpoint?.configurationJson,
        runtimeId,
        endpoint?.name ?? '',
        endpoint?.assistantName,
        endpoint?.assistantDescription
      )
    )
  }, [
    endpoint?.configurationJson,
    endpoint?.name,
    endpoint?.assistantName,
    endpoint?.assistantDescription,
    runtimeId,
    reset,
  ])

  const handleHide = () => {
    reset(defaultFormValues)
    onHide()
  }

  const onSubmit = async (values: ConfigurationFormValues) => {
    if (!endpoint) return
    await awsVendorStore.importAgentCoreEndpoint(
      settingId,
      runtimeId,
      endpoint.name,
      serializeToJson(values),
      values.assistantName,
      values.assistantDescription
    )
    reset(defaultFormValues)
    onSuccess()
  }

  return (
    <Popup
      header={`${header}: ${endpoint?.name ?? ''}`}
      visible={!!endpoint}
      onHide={handleHide}
      footerContent={
        <div className="flex gap-2 justify-end">
          <Button type="secondary" onClick={handleHide} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {submit}
          </Button>
        </div>
      }
      className="w-[600px]"
    >
      <div className="flex flex-col gap-4 pb-2">
        <ConfigurationJsonForm control={control} errors={errors} streaming={streaming} />
      </div>
    </Popup>
  )
}

export default AwsAgentCoreImportPopup
