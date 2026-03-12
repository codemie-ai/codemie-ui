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
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useForm, Controller } from 'react-hook-form'

import VisualizeSvg from '@/assets/icons/vizualize.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import GuardrailAssignmentPanel from '@/components/guardrails/GuardrailAssignmentPanel/GuardrailAssignmentPanel'
import ProjectSelector from '@/components/ProjectSelector'
import Spinner from '@/components/Spinner'
import ZoomableImage from '@/components/ZoomableImage'
import { ButtonType } from '@/constants/index'
import { YAML_PLACEHOLDER } from '@/constants/workflows'
import { workflowsStore } from '@/store/workflows'
import { GuardrailEntity } from '@/types/entity/guardrail'

import WorkflowConfigField from './WorkflowConfigField'
import { WorkflowFormValuesWithYaml, workflowSchema } from './workflowSchema'

export interface WorkflowFormFieldsRef {
  isValid: boolean
  triggerValidation: () => Promise<boolean>
  getValues: () => any
}

interface WorkflowFormFieldsProps {
  onlyConfiguration?: boolean
  hideConfiguration?: boolean
  workflow?: any
  isEditing?: boolean
  mode?: string
  onSubmit?: (values: any, goBack?: boolean) => void
  onValidityChange?: (isValid: boolean) => void
}

const WorkflowFormFields = forwardRef<WorkflowFormFieldsRef, WorkflowFormFieldsProps>(
  (
    {
      onlyConfiguration = false,
      hideConfiguration = false,
      workflow = {},
      isEditing = false,
      mode = 'Sequential',
      onSubmit,
      onValidityChange,
    },
    ref
  ) => {
    const [isLoadingSchema, setIsLoadingSchema] = useState(false)
    const [schemaImage, setSchemaImage] = useState<string | null>(null)

    const {
      control,
      formState,
      formState: { errors, isValid },
      watch,
      trigger,
      getValues,
    } = useForm<WorkflowFormValuesWithYaml>({
      resolver: yupResolver(workflowSchema) as any,
      mode: 'all',
      defaultValues: {
        name: workflow?.name || '',
        description: workflow?.description || '',
        yaml_config: workflow?.yaml_config ?? YAML_PLACEHOLDER,
        icon_url: workflow?.icon_url || '',
        shared: workflow?.shared ?? false,
        project: workflow?.project || '',
        guardrail_assignments: workflow?.guardrail_assignments ?? [],
      },
    })

    const values = watch()

    useEffect(() => {
      onValidityChange?.(isValid)
    }, [isValid, onValidityChange])

    useImperativeHandle(ref, () => ({
      isValid,
      triggerValidation: () => trigger(),
      getValues: () => getValues(),
    }))

    const generateDiagram = async () => {
      setIsLoadingSchema(true)
      setSchemaImage('')

      const payload = {
        ...values,
        mode,
      }

      try {
        const response = await workflowsStore.getWorkflowDiagram(payload)
        if (schemaImage) {
          URL.revokeObjectURL(schemaImage)
        }
        const json = await response.json()
        setSchemaImage(json.data)
      } catch (error) {
        // Error is already handled by API interceptor via toaster
        console.error('Failed to generate workflow diagram:', error)
      } finally {
        setIsLoadingSchema(false)
      }
    }

    const handleRestore = (updatedWorkflow: any) => {
      if (onSubmit) {
        onSubmit(updatedWorkflow)
      }
    }
    return (
      <div className="flex flex-col mx-auto gap-6 py-6 max-w-5xl">
        {!onlyConfiguration && !hideConfiguration && (
          <div className="flex flex-col gap-1">
            <h4 className="font-semibold">Workflow Setup</h4>
            <p className="text-sm text-text-quaternary">
              Define the workflow&apos;s name, project, visibility, and configuration.
            </p>
          </div>
        )}

        {!onlyConfiguration && (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row flex-wrap items-center gap-4">
                <Controller
                  name="project"
                  control={control}
                  render={({ field }) => (
                    <ProjectSelector
                      label="Project name:"
                      className="grow max-w-full"
                      value={field.value ?? ''}
                      onChange={(value) => field.onChange(value)}
                    />
                  )}
                />
                <div className="justify-end w-fit mt-4">
                  <Controller
                    name="shared"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="shared"
                        label="Shared with Project Team"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    id="name"
                    label="Name:"
                    placeholder="Name*"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Controller
                name="description"
                control={control}
                render={({ field, fieldState }) => (
                  <Textarea
                    id="description"
                    placeholder="Description"
                    label="Description"
                    rows={4}
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
            </div>

            <GuardrailAssignmentPanel
              project={values.project!}
              entityType={GuardrailEntity.WORKFLOW}
              control={control}
              formState={formState}
              trigger={trigger}
              getValues={getValues}
            />

            <div className="flex flex-col gap-2">
              <Controller
                name="icon_url"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    id="icon_url"
                    placeholder="Icon URL"
                    label="Icon URL"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
            </div>
          </>
        )}

        {!hideConfiguration && (
          <>
            <Controller
              name="yaml_config"
              control={control}
              render={({ field }) => (
                <WorkflowConfigField
                  value={field.value}
                  onChange={field.onChange}
                  workflow={workflow}
                  history={workflow?.yaml_config_history || []}
                  onlyConfiguration={onlyConfiguration}
                  isEditing={isEditing}
                  onRestore={handleRestore}
                />
              )}
            />

            <div className="my-1"></div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm">Workflow visualisation</div>
                <Button
                  disabled={isLoadingSchema || !!errors.yaml_config}
                  variant={ButtonType.SECONDARY}
                  size="medium"
                  onClick={generateDiagram}
                >
                  <VisualizeSvg />
                  Visualize
                </Button>
              </div>

              <div className="flex flex-col items-center justify-center bg-surface-base-secondary w-full border border-border-specific-panel-outline rounded-xl min-h-48">
                {isLoadingSchema && <Spinner inline />}

                {!isLoadingSchema && schemaImage && (
                  <div className="w-full px-3 py-2">
                    <ZoomableImage>
                      <img
                        src={schemaImage}
                        alt="Workflow Diagram"
                        className="w-full h-auto max-h-[500px] object-contain"
                      />
                    </ZoomableImage>
                  </div>
                )}

                {!isLoadingSchema && !schemaImage && (
                  <>
                    <VisualizeSvg className="scale-125 mb-3 opacity-65" />
                    <div className="text-md text-text-secondary">Workflow visualisation</div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }
)

WorkflowFormFields.displayName = 'WorkflowFormFields'

export default WorkflowFormFields
