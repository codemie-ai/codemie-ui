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

type EmptyListProps = {
  colSpan: number
  content?: React.ReactNode
}

const EmptyList: React.FC<EmptyListProps> = ({ colSpan, content = 'No data available' }) => {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="text-h4 text-text-quaternary px-4 py-2 text-center bg-surface-base-secondary border-b border-l border-r border-border-structural font-bold rounded-bl-lg rounded-br-lg"
      >
        <div className="py-5">
          <div className="sticky left-1/2 -translate-x-1/2 w-fit">{content}</div>
        </div>
      </td>
    </tr>
  )
}

export default EmptyList
