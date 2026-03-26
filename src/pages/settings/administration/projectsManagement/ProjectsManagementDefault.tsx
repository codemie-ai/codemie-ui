import { FC } from 'react'
import { useSnapshot } from 'valtio'

import AdminToolsCard from '@/pages/settings/components/AdminToolsCard'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { userStore } from '@/store/user'

const ProjectsManagementDefault: FC = () => {
  const { user } = useSnapshot(userStore)

  const renderContent = () => {
    return (
      <div className="settings-cards flex flex-col gap-6 max-w-lg pt-8">
        {user?.isAdmin ? <AdminToolsCard /> : null}
      </div>
    )
  }

  return <SettingsLayout contentTitle="Projects management" content={renderContent()} />
}

export default ProjectsManagementDefault
