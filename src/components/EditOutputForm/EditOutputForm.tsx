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
import { FC, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'

import Button from '@/components/Button'
import Markdown from '@/components/markdown/Markdown'
import MdEditor from '@/components/MdEditor/MdEditor'
import Spinner from '@/components/Spinner'
import Tabs from '@/components/Tabs'
import { Tab } from '@/components/Tabs/Tabs'
import { ButtonType, ButtonSize } from '@/constants'
import toaster from '@/utils/toaster'

interface EditOutputFormProps {
  fetchOutput: () => Promise<string | null>
  updateOutput: (output: string) => Promise<{ message: string }>
  onCancel: () => void
  onUpdate: () => void
}

const validationSchema = yup.object({
  output: yup.string().required('Output cannot be blank'),
})

interface FormData {
  output: string
}

const EditOutputForm: FC<EditOutputFormProps> = ({
  fetchOutput,
  updateOutput,
  onCancel,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    mode: 'all',
    resolver: yupResolver(validationSchema),
    defaultValues: {
      output: '',
    },
  })

  const output = watch('output')

  useEffect(() => {
    const loadOutput = async () => {
      try {
        const fetchedOutput = (await fetchOutput()) ?? ''
        reset({ output: fetchedOutput })

        setTimeout(() => {
          setLoading(false)
        }, 150)
      } catch (error) {
        console.error('Error fetching output:', error)
        setLoading(false)
      }
    }

    loadOutput()
  }, [fetchOutput, reset])

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true)
    try {
      const response = await updateOutput(data.output)
      toaster.info(response.message)
      onUpdate()
    } catch (error) {
      console.error('Error updating output:', error)
      toaster.error('Failed to update output')
    } finally {
      setSaving(false)
    }
  })

  const tabs: Tab[] = [
    {
      id: 'raw',
      label: 'Raw',
      element: (
        <div className="flex flex-col h-full py-4">
          <Controller
            name="output"
            control={control}
            render={({ field }) => (
              <MdEditor
                value={field.value}
                onChange={field.onChange}
                className="grow rounded-xl border border-border-primary px-3 py-2 bg-surface-base-content"
              />
            )}
          />
          {errors.output && <p className="text-text-error text-sm mt-2">{errors.output.message}</p>}
        </div>
      ),
    },
    {
      id: 'markdown',
      label: 'Markdown',
      element: <Markdown content={output} className="-mt-1 font-geist-mono py-4" />,
    },
  ]

  if (loading) {
    return (
      <div className="flex justify-center my-4">
        <Spinner inline />
      </div>
    )
  }

  return (
    <form className="h-full flex flex-col">
      <Tabs
        tabs={tabs}
        className="min-h-0 overflow-hidden px-4 grow"
        tabClassName="overflow-auto min-h-0"
        headerClassName="mb-0"
      />
      <div className="flex justify-end gap-2 border-t border-border-secondary px-4 pt-4">
        <Button
          size={ButtonSize.MEDIUM}
          variant={ButtonType.SECONDARY}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button disabled={saving || !isDirty} onClick={onSubmit}>
          Save
        </Button>
      </div>
    </form>
  )
}

export default EditOutputForm
