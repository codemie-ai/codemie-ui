// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import Select from '@/components/form/Select'
import { PREMIUM_MODEL_TOOLTIP } from '@/components/PremiumModelBadge'
import TooltipButton from '@/components/TooltipButton'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { HELP_MODELS_ROUTE } from '@/pages/help/ModelsCatalog'
import { ModelOption } from '@/types/entity/configuration'
import { FilterOption } from '@/types/filters'

const DefaultModelOptionRow: FC<{ label: string; isPremium: boolean }> = ({ label, isPremium }) => {
  const labelRef = useRef<HTMLSpanElement>(null)
  const isTruncated = useIsTruncated(labelRef)

  return (
    <span
      data-testid="default-model-option-row"
      className="flex w-full min-w-0 flex-col px-2.5 py-1.5 text-left"
      {...(isTruncated
        ? { 'data-tooltip-id': 'react-tooltip', 'data-tooltip-content': label }
        : {})}
    >
      <span ref={labelRef} className="min-w-0 truncate">
        {label}
      </span>
      {isPremium && (
        <span
          data-testid="default-model-option-meta"
          className="truncate text-xs text-text-tertiary"
        >
          <span className="text-aborted-primary">Premium</span>
        </span>
      )}
    </span>
  )
}

const renderDefaultModelOption = (option: FilterOption) => (
  <DefaultModelOptionRow label={option.label} isPremium={option.isPremium ?? false} />
)

const findIsPremium = (models: ModelOption[], value: string): boolean =>
  models.find((model) => model.value === value)?.isPremium ?? false

const PremiumSelectionNote: FC<{ testId: string }> = ({ testId }) => (
  <div className="mt-1 flex items-center self-start text-xs text-text-quaternary">
    <span data-testid={testId}>Premium model</span>
    <TooltipButton className="ml-1" content={PREMIUM_MODEL_TOOLTIP} iconClassName="h-4" />
    <span className="ml-1">·</span>
    <Link
      to={HELP_MODELS_ROUTE}
      className="ml-1 text-aborted-primary hover:text-aborted-primary/80 underline transition-colors"
    >
      View models and rates
    </Link>
  </div>
)

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
    () =>
      models.map((model) => ({
        label: model.label,
        value: model.value,
        isPremium: model.isPremium,
      })),
    [models]
  )

  const isDefaultModelPremium = useMemo(
    () => findIsPremium(models, localDefaultModel),
    [models, localDefaultModel]
  )
  const isCodeDefaultModelPremium = useMemo(
    () => findIsPremium(models, localCodeDefaultModel),
    [models, localCodeDefaultModel]
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
          itemTemplate={renderDefaultModelOption}
          placeholder="Select a model"
          rootClassName="w-full"
        />
        {defaultModelError && <p className="mt-1 text-xs text-text-error">{defaultModelError}</p>}
        {isDefaultModelPremium && (
          <PremiumSelectionNote testId="project-default-model-premium-note" />
        )}
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
          itemTemplate={renderDefaultModelOption}
          placeholder="Select a model"
          rootClassName="w-full"
        />
        {codeDefaultModelError && (
          <p className="mt-1 text-xs text-text-error">{codeDefaultModelError}</p>
        )}
        {isCodeDefaultModelPremium && (
          <PremiumSelectionNote testId="cli-default-model-premium-note" />
        )}
      </div>
    </div>
  )
}

export default DefaultModelsSelector
