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

import React from 'react'

import { Application } from '@/types/entity/application'

import ApplicationCard from './ApplicationCard'

interface ApplicationGridProps {
  applications: Application[]
  onOpenApplication: (application: Application) => void
}

const ApplicationGrid: React.FC<ApplicationGridProps> = ({ applications, onOpenApplication }) => {
  if (applications.length === 0) {
    return (
      <div className="flex justify-center m-40">
        <h2>No applications found.</h2>
      </div>
    )
  }

  return (
    <section className="min-w-80 grid auto-rows-min grid-cols-1 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3 gap-2.5 justify-items-center">
      {applications.map((application) => (
        <ApplicationCard
          key={application.slug}
          application={application}
          onOpenApplication={onOpenApplication}
        />
      ))}
    </section>
  )
}

export default ApplicationGrid
