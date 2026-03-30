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
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as Yup from 'yup'

import Button from '@/components/Button'
import InfoBox from '@/components/form/InfoBox'
import Textarea, { TextareaRef } from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'

interface RefineWithAIPromptPopupProps {
  isVisible: boolean
  onHide: () => void
  onRefine: (prompt: string) => void
}

const formSchema = Yup.object({
  refine_prompt: Yup.string().trim(),
})

type FormSchema = Yup.InferType<typeof formSchema>

const RefineWithAIPromptPopup = ({ isVisible, onHide, onRefine }: RefineWithAIPromptPopupProps) => {
  const textareaRef = useRef<TextareaRef>(null)

  const { control, handleSubmit, reset } = useForm({
    mode: 'onSubmit',
    shouldUnregister: true,
    resolver: yupResolver(formSchema),
  })

  const handleHide = () => {
    reset()
    onHide()
  }

  const handleRefineClick = async (values: FormSchema) => {
    onRefine(values.refine_prompt ?? '')
    reset()
  }

  useEffect(() => {
    if (!isVisible) return

    const focusTimeout = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)

    // eslint-disable-next-line consistent-return
    return () => clearTimeout(focusTimeout)
  }, [isVisible])

  return (
    <Popup
      hideFooter
      dismissableMask={false}
      visible={isVisible}
      onHide={handleHide}
      className="w-[600px]"
      header="Refine Assistant with AI"
    >
      <div className="flex flex-col gap-4">
        <p className="text-text-quaternary">
          Optionally describe what you&apos;d like to improve or refine about this assistant. AI
          will analyze your configuration and suggest improvements.
        </p>

        <div>
          <p className="mb-2 mx-1">What would you like to improve? (Optional)</p>

          <InfoBox className="my-2 mx-1 items-center">
            Leave it empty or describe specific areas you&apos;d like to refine.
          </InfoBox>

          <Controller
            name="refine_prompt"
            control={control}
            render={({ field, fieldState }) => (
              <Textarea
                rows={6}
                error={fieldState.error?.message}
                placeholder="For example: Refine the Jira ticket-creation process by making the system prompt more structured, with clear steps for requirements analysis and well-formatted ticket output."
                aria-label="What would you like to improve? (Optional)"
                {...field}
                ref={textareaRef}
              />
            )}
          />
        </div>

        <div className="flex gap-4 justify-end my-4">
          <Button variant={ButtonType.SECONDARY} onClick={handleHide}>
            Cancel
          </Button>
          <Button variant={ButtonType.MAGICAL} onClick={handleSubmit(handleRefineClick)}>
            Refine with AI
          </Button>
        </div>
      </div>
    </Popup>
  )
}

export default RefineWithAIPromptPopup
