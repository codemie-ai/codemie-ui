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

import { useVueRouter } from '@/hooks/useVueRouter'
import { DataSource } from '@/types/entity/dataSource'

interface DataSourceNameProps {
  dataSource: DataSource
}

const DataSourceName = ({ dataSource }: DataSourceNameProps) => {
  const router = useVueRouter()
  const handleNavigationToDetails = () =>
    router.push({ name: 'data-source-details', params: { id: dataSource.id } })

  return (
    <span className="font-bold hover:underline cursor-pointer" onClick={handleNavigationToDetails}>
      {dataSource.repo_name}
    </span>
  )
}

export default DataSourceName
