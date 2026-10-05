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

import Button from '@/components/Button'
import { ButtonSize } from '@/constants'

interface CartSummaryProps {
  total: number
  className?: string
}

const CartSummary: React.FC<CartSummaryProps> = ({ total, className }) => (
  <div
    className={`flex items-center justify-between p-6 bg-background-secondary rounded-lg border border-border-default mt-4 ${
      className ?? ''
    }`}
  >
    <span className="text-xl font-semibold text-text-primary">Total: ${total.toFixed(2)}</span>
    <Button type="primary" size={ButtonSize.MEDIUM}>
      Proceed to Checkout
    </Button>
  </div>
)

export default CartSummary
