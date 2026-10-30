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

import ExpandedYamlView from '@/components/ExpandedYaml/ExpandedYamlView'

interface YamlExpandedModalProps {
  visible: boolean
  value: string
  validationError: string | null
  onChange: (value: string) => void
  onCollapse: () => void
}

const YamlExpandedModal = ({
  visible,
  value,
  validationError,
  onChange,
  onCollapse,
}: YamlExpandedModalProps) => (
  <ExpandedYamlView
    visible={visible}
    onCollapse={onCollapse}
    title="yaml"
    wrap
    value={value}
    onChange={onChange}
    validationError={validationError}
  />
)

export default YamlExpandedModal
