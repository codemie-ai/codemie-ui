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

import React, { useCallback } from 'react'
import { useSnapshot } from 'valtio'

import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Spinner from '@/components/Spinner'
import { shoppingCartStore } from '@/store/shoppingCart'

import CartItem from './components/CartItem'
import CartSummary from './components/CartSummary'

const ShoppingCartPage: React.FC = () => {
  const { items, loading, error, total } = useSnapshot(shoppingCartStore)

  const handleIncrease = useCallback((productId: string) => {
    shoppingCartStore.increaseQuantity(productId)
  }, [])

  const handleDecrease = useCallback((productId: string) => {
    shoppingCartStore.decreaseQuantity(productId)
  }, [])

  const handleRemove = useCallback((productId: string) => {
    shoppingCartStore.removeFromCart(productId)
  }, [])

  const renderContent = () => {
    if (loading && items.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      )
    }
    if (error) {
      return <p className="text-text-error p-4">{error}</p>
    }
    if (items.length === 0) {
      return (
        <div
          className="flex flex-col items-center justify-center h-64 gap-2 text-text-secondary"
          role="status"
          aria-label="Shopping cart is empty"
        >
          <p className="text-lg">Your cart is empty.</p>
          <p className="text-sm">Browse products to add items to your cart.</p>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <CartItem
            key={item.productId}
            item={item}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            onRemove={handleRemove}
          />
        ))}
        <CartSummary total={total} />
      </div>
    )
  }

  return <PageLayout title="Shopping Cart">{renderContent()}</PageLayout>
}

export default ShoppingCartPage
