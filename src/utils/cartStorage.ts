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

import { CART_STORAGE_KEY } from '@/constants/shoppingCart'
import { CartItem } from '@/types/entity/shoppingCart'

export const saveCartToStorage = (cartItems: CartItem[]): void => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  } catch {
    // Graceful fallback when localStorage is unavailable (e.g. private browsing)
  }
}

export const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as CartItem[]) : []
  } catch {
    return []
  }
}

export const clearCartStorage = (): void => {
  try {
    localStorage.removeItem(CART_STORAGE_KEY)
  } catch {
    // Graceful fallback when localStorage is unavailable
  }
}
