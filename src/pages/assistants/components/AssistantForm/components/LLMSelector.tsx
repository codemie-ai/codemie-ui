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

import { MultiSelect as PrimeMultiSelect } from 'primereact/multiselect'
import { useState, forwardRef, useEffect, useMemo, useImperativeHandle, useRef } from 'react'
import { useSnapshot } from 'valtio'

import MultiSelect from '@/components/form/MultiSelect'
import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'
import { appInfoStore } from '@/store/appInfo'

interface LLMSelectorProps {
  label?: string
  placeholder?: string
  className?: string
  value?: string
  hint?: string
  error?: string
  defaultOptionLabelPrefix?: string
  allowEmpty?: boolean
  onChange: (value: string) => void
}

const LLMSelector = forwardRef<
  { focus: () => void; scrollIntoView: (options: ScrollIntoViewOptions) => void },
  LLMSelectorProps
>(
  (
    {
      label,
      placeholder,
      className,
      value,
      onChange,
      allowEmpty,
      defaultOptionLabelPrefix = 'Default',
      hint,
      error,
    },
    ref
  ) => {
    const { llmModels, getLLMModels } = useSnapshot(appInfoStore)
    const [invalidModel, setInvalidModel] = useState<string | null>(null)
    const selectRef = useRef<PrimeMultiSelect>(null)

    useImperativeHandle(
      ref,
      () => ({
        focus: () => selectRef.current?.getElement()?.focus(),
        scrollIntoView: (options: ScrollIntoViewOptions) => {
          selectRef.current?.getElement()?.scrollIntoView(options)
        },
      }),
      []
    )

    const defaultLlmModel = useMemo(() => {
      const defaultModel = llmModels.find((model) => model.isDefault)
      const fallbackModel = llmModels[0]
      return defaultModel ?? fallbackModel ?? {}
    }, [llmModels])

    const options = useMemo(
      () => [
        ...(allowEmpty ? [{ label: placeholder, value: null }] : []),
        {
          label: `${defaultOptionLabelPrefix}: ${defaultLlmModel?.label}`,
          value: defaultLlmModel?.value,
        },
        ...llmModels.map(({ label, value }) => ({ label, value })),
      ],
      [llmModels]
    )

    useEffect(() => {
      getLLMModels()
    }, [])

    useEffect(() => {
      if (value) {
        const isValidModel = llmModels.some((model) => model.value === value)
        if (!isValidModel) onChange(defaultLlmModel?.value)
        setInvalidModel(isValidModel ? null : value)
      } else if (!allowEmpty) {
        onChange(defaultLlmModel?.value)
      }
    }, [defaultLlmModel?.value])

    useEffect(() => {
      if (invalidModel && value !== defaultLlmModel?.value) setInvalidModel(null)
    }, [value])

    return (
      <div className="flex flex-col gap-2 grow max-w-sm">
        <MultiSelect
          singleValue
          label={label}
          hint={hint}
          error={error}
          placeholder={placeholder}
          className={className}
          value={value}
          options={options}
          onChange={(e) => onChange(e.target.value)}
          onFilter={() => {}}
          ref={selectRef}
        />
        {invalidModel && (
          <InfoWarning
            type={InfoWarningType.WARNING}
            message={`Model ${invalidModel} is not valid and was reset to default`}
          />
        )}
      </div>
    )
  }
)

export default LLMSelector
