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
import { CartItem as CartItemType } from '@/types/entity/shoppingCart'

interface CartItemProps {
  item: CartItemType
  onIncrease: (productId: string) => void
  onDecrease: (productId: string) => void
  onRemove: (productId: string) => void
  className?: string
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  onIncrease,
  onDecrease,
  onRemove,
  className,
}) => {
  const subtotal = (item.price * item.quantity).toFixed(2)

  return (
    <div
      className={`flex items-center gap-4 p-4 border border-border-default rounded-lg bg-background-primary ${
        className ?? ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-text-primary font-medium truncate">{item.name}</h3>
        <p className="text-text-secondary text-sm mt-0.5">${item.price.toFixed(2)} each</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onDecrease(item.productId)}
          aria-label={`Decrease quantity of ${item.name}`}
          className="w-8 h-8 flex items-center justify-center rounded border border-border-default text-text-primary hover:bg-background-hover transition-colors"
        >
          −
        </button>
        <span
          className="w-8 text-center text-text-primary font-medium"
          aria-label={`Quantity: ${item.quantity}`}
        >
          {item.quantity}
        </span>
        <button
          onClick={() => onIncrease(item.productId)}
          aria-label={`Increase quantity of ${item.name}`}
          className="w-8 h-8 flex items-center justify-center rounded border border-border-default text-text-primary hover:bg-background-hover transition-colors"
        >
          +
        </button>
      </div>

      <div className="w-24 text-right text-text-primary font-medium shrink-0">${subtotal}</div>

      <Button
        type="secondary"
        size={ButtonSize.SMALL}
        onClick={() => onRemove(item.productId)}
        aria-label={`Remove ${item.name} from cart`}
      >
        Remove
      </Button>
    </div>
  )
}

export default CartItem
