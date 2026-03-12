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

import { MultiSelectChangeEvent } from 'primereact/multiselect'
import React from 'react'
import { Controller } from 'react-hook-form'

import CopySvg from '@/assets/icons/copy.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import Input from '@/components/form/Input'
import MultiSelect from '@/components/form/MultiSelect'
import Textarea from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import { ButtonType, ButtonSize } from '@/constants'
import { MCPConfig, MCPConfigRequest, MCP_CATEGORY_OPTIONS } from '@/types/entity/mcp'

import { useMCPServerModal } from './useMCPServerModal'

interface MCPServerModalProps {
  visible: boolean
  server: MCPConfig | null
  onHide: () => void
  onSubmit: (data: Partial<MCPConfigRequest>) => Promise<void>
}

const MCPServerModal: React.FC<MCPServerModalProps> = (props) => {
  const {
    form,
    firstInputRef,
    variables,
    handleClose,
    handlePrettifyConfig,
    handleCopyConfig,
    handleAddVariable,
    handleVariableChange,
    handleRemoveVariable,
    onFormSubmit,
  } = useMCPServerModal(props)

  const {
    control,
    formState: { errors, isSubmitting },
  } = form

  // Custom footer with form actions
  const getSubmitButtonText = () => {
    if (isSubmitting) return 'Saving...'
    return props.server ? 'Update Server' : 'Create Server Configuration'
  }

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button
        variant={ButtonType.SECONDARY}
        size={ButtonSize.MEDIUM}
        onClick={handleClose}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        variant={ButtonType.PRIMARY}
        size={ButtonSize.MEDIUM}
        buttonType="submit"
        disabled={isSubmitting}
        onClick={onFormSubmit}
      >
        {getSubmitButtonText()}
      </Button>
    </div>
  )

  return (
    <Popup
      visible={props.visible}
      onHide={handleClose}
      header={props.server ? 'Edit MCP Server' : 'Add MCP Server'}
      footerContent={footerContent}
      className="w-[800px] max-w-[90vw]"
      bodyClassName="p-6 space-y-6 max-h-[70vh]"
    >
      <form onSubmit={onFormSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  ref={firstInputRef}
                  id="name"
                  label="Name:"
                  required
                  placeholder="Server Name"
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              name="icon_url"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="icon_url"
                  label="Icon URL:"
                  placeholder="https://example.com/icon.png"
                  error={errors.icon_url?.message}
                />
              )}
            />

            <Controller
              name="categories"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  id="categories"
                  name="categories"
                  label="Category:"
                  value={(field.value ?? []).filter((c): c is string => Boolean(c))}
                  options={MCP_CATEGORY_OPTIONS}
                  onChange={(e: MultiSelectChangeEvent) => field.onChange(e.value)}
                  placeholder="Development, AI, API"
                  size="small"
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="description"
                  label="Description:"
                  required
                  placeholder="Describe what this MCP server does"
                  rows={4}
                  error={errors.description?.message}
                />
              )}
            />
          </div>

          {/* Documentation */}
          <div className="space-y-4 pt-4 border-t border-border-structural">
            <h3 className="text-sm text-text-primary font-semibold">
              Documentation or Source Link
            </h3>

            <Controller
              name="server_home_url"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="server_home_url"
                  label="Link to MCP documentation:"
                  required
                  placeholder="https://example.com/docs"
                  error={errors.server_home_url?.message}
                />
              )}
            />

            <Controller
              name="source_url"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="source_url"
                  label="Link to Source code:"
                  placeholder="https://github.com/user/repo"
                  error={errors.source_url?.message}
                />
              )}
            />
          </div>

          {/* Server Configuration */}
          <div className="space-y-4 pt-4 border-t border-border-structural">
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-text-primary font-semibold">Server Configuration</h3>
              <div className="flex gap-2">
                <Button
                  variant={ButtonType.SECONDARY}
                  size={ButtonSize.SMALL}
                  onClick={handlePrettifyConfig}
                >
                  Prettify
                </Button>
                <Button
                  variant={ButtonType.SECONDARY}
                  size={ButtonSize.SMALL}
                  onClick={handleCopyConfig}
                >
                  <CopySvg className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Controller
              name="serverConfig"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="serverConfig"
                  label="Configuration JSON:"
                  required
                  placeholder={
                    '{\n  "command": "npx",\n  "args": ["@modelcontextprotocol/server-example"]\n}'
                  }
                  rows={10}
                  className="font-mono text-xs"
                  error={errors.serverConfig?.message}
                />
              )}
            />
          </div>

          {/* Environment Variables */}
          <div className="space-y-4 pt-4 border-t border-border-structural">
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-text-primary font-semibold">Environment Variables</h3>
              <Button
                variant={ButtonType.SECONDARY}
                size={ButtonSize.SMALL}
                onClick={handleAddVariable}
              >
                <PlusFilledSvg className="w-4 h-4" />
                Add Variable
              </Button>
            </div>

            {variables.length === 0 ? (
              <p className="text-text-quaternary text-sm">No environment variables defined</p>
            ) : (
              <div className="space-y-3">
                {variables.map((variable, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-start p-3 bg-surface-elevated rounded-lg"
                  >
                    <div className="flex-1 space-y-2">
                      <Input
                        value={variable.name}
                        onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                        placeholder="VARIABLE_NAME"
                        label="Name:"
                      />
                      <Input
                        value={variable.description || ''}
                        onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                        placeholder="Description"
                        label="Description:"
                      />
                      <Checkbox
                        checked={variable.required || false}
                        onChange={(e) => handleVariableChange(index, 'required', e)}
                        label="Required"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveVariable(index)}
                      className="p-2 hover:bg-failed-tertiary rounded transition-colors mt-6"
                      type="button"
                      aria-label="Remove variable"
                    >
                      <DeleteSvg className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </Popup>
  )
}

export default MCPServerModal
