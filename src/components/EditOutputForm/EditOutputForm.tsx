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
import { useForm, Controller } from 'react-hook-form'
import * as yup from 'yup'

import Button from '@/components/Button'
import Textarea from '@/components/form/Textarea'
import Markdown from '@/components/markdown/Markdown'
import Spinner from '@/components/Spinner'
import { ButtonType, ButtonSize } from '@/constants'
import toaster from '@/utils/toaster'

interface EditOutputFormProps {
  fetchOutput: () => Promise<string>
  updateOutput: (output: string) => Promise<unknown>
  onCancel: () => void
  onUpdate: () => void
}

const validationSchema = yup.object({
  request: yup.string().required('Required field'),
})

interface FormData {
  request: string
}

const EditOutputForm: FC<EditOutputFormProps> = ({
  fetchOutput,
  updateOutput,
  onUpdate,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true)
  const [originalOutput, setOriginalOutput] = useState('')
  const [changedOutput, setChangedOutput] = useState('')
  const [changesProposed, setChangesProposed] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      request: '',
    },
  })

  const request = watch('request')

  useEffect(() => {
    const loadOutput = async () => {
      try {
        const output = await fetchOutput()
        setOriginalOutput(output)
        setChangedOutput(output)
        setValue('request', output)

        setTimeout(() => {
          setLoading(false)
        }, 150)
      } catch (error) {
        console.error('Error fetching output:', error)
        setLoading(false)
      }
    }

    loadOutput()
  }, [fetchOutput, setValue])

  const onApproveChanges = async () => {
    try {
      await updateOutput(changedOutput)

      setChangesProposed(false)
      toaster.info('Output updated successfully')
      onUpdate()
    } catch (error) {
      console.error('Error updating output:', error)
    }
  }

  const handleApply = handleSubmit(async (data) => {
    setChangesProposed(true)
    setChangedOutput(data.request)
  })

  const onDeclineChanges = () => {
    setChangesProposed(false)
    setChangedOutput(originalOutput)
  }

  if (loading) {
    return (
      <div className="flex justify-center my-4">
        <Spinner inline />
      </div>
    )
  }

  if (changesProposed) {
    return (
      <div>
        <Textarea rows={8} value={request} disabled />
        <div className="flex justify-end gap-2 mt-4">
          <Button
            size={ButtonSize.MEDIUM}
            variant={ButtonType.SECONDARY}
            onClick={onDeclineChanges}
          >
            Cancel
          </Button>
          <Button onClick={onApproveChanges}>Save</Button>
        </div>
        <div className="font-semibold mt-4 mb-2">Changed Output</div>
        <Markdown content={changedOutput} />
      </div>
    )
  }

  return (
    <form>
      <Controller
        name="request"
        control={control}
        render={({ field }) => <Textarea {...field} rows={8} error={errors.request?.message} />}
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant={ButtonType.SECONDARY} size={ButtonSize.MEDIUM} onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleApply}>Apply</Button>
      </div>
      <div className="font-semibold mt-4 mb-2">Current Version</div>
      <Markdown content={originalOutput} />
    </form>
  )
}

export default EditOutputForm
