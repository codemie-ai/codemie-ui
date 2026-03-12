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
import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import * as Yup from 'yup'

import Autocomplete from '@/components/form/Autocomplete'
import Input from '@/components/form/Input'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { assistantEnvVariables } from '@/constants/assistants'
import { assistantsStore } from '@/store/assistants'
import { Assistant } from '@/types/entity/assistant'

interface ExportAssistantPopupProps {
  visible: boolean
  onHide: () => void
  assistant: Assistant | null
}

interface FormValues {
  [key: string]: string
}

const schema = Yup.object(
  assistantEnvVariables.reduce(
    (result, item) => ({
      ...result,
      [item.formKey]: item.required ? Yup.string().required() : Yup.string(),
    }),
    {}
  )
)

const ExportAssistantPopup: React.FC<ExportAssistantPopupProps> = ({
  visible,
  onHide,
  assistant,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: assistantEnvVariables.reduce(
      (result, item) => ({
        ...result,
        [item.formKey]: item.defaultValue ?? '',
      }),
      {} as FormValues
    ),
  })

  const exportAssistant = async (values: FormValues) => {
    if (!assistant) return

    const envFile = assistantEnvVariables.reduce(
      (result, item) => ({
        ...result,
        [item.apiKey]: values[item.formKey],
      }),
      {} as Record<string, string>
    )

    try {
      const blob = await assistantsStore.exportAssistant(assistant.id, envFile)
      onHide()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${assistant.name}.tar`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting assistant:', error)
    }
  }

  const onSubmit = handleSubmit(exportAssistant)

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header="Export Assistant"
      submitText="Export Assistant"
      submitButtonType={ButtonType.PRIMARY}
      onSubmit={onSubmit}
      className="w-[75%] max-w-[800px]"
      bodyClassName="overflow-y-auto"
    >
      <h3 className="text-xl mb-3 text-text-primary">
        Please fill in the environment variables for your deployment
      </h3>
      <div className="flex flex-col gap-3">
        {assistantEnvVariables.map((field) => (
          <Controller
            key={field.formKey}
            name={field.formKey}
            control={control}
            render={({ field: fieldProps }) => {
              if (field.options) {
                return (
                  <Autocomplete
                    {...fieldProps}
                    name={field.formKey}
                    label={field.formLabel}
                    options={field.options}
                    error={errors[field.formKey]?.message}
                  />
                )
              }
              return (
                <Input
                  {...fieldProps}
                  name={field.formKey}
                  label={field.formLabel}
                  error={errors[field.formKey]?.message}
                />
              )
            }}
          />
        ))}
      </div>
    </Popup>
  )
}

export default ExportAssistantPopup
