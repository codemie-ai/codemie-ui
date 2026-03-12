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

import React from 'react'
import { Control, Controller, useWatch } from 'react-hook-form'

import ExternalSvg from '@/assets/icons/external.svg?react'
import Autocomplete from '@/components/form/Autocomplete'
import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import Link from '@/components/Link'
import InfoMessage from '@/components/Message/Message'
import {
  CredentialComponentType,
  CredentialComponentPosition,
  CredentialFieldConfig,
} from '@/types/settingsUI'

import SettingFormMessage from '../SettingFormMessage/SettingFormMessage'

interface CredentialFieldsProps {
  control: Control
  credentialFields: Record<string, CredentialFieldConfig>
  buildWebhookURL?: (value: string) => string
  position?: CredentialComponentPosition
}

const CredentialFields: React.FC<CredentialFieldsProps> = ({
  control,
  credentialFields,
  buildWebhookURL,
  position = CredentialComponentPosition.fieldsSection,
}) => {
  const formValues = useWatch({ control })

  const getPlaceholder = (placeholder: any) => {
    if (typeof placeholder === 'function') {
      return placeholder(formValues)
    }
    return placeholder
  }

  const getLabel = (placeholder: any) => {
    const text = getPlaceholder(placeholder)
    const label = text.split(',')[0].split('(')[0].split('e.g.')[0].trim()
    return label.replace('Optional field', '').trim()
  }

  return (
    <>
      {Object.entries(credentialFields).map(([name, config]: [string, CredentialFieldConfig]) => {
        const {
          label,
          placeholder,
          type = CredentialComponentType.input,
          options = [],
          help,
          note,
          shouldShow,
          sensitive,
          rows,
          position: fieldPosition = CredentialComponentPosition.fieldsSection,
          message,
        } = config

        if (fieldPosition !== position) {
          return null
        }

        if (shouldShow && !shouldShow(formValues)) return null

        if (type === CredentialComponentType.message && message) {
          return <SettingFormMessage key={name} message={message} />
        }

        return (
          <Controller
            key={name}
            name={name}
            control={control}
            render={({ field, fieldState }) => {
              const { value } = field
              const error = fieldState.error?.message

              return (
                <div key={name} className="flex flex-col gap-2">
                  {type === CredentialComponentType.switch && (
                    <Switch
                      id={name}
                      value={value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      label={getPlaceholder(placeholder)}
                    />
                  )}

                  {type === CredentialComponentType.input && (
                    <Input
                      id={name}
                      name={name}
                      value={value}
                      error={error}
                      placeholder={getPlaceholder(placeholder)}
                      label={`${getLabel(label ?? placeholder)}:`}
                      sensitive={sensitive}
                      onChange={(e) => field.onChange(e.target.value)}
                      labelContent={
                        help && (
                          <Link
                            url={help}
                            label="Need help?"
                            variant="dimmed"
                            className="text-xs flex gap-2 items-center ml-auto w-fit"
                          >
                            Need help?
                            <ExternalSvg className="opacity-70" />
                          </Link>
                        )
                      }
                    />
                  )}

                  {note && buildWebhookURL && (
                    <InfoMessage>
                      {note} Full URL: {buildWebhookURL(formValues[name])}
                    </InfoMessage>
                  )}

                  {type === CredentialComponentType.textarea && (
                    <Textarea
                      id={name}
                      name={name}
                      value={value}
                      error={error}
                      placeholder={getPlaceholder(placeholder)}
                      label={`${getLabel(placeholder)}:`}
                      sensitive={sensitive}
                      rows={rows}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      {help && (
                        <div className="flex items-center gap-1">
                          <Link url={help} label="Need help?" className="text-xs">
                            <ExternalSvg className="opacity-70" />
                          </Link>
                        </div>
                      )}
                    </Textarea>
                  )}

                  {type === CredentialComponentType.select && (
                    <Autocomplete
                      id={name}
                      name={name}
                      value={value}
                      error={error}
                      placeholder={getPlaceholder(placeholder)}
                      label={`${getLabel(placeholder)}:`}
                      options={options}
                      onChange={field.onChange}
                    />
                  )}
                </div>
              )
            }}
          />
        )
      })}
    </>
  )
}

export default CredentialFields
