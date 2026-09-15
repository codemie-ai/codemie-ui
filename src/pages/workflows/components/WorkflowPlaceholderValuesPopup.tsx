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

import { FC, useRef, useCallback, useState, useEffect } from 'react'

import Input from '@/components/form/Input'
import Popup from '@/components/Popup'
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'

interface WorkflowPlaceholderValuesPopupProps {
  visible: boolean
  placeholders: string[]
  error?: string | null
  onSubmit: (values: Record<string, string>) => void | Promise<void>
  onHide: () => void
}

const WorkflowPlaceholderValuesPopup: FC<WorkflowPlaceholderValuesPopupProps> = ({
  visible,
  placeholders,
  error,
  onSubmit,
  onHide,
}) => {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(placeholders.map((k) => [k, '']))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const firstInputRef = useRef<HTMLInputElement>(null)
  useFocusOnVisible(firstInputRef, visible)

  const placeholdersKey = placeholders.join('\0')
  useEffect(() => {
    setValues(Object.fromEntries(placeholders.map((k) => [k, ''])))
    setErrors({})
    submittingRef.current = false
    setIsSubmitting(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholdersKey, visible])

  const handleChange = useCallback(
    (key: string, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }))
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
    },
    [errors]
  )

  const handleHide = useCallback(() => {
    if (!visible) return
    setValues(Object.fromEntries(placeholders.map((k) => [k, ''])))
    setErrors({})
    onHide()
  }, [placeholders, onHide, visible])

  const handleApply = useCallback(async () => {
    if (submittingRef.current) return
    const newErrors: Record<string, string> = {}
    for (const key of placeholders) {
      if (!values[key]?.trim()) newErrors[key] = 'Required'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const trimmedValues = Object.fromEntries(
        placeholders.map((key) => [key, (values[key] ?? '').trim()])
      )
      await onSubmit(trimmedValues)
    } catch {
      // Parent surfaces the error; finally re-enables Apply for retry.
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }, [placeholders, values, onSubmit])

  return (
    <Popup
      dismissableMask={false}
      visible={visible}
      header="Configure Template Variables"
      onHide={handleHide}
      onSubmit={handleApply}
      submitText="Apply"
      submitDisabled={isSubmitting}
      limitWidth
      bodyClassName="pb-4"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          This template uses placeholder variables. Provide a value for each before creating the
          workflow.
        </p>
        {error && (
          <div role="alert" className="text-text-error text-sm">
            {error}
          </div>
        )}
        {placeholders.map((key, idx) => (
          <Input
            key={key}
            id={key}
            ref={idx === 0 ? firstInputRef : undefined}
            name={key}
            label={key}
            value={values[key] ?? ''}
            onChange={(e) => handleChange(key, e.target.value)}
            required
            error={errors[key]}
          />
        ))}
      </div>
    </Popup>
  )
}

export default WorkflowPlaceholderValuesPopup
