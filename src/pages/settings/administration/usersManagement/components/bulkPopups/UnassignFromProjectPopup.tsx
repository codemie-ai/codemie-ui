import { yupResolver } from '@hookform/resolvers/yup'
import { FC } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'

import Popup from '@/components/Popup'
import ProjectSelector from '@/components/ProjectSelector'
import { userStore } from '@/store/user'
import { UserListItem } from '@/types/entity/user'

interface UnassignFromProjectPopupProps {
  isOpen: boolean
  selectedUsers: UserListItem[]
  onClose: () => void
  onSave: () => void
}

const schema = yup.object({
  project: yup.string().required('Project is required'),
})

type UnassignFromProjectFormData = yup.InferType<typeof schema>

const UnassignFromProjectPopup: FC<UnassignFromProjectPopupProps> = ({
  isOpen,
  selectedUsers,
  onClose,
  onSave,
}) => {
  const { control, handleSubmit } = useForm<UnassignFromProjectFormData>({
    defaultValues: { project: '' },
    resolver: yupResolver(schema),
    shouldUnregister: true,
  })

  const onSubmit = async (data: UnassignFromProjectFormData) => {
    const userIds = selectedUsers.map((user) => user.id)
    try {
      await userStore.bulkUnassignFromProject(userIds, data.project)
      onSave()
    } catch (error) {
      console.error('Failed to unassign users from project:', error)
    }
  }

  return (
    <Popup
      header="Unassign from Project"
      className="w-[500px]"
      submitText="Unassign"
      visible={isOpen}
      onHide={() => onClose()}
      onSubmit={handleSubmit(onSubmit)}
      withBorderBottom={false}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-primary">
          Unassign {selectedUsers.length} selected user(s) from a project
        </p>

        <Controller
          name="project"
          control={control}
          render={({ field, fieldState }) => (
            <ProjectSelector
              {...field}
              label="Project"
              multiple={false}
              selectDefault={false}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>
    </Popup>
  )
}

export default UnassignFromProjectPopup
