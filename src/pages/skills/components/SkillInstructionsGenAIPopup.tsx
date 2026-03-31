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
import Textarea, { TextareaRef } from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { skillsStore } from '@/store/skills'

const validationSchema = Yup.object({
  prompt: Yup.string().trim(),
})

interface SkillInstructionsGenAIPopupProps {
  isVisible: boolean
  existingContent: string
  onHide: () => void
  onGenerated: (content: string) => void
}

const SkillInstructionsGenAIPopup = ({
  isVisible,
  existingContent,
  onHide,
  onGenerated,
}: SkillInstructionsGenAIPopupProps) => {
  const textareaRef = useRef<TextareaRef>(null)
  const requestIdRef = useRef(0)

  const [isLoading, setIsLoading] = useState(false)

  const {
    control,
    formState: { errors },
    handleSubmit,
    getValues,
  } = useForm({
    mode: 'onSubmit',
    shouldUnregister: true,
    resolver: yupResolver(validationSchema),
    defaultValues: {
      prompt: '',
    },
  })

  const handleHide = () => {
    requestIdRef.current += 1
    onHide()
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  const onFormSubmit = async () => {
    requestIdRef.current += 1
    const currentRequestId = requestIdRef.current

    setIsLoading(true)
    try {
      const result = await skillsStore.generateSkillInstructionsWithAI(
        getValues('prompt') ?? '',
        existingContent
      )

      if (currentRequestId !== requestIdRef.current) return

      handleHide()
      onGenerated(result.instructions)
    } catch (error) {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isVisible) requestIdRef.current += 1

    const focusTimeout = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)

    return () => clearTimeout(focusTimeout)
  }, [isVisible])

  const isRefinementMode = Boolean(existingContent)
  const submitText = isRefinementMode ? 'Refine with AI' : 'Generate with AI'

  const header = isRefinementMode
    ? 'Refine Skill Instructions with AI'
    : 'Generate Skill Instructions with AI'

  const description = isRefinementMode
    ? 'Add details, comments, or suggestions to enhance your existing instructions. You may also leave this blank to generate an improved structured version.'
    : 'Describe what this skill should help the assistant accomplish, and the AI will generate structured instructions for you.'

  const placeholder = isRefinementMode
    ? 'For example: I need to improve the skill instructions to include more detailed examples, better error handling patterns, and clearer step-by-step guidance.'
    : 'For example: This skill helps with code review by analyzing code structure, identifying potential issues, and providing constructive feedback with best practices...'

  const ariaLabel = isRefinementMode
    ? 'Add details, comments, or suggestions'
    : 'Describe what this skill should help the assistant accomplish'

  return (
    <Popup
      hideFooter
      visible={isVisible}
      submitText={submitText}
      dismissableMask={false}
      header={header}
      className="w-[500px]"
      footerClassName="border-t-0"
      onHide={handleHide}
    >
      {isLoading ? (
        <Spinner inline className="mb-8" />
      ) : (
        <>
          <p>{description}</p>
          <Controller
            name="prompt"
            control={control}
            render={({ field, fieldState }) => (
              <Textarea
                rows={8}
                className="mt-4 resize-none"
                error={fieldState.error?.message}
                placeholder={placeholder}
                aria-label={ariaLabel}
                {...field}
                ref={textareaRef}
              />
            )}
          />

          <div className="flex gap-4 justify-end my-4">
            <Button onClick={handleHide} variant={ButtonType.SECONDARY}>
              Cancel
            </Button>
            <Button
              variant={ButtonType.MAGICAL}
              disabled={!!errors.prompt?.message}
              onClick={handleSubmit(onFormSubmit)}
            >
              {submitText}
            </Button>
          </div>
        </>
      )}
    </Popup>
  )
}

export default SkillInstructionsGenAIPopup
