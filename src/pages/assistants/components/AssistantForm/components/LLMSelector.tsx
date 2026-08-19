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
import { useState, forwardRef, useEffect, useMemo, useImperativeHandle, useRef, FC } from 'react'
import { Link } from 'react-router'
import { useSnapshot } from 'valtio'

import MultiSelect from '@/components/form/MultiSelect'
import InfoWarning from '@/components/InfoWarning'
import { PREMIUM_MODEL_TOOLTIP } from '@/components/PremiumModelBadge'
import TooltipButton from '@/components/TooltipButton'
import { InfoWarningType } from '@/constants'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { HELP_MODELS_ROUTE } from '@/pages/help/ModelsCatalog'
import { appInfoStore } from '@/store/appInfo'
import { composeRowTooltip } from '@/utils/tooltipContent'

// Premium reads on a second line under the model name instead of a badge beside
// it, so the name keeps the row's full width. The row is the single tooltip
// anchor of its subtree, and its one content string says whatever the row cannot
// show: the full name while this narrow field truncates it, the rate sentence
// when the model is premium, both when both — the same composition the chat
// selector's rows use, so hovering a row behaves the same in either dropdown.
const LlmOptionRow: FC<{ label: string; isPremium: boolean }> = ({ label, isPremium }) => {
  const labelRef = useRef<HTMLSpanElement>(null)
  const isTruncated = useIsTruncated(labelRef)
  const content = composeRowTooltip([isTruncated && label, isPremium && PREMIUM_MODEL_TOOLTIP])

  return (
    <span
      data-testid="llm-option-row"
      className="flex w-full min-w-0 flex-col text-left"
      {...(content ? { 'data-tooltip-id': 'react-tooltip', 'data-tooltip-content': content } : {})}
    >
      <span ref={labelRef} className="min-w-0 truncate">
        {label}
      </span>
      {isPremium && (
        <span data-testid="llm-option-meta" className="truncate text-xs text-text-tertiary">
          <span className="text-aborted-primary">Premium</span>
        </span>
      )}
    </span>
  )
}

interface LLMSelectorProps {
  label?: string
  placeholder?: string
  className?: string
  value?: string
  hint?: string
  error?: string
  defaultOptionLabelPrefix?: string
  allowEmpty?: boolean
  modelType?: 'llm' | 'imageGeneration'
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
      modelType = 'llm',
      hint,
      error,
    },
    ref
  ) => {
    const { llmModels, imageGenerationModels, getLLMModels, getImageGenerationModels } =
      useSnapshot(appInfoStore)
    const [invalidModel, setInvalidModel] = useState<string | null>(null)
    const selectRef = useRef<PrimeMultiSelect>(null)

    const models = modelType === 'imageGeneration' ? imageGenerationModels : llmModels
    const loadModels = modelType === 'imageGeneration' ? getImageGenerationModels : getLLMModels

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
      const defaultModel = models.find((model) => model.isDefault)
      const fallbackModel = models[0]
      return defaultModel ?? fallbackModel ?? {}
    }, [models])

    const options = useMemo(
      () => [
        ...(allowEmpty ? [{ label: placeholder, value: '' }] : []),
        ...(!allowEmpty
          ? [
              {
                label: `${defaultOptionLabelPrefix}: ${defaultLlmModel?.label}`,
                value: defaultLlmModel?.value,
              },
            ]
          : []),
        ...models.map(({ label, value, isPremium }) => ({ label, value, isPremium })),
      ],
      [
        allowEmpty,
        defaultLlmModel?.label,
        defaultLlmModel?.value,
        defaultOptionLabelPrefix,
        models,
        placeholder,
      ]
    )

    useEffect(() => {
      loadModels()
    }, [loadModels])

    useEffect(() => {
      // While the model list has not loaded yet every stored model looks invalid, and the branch
      // below would wipe the form value via onChange(undefined). That write uses shouldDirty: false
      // and does not repaint the field, so the UI kept showing the model while the form no longer
      // had it, and saving the assistant failed with 422 "llm_model_type is required".
      if (!models.length) return
      if (value) {
        const isValidModel = models.some((model) => model.value === value)
        if (!isValidModel) onChange(allowEmpty ? '' : defaultLlmModel?.value)
        setInvalidModel(isValidModel ? null : value)
      } else if (!allowEmpty) {
        onChange(defaultLlmModel?.value)
      }
    }, [allowEmpty, defaultLlmModel?.value, models, onChange, value])

    useEffect(() => {
      if (invalidModel && value !== defaultLlmModel?.value) setInvalidModel(null)
    }, [defaultLlmModel?.value, invalidModel, value])

    const renderOption = (option: { label: string; isPremium?: boolean } | undefined) => {
      if (!option) return null
      return <LlmOptionRow label={option.label} isPremium={option.isPremium ?? false} />
    }

    // The trigger no longer says "Premium" inline: in a ~380px panel that pill
    // cost ~130px and truncated the model name. Premium reads as a note under the
    // field instead, so the value keeps the trigger's full width. The badge is
    // gone, and with it the `selectedItemTemplate` that existed to place it;
    // PrimeReact's default value rendering already handles both the selected
    // label and the empty/placeholder case.
    //
    // The note is deliberately quiet: an amber ring on the control read as a
    // validation error and a bare amber "Premium" beneath it read as its error
    // message. Naming the state and hanging the explanation off the same
    // TooltipButton the form uses for field hints says the same thing without
    // borrowing the error vocabulary.
    const isPremiumSelected = value
      ? models.find((model) => model.value === value)?.isPremium ?? false
      : false

    return (
      <div className="flex flex-col gap-2 grow">
        <MultiSelect
          singleValue
          label={label}
          hint={hint}
          error={error}
          placeholder={placeholder}
          className={className}
          value={value}
          options={options}
          onChange={(e) => onChange(e.target.value ?? '')}
          onFilter={() => {}}
          renderOption={renderOption}
          ref={selectRef}
        />
        {isPremiumSelected && (
          // The info button is the surface's single premium tooltip anchor (Task 5):
          // the note text beside it must not anchor as well, or the two nest.
          <div className="flex items-center self-start text-xs text-text-quaternary">
            <span data-testid="llm-selector-premium-note">Premium model</span>
            <TooltipButton className="ml-1" content={PREMIUM_MODEL_TOOLTIP} iconClassName="h-4" />
            {/* Visible text, not tooltip-only content: a link that only appears on
                hover cannot be tabbed to, and tooltips now close on scroll. The
                styling matches `ChatPremiumModelTip` so both premium surfaces read
                the same. It anchors nothing — the info button above stays the one
                premium tooltip anchor on this surface. */}
            <span className="ml-1">·</span>
            <Link
              to={HELP_MODELS_ROUTE}
              className="ml-1 text-aborted-primary hover:text-aborted-primary/80 underline transition-colors"
            >
              View models and rates
            </Link>
          </div>
        )}
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
