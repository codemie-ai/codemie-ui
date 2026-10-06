// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, useEffect, useMemo, useState } from 'react'

import Select from '@/components/form/Select'
import { ModelOption } from '@/types/entity/configuration'

interface DefaultModelsSelectorProps {
  models: ModelOption[]
  defaultModel: string
  onDefaultChange: (model: string) => void
  codeDefaultModel: string
  onCodeDefaultChange: (model: string) => void
  defaultModelError?: string
  codeDefaultModelError?: string
}

const DefaultModelsSelector: FC<DefaultModelsSelectorProps> = ({
  models,
  defaultModel,
  onDefaultChange,
  codeDefaultModel,
  onCodeDefaultChange,
  defaultModelError,
  codeDefaultModelError,
}) => {
  const [localDefaultModel, setLocalDefaultModel] = useState(defaultModel)
  const [localCodeDefaultModel, setLocalCodeDefaultModel] = useState(codeDefaultModel)

  // Preserve current values when component mounts
  useEffect(() => {
    setLocalDefaultModel(defaultModel)
  }, [defaultModel])

  useEffect(() => {
    setLocalCodeDefaultModel(codeDefaultModel)
  }, [codeDefaultModel])

  const modelOptions = useMemo(
    () => models.map((model) => ({ label: model.label, value: model.value })),
    [models]
  )

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-structural bg-surface-base-secondary p-4 md:flex-row md:gap-6">
      <div className="flex-1">
        <label
          htmlFor="project-default-model"
          className="mb-2 block text-xs font-medium text-text-quaternary"
        >
          Project default model
        </label>
        <Select
          id="project-default-model"
          value={localDefaultModel}
          onChangeValue={(value) => {
            if (value) {
              setLocalDefaultModel(value)
              onDefaultChange(value)
            }
          }}
          options={modelOptions}
          placeholder="Select a model"
          rootClassName="w-full"
        />
        {defaultModelError && <p className="mt-1 text-xs text-text-error">{defaultModelError}</p>}
      </div>
      <div className="flex-1">
        <label
          htmlFor="cli-default-model"
          className="mb-2 block text-xs font-medium text-text-quaternary"
        >
          CLI default model
        </label>
        <Select
          id="cli-default-model"
          value={localCodeDefaultModel}
          onChangeValue={(value) => {
            if (value) {
              setLocalCodeDefaultModel(value)
              onCodeDefaultChange(value)
            }
          }}
          options={modelOptions}
          placeholder="Select a model"
          rootClassName="w-full"
        />
        {codeDefaultModelError && (
          <p className="mt-1 text-xs text-text-error">{codeDefaultModelError}</p>
        )}
      </div>
    </div>
  )
}

export default DefaultModelsSelector
