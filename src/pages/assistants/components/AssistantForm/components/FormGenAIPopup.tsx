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
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as Yup from 'yup'

import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import InfoBox from '@/components/form/InfoBox'
import Switch from '@/components/form/Switch'
import Textarea, { TextareaRef } from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { assistantsStore } from '@/store'
import { AssistantAIGeneratedFields } from '@/types/entity/assistant'

interface GenWithAIPopupProps {
  isVisible: boolean
  onHide: () => void
  onGenerated?: (fields: AssistantAIGeneratedFields) => void
}

const formSchema = Yup.object({
  prompt: Yup.string().trim().required('Prompt is required'),
})

type FormSchema = Yup.InferType<typeof formSchema>

const FormGenAIPopup = ({ isVisible, onHide, onGenerated }: GenWithAIPopupProps) => {
  const textareaRef = useRef<TextareaRef>(null)
  const requestIdRef = useRef(0)

  const [isLoading, setIsLoading] = useState(false)
  const [isManual, setIsManual] = useState(!isVisible)
  const [isDontShowChecked, setIsDontShowChecked] = useState(false)
  const [shouldIncludeTools, setShouldIncludeTools] = useState(true)

  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm({
    mode: 'onSubmit',
    shouldUnregister: true,
    resolver: yupResolver(formSchema),
  })

  const handleHide = () => {
    requestIdRef.current += 1
    onHide?.()
    setTimeout(() => {
      setIsManual(true)
      setIsLoading(false)
    }, 500)
    if (isDontShowChecked) assistantsStore.setShowNewAssistantAIPopup(false)
  }

  const handleGenerateClick = async (values: FormSchema) => {
    requestIdRef.current += 1
    const currentRequestId = requestIdRef.current

    setIsLoading(true)
    const data = await assistantsStore.generateAssistantWithAI(values.prompt, shouldIncludeTools)
    if (currentRequestId !== requestIdRef.current) return

    handleHide()
    onGenerated?.(data)
  }

  useEffect(() => {
    if (isVisible) requestIdRef.current += 1

    const focusTimeout = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)

    return () => clearTimeout(focusTimeout)
  }, [isVisible])

  return (
    <Popup
      hideFooter
      dismissableMask={false}
      visible={isVisible}
      onHide={handleHide}
      className="w-[500px]"
      header="Generate Assistant with AI"
    >
      {isLoading && (
        <div className="flex justify-center mt-4 mb-12">
          <Spinner inline />
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-col gap-4">
          <p>
            Describe your ideal assistant, and AI will generate it for you with the most suitable
            instructions and tools for your needs.
          </p>

          <div>
            <p>What should your assistant do?</p>
            <Controller
              name="prompt"
              control={control}
              render={({ field, fieldState }) => (
                <Textarea
                  rows={8}
                  className="mt-2"
                  error={fieldState.error?.message}
                  placeholder="For example: I need a project assistant that helps track deadlines, work with Jira and help with business requirements..."
                  aria-label="What should your assistant do?"
                  {...field}
                  ref={textareaRef}
                />
              )}
            />
          </div>

          {!isManual && (
            <Checkbox
              checked={isDontShowChecked}
              onChange={setIsDontShowChecked}
              rootClassName="ml-auto"
              label="Do not show this popup"
            />
          )}
        </div>
      )}

      {shouldIncludeTools && !isLoading && (
        <InfoBox className="mt-4">Note: Please select tool integrations after generation</InfoBox>
      )}

      {!isLoading && (
        <div className="flex items-center my-4">
          <Switch
            value={shouldIncludeTools}
            disabled={isLoading}
            onChange={(e) => setShouldIncludeTools(!!e.target.checked)}
            label="Include tools"
          />
          <div className="flex gap-4 ml-auto">
            <Button type="secondary" onClick={handleHide}>
              {isManual ? 'Cancel' : 'Create Manualy'}
            </Button>
            <Button
              type="magical"
              disabled={!!errors.prompt?.message}
              onClick={handleSubmit(handleGenerateClick)}
            >
              Generate with AI
            </Button>
          </div>
        </div>
      )}
    </Popup>
  )
}

export default FormGenAIPopup
