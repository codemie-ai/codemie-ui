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
import { Product } from '@/types/entity/product'

interface ProductCardProps {
  product: Product
  onAddToCart: (productId: string) => void
  className?: string
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, className }) => (
  <div
    className={`flex flex-col gap-3 p-4 border border-border-default rounded-lg bg-background-primary ${
      className ?? ''
    }`}
  >
    <div className="flex-1">
      <h3 className="text-text-primary font-medium">{product.name}</h3>
      {product.description && (
        <p className="text-text-secondary text-sm mt-1 line-clamp-2">{product.description}</p>
      )}
    </div>

    <div className="flex items-center justify-between mt-auto">
      <span className="text-text-primary font-semibold">${product.price.toFixed(2)}</span>
      <Button
        type="primary"
        size={ButtonSize.SMALL}
        disabled={!product.available}
        onClick={() => onAddToCart(product.id)}
        aria-label={
          product.available
            ? `Add ${product.name} to cart`
            : `${product.name} is currently unavailable`
        }
      >
        {product.available ? 'Add to Cart' : 'Unavailable'}
      </Button>
    </div>
  </div>
)

export default ProductCard
