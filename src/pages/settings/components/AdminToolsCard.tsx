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

import React, { useState } from 'react'

import PersonLaptopSvg from '@/assets/icons/person-laptop.svg?react'
import PlusIconSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'

import CreateNewProjectPopup from './CreateNewProject'
import InfoCard from './InfoCard'

const AdminToolsCard: React.FC = () => {
  const [showCreateProjectPopup, setShowCreateProjectPopup] = useState(false)

  const openCreateProjectPopup = () => {
    setShowCreateProjectPopup(true)
  }

  return (
    <InfoCard
      heading="Admin Tools"
      description="Create and manage projects within your workspace."
      icon={PersonLaptopSvg}
    >
      <Button type="primary" onClick={openCreateProjectPopup}>
        <PlusIconSvg />
        Create Project
      </Button>
      <CreateNewProjectPopup
        open={showCreateProjectPopup}
        onClose={() => setShowCreateProjectPopup(false)}
      />
    </InfoCard>
  )
}

export default AdminToolsCard
