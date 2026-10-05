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

import { proxy } from 'valtio'

import { CART_MESSAGES } from '@/constants/shoppingCart'
import { productsStore } from '@/store/products'
import { CartItem } from '@/types/entity/shoppingCart'
import { clearCartStorage, loadCartFromStorage, saveCartToStorage } from '@/utils/cartStorage'
import toaster from '@/utils/toaster'

interface ShoppingCartStoreType {
  items: CartItem[]
  loading: boolean
  error: string | null
  readonly total: number
  addToCart: (productId: string) => Promise<void>
  increaseQuantity: (productId: string) => void
  decreaseQuantity: (productId: string) => void
  removeFromCart: (productId: string) => void
  loadCart: () => void
  saveCart: () => void
  clearCart: () => void
}

export const shoppingCartStore = proxy<ShoppingCartStoreType>({
  items: loadCartFromStorage(),
  loading: false,
  error: null,

  get total(): number {
    return this.items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)
  },

  async addToCart(productId) {
    const existing = this.items.find((item) => item.productId === productId)
    if (existing) {
      existing.quantity += 1
      this.saveCart()
      return
    }

    this.loading = true
    this.error = null
    try {
      const product = await productsStore.fetchProductById(productId)
      if (!product.available) {
        toaster.error(CART_MESSAGES.UNAVAILABLE_PRODUCT)
        return
      }
      this.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        available: product.available,
      })
      this.saveCart()
    } catch (err: any) {
      this.error = err.message ?? CART_MESSAGES.PRODUCT_LOAD_ERROR
      toaster.error(CART_MESSAGES.PRODUCT_LOAD_ERROR)
      console.error('Store Error (addToCart):', err)
    } finally {
      this.loading = false
    }
  },

  increaseQuantity(productId) {
    const item = this.items.find((i) => i.productId === productId)
    if (item) {
      item.quantity += 1
      this.saveCart()
    }
  },

  decreaseQuantity(productId) {
    const idx = this.items.findIndex((i) => i.productId === productId)
    if (idx === -1) return
    if (this.items[idx].quantity <= 1) {
      this.items.splice(idx, 1)
    } else {
      this.items[idx].quantity -= 1
    }
    this.saveCart()
  },

  removeFromCart(productId) {
    this.items = this.items.filter((item) => item.productId !== productId)
    this.saveCart()
  },

  loadCart() {
    this.items = loadCartFromStorage()
  },

  saveCart() {
    saveCartToStorage([...this.items])
  },

  clearCart() {
    this.items = []
    clearCartStorage()
  },
})
