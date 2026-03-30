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

import DynamicFieldsForm from '@/components/form/DynamicFieldsForm'
import { CustomNodeSchemaResponse } from '@/types/workflowEditor/configuration'

interface CustomNodeArgumentsFormProps {
  schema: CustomNodeSchemaResponse
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
  errors?: Record<string, string>
}

const CustomNodeArgumentsForm: React.FC<CustomNodeArgumentsFormProps> = ({
  schema,
  value,
  onChange,
  errors = {},
}) => {
  if (!schema?.config_schema) return null

  return (
    <DynamicFieldsForm
      schema={schema.config_schema}
      value={value}
      onChange={onChange}
      errors={errors}
      issuePathPrefix="config"
    />
  )
}

export default CustomNodeArgumentsForm
