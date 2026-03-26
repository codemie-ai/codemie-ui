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

import { FC, useState } from 'react'

import Popup from '@/components/Popup'
import ProjectSelector from '@/components/ProjectSelector/ProjectSelector'

interface AddProjectPopupProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (projectName: string) => void
}

const AddProjectPopup: FC<AddProjectPopupProps> = ({ isOpen, onClose, onAdd }) => {
  const [selectedProject, setSelectedProject] = useState<string>('')

  const handleSubmit = () => {
    if (selectedProject) {
      onAdd(selectedProject)
      setSelectedProject('')
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedProject('')
    onClose()
  }

  return (
    <Popup
      withBorderBottom={false}
      visible={isOpen}
      header="Add Project"
      className="w-[500px]"
      onHide={handleClose}
      onSubmit={handleSubmit}
      submitText="Add"
      submitDisabled={!selectedProject}
    >
      <div className="px-4 py-2">
        <ProjectSelector
          value={selectedProject}
          onChange={(value) => setSelectedProject(value as string)}
          multiple={false}
          fullWidth
        />
      </div>
    </Popup>
  )
}

export default AddProjectPopup
