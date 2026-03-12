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

import { useCustomerSupport } from '@/components/CustomerSupportMessage/hooks/useCustomerSupport'

interface CustomerSupportMessageProps {
  message?: string
  className?: string
}

const CustomerSupportMessage: React.FC<CustomerSupportMessageProps> = ({
  message = 'for assistance',
  className = '',
}) => {
  const { isEnabled, settings } = useCustomerSupport()

  if (!isEnabled || !settings) {
    return null
  }

  return (
    <div className={className}>
      <p className="text-xs text-text-quaternary">
        Need help? <br />
        {settings.url && !settings.availableForExternal ? (
          <>
            Visit our{' '}
            <a
              href={settings.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-accent-status hover:text-text-accent-status-hover underline"
            >
              {settings.name ?? 'support page'}
            </a>{' '}
            {message}.
          </>
        ) : (
          <>Contact our support team {message}.</>
        )}
      </p>
    </div>
  )
}

export default CustomerSupportMessage
