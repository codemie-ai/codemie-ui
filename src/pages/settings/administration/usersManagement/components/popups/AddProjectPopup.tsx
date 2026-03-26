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
