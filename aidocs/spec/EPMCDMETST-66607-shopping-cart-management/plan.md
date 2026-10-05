# Implementation Plan: Shopping Cart Management

## 1. Overview
Implement a shopping cart feature that allows online shoppers to add available products, manage quantities, view pricing details, and maintain cart state across their shopping session.

## 2. User Story
**As an** online shopper,
**I want to** add products to my shopping cart and manage the quantities,
**So that** I can review my selected products before placing an order.

## 3. Acceptance Criteria
- Given a product is marked as available, when the user adds it to the cart, then it appears in the cart with quantity 1 and totals are updated
- Given a product is marked as unavailable, when the user attempts to add it, then it is not added and an appropriate message is shown
- Given a product is in the cart, when the user increases the quantity, then quantity increments and subtotal/total recalculate
- Given a product is in the cart with quantity > 1, when the user decreases the quantity, then quantity decrements and subtotal/total recalculate
- Given a product is in the cart, when the user removes it, then it disappears and totals recalculate
- Given the user views the cart, then each product displays: name, unit price, quantity, subtotal, and the total cart amount
- Given the user navigates between pages, then the cart contents persist within the session

## 4. Research Findings

### Project Architecture Patterns
**State Management:** Valtio proxy stores in `src/store/`
**API Integration:** Custom fetch wrapper `@/src/utils/api`, must call `.json()` on responses
**Component Pattern:** `React.FC<Props>` with explicit TypeScript interfaces
**Styling:** Tailwind CSS only, `cn()` utility for conditional classes
**Forms:** React Hook Form + Yup validation, Controller-based
**File Limit:** 300 lines per component file

**Existing Relevant Patterns:**
- List management patterns from `AssistantsListPage`, `DataSourcesPage`
- State persistence patterns (Valtio reactive stores)
- Real-time updates and calculations (`useSnapshot` reactive pattern)
- Error handling: Automatic toaster notifications from `@/src/utils/api`

**No Existing Shopping/Ecommerce Code:**
- This is a completely new feature domain
- No existing product, cart, or order management code

## 5. Technical Context
**Repository:** `codemie_ui`
**Technologies:**
- React 18.3.1
- TypeScript 5.8.3
- Valtio (for state management)
- React Hook Form 7.x + Yup
- Tailwind CSS
- PrimeReact 10.9.x (for ui components)
- Vitest 1.6.1 + @testing-library/react (for testing)

**Dependencies:**
- Backend API for product data (assumed to exist)
- Session management (browser sessionStorage or Valtio store persistence)

## 6. Proposed Changes

### Frontend

#### A. State Management (Valtio Store)
**File:** `src/store/cart.ts` (NEW)

```typescript
interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  availability: boolean
}

interface CartStore {
  items: CartItem[]
  loading: boolean
  error: string | null
  \n  get totalAmount(): number
  get totalItems(): number
  \n  addItem: (productId: string, name: string, price: number, availability: boolean) => Promise<void>
  updateQuantity: (productId: string, newQuantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  fetchCart: () => Promise<void>
}
```

**Implementation Details:**
- `totalAmount`: Computed getter that sums `items.map(i => i.price * i.quantity).reduce((a, b) => a + b, 0)`
- `totalItems`: Computed getter that returns `items.length`
- `addItem`: 
  - Validate `availability === true` before adding
  - If item already exists, increment quantity
  - If new, add to `items` with `quantity: 1`
  - Set `loading = true` during API call, `false` in finally
  - Set `error = null` on success, error message on failure
- `updateQuantity`: 
  - If `newQuantity <= 0`, call `removeItem`
  - Otherwise, update the item's quantity in the `items` array
- `removeItem`: Filter `items` array to exclude the specified productId
- `clearCart`: Reset `items = []`
- `fetchCart`: Load cart from API/sessionStorage (assuming backend provides this)

#### B. Components

**1. `ShoppingCartPage`**
**Path:** `src/pages/cart/ShoppingCartPage.tsx` (NEW)
**Responsibilities:**
- Main page component for shopping cart view
- Fetch cart data on mount using `cartStore.fetchCart()`
- Display cart items using `CartItemList`
- Display cart summary using `CartSummary`
- Handle empty state (when no items in cart)
- Handle loading and error states

**2. `CartItemList`**
**Path:** `src/pages/cart/components/CartItemList.tsx` (NEW)
**Responsibilities:**
- Render list of cart items
- Each item shows: name, price, quantity controls, subtotal, remove button
- Uses `CartItem` component for each item

**Returns:**
```tsx(<ul className='flex flex-col gap-4'>
  {cartItems.map((item) => (
    <CartItem key={item.productId} item={item} />
  ))}
</ul>
```

**3. `CartItem`**
**Path:** `src/pages/cart/components/CartItem.tsx` (NEW)
**Props:**
```typescript
interface CartItemProps {
  item: CartItem
}
```

**Responsibilities:**
- Display single cart item with:
  - Product name
  - Unit price
  - Quantity with +/- buttons
  - Subtotal (price Ã— quantity)
  - Remove button
- Call `cartStore.updateQuantity()` when quantity changes
- Call `cartStore.removeItem()` when remove button clicked

**4. `CartSummary`**
**Path:** `src/pages/cart/components/CartSummary.tsx` (NEW)
**Responsibilities:**
- Display total cart amount
- Display total number of items
- Uses `useSnapshot(cartStore)` to access computed getters

**Returns:**
```tsx
<di»>
  <div className='flex justify-between mb-2'>
    <span>Total Items:</span>
    <span>{totalItems}</span>
  </div>
  <div className='flex justify-between font-bold text-xl'>
    <span>Total Amount:</span>
    <span>${totalAmount.toFixed(2)}</span>
  </div>
</div>
```

**5. `ProductListPage` Enhancement**
**Path:** `src/pages/products/ProductListPage.tsx` (NEW)
**Responsibilities:**
- Display products with availability status
- Provide "Add to Cart" button that calls `cartStore.addItem()`
- Disable button for unavailable products
- Show toast message when attempting to add unavailable product

### Backend (Assumptions)
The backend API is assumed to already exist with the following endpoints:

**API Endpoints:**
1. `GET /api/v1/cart` - Fetch current user's cart
2. `POST /api/v1/cart/items` - Add an item to the cart
3. `PUT /api/v1/cart/items/{productId}` - Update item quantity4. `DELETE /api/v1/cart/items/{productId}` - Remove an item
5. `DELETE /api/v1/cart` - Clear entire cart
6. `GET /api/v1/products` - Fetch available products

**If backend does not exist:**
- Coordinate with backend team to implement these endpoints
- Alternatively: use browser `sessionStorage` for client-side state persistence (no backend required)

## 7. API Contract

**Endpoint:** `GET /api/v1/cart`
**Method:** GET
**Request:** None
**Response:**
```json
{
  "items": [
    {
      "productId": "123",
      "name": "Product A",
      "price": 29.99,
      "quantity": 2,
      "availability": true
    }
  ],
  "totalAmount": 59.98,
  "totalItems": 1
) }
```

**Endpoint:** `POST /api/v1/cart/items`
**Method:** POST
**Request:**
```json
{
  "productId": "123",
  "quantity": 1
}
```
**Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "cart": { ... }
}
```
**Error Cases:**
- 400 - Product not available
- 404 - Product not found
- 500 - Server error

**Endpoint:** `PUT /api/v1/cart/items/{productId}`
**Method:** PUT
**Request:**
```json
{
  "quantity": 3
}
```
**Response:**
```json
{
  "success": true,
  "message": "Quantity updated",
  "cart": { ... }
}
```

**Endpoint:** `DELETE /api/v1/cart/items/{productId}`
**Method:** DELETE
**Request:** None
**Response:** 204 No Content
**Error Cases:**
- 404 - Item not found in cart

## 8. Technical Flow

1. **User Navigates to Product List**
   - `ProductListPage` renders
   - Calls `productsStore.fetchProducts()` on mount
   - Displays products with availability status

2. **User Clicks "Add to Cart"**
   - Event handler calls `cartStore.addItem(productId, name, price, availability)`
   - Store validates `availability === true`
   - If available:
     - Sets `loading = true`
     - Calls `POST /api/v1/cart/items`
     - On success: Updates `cartStore.items`
     - On error: Sets `cartStore.error`, show toast notification
   - If unavailable: Show error toast: "Product is not available"

3. **User Navigates to Cart Page**
   - `ShoppingCartPage` renders
   - Calls `cartStore.fetchCart()` on mount
   - `useSnapshot(cartStore)` provides reactive state
   - Renders `CartItemList` and `CartSummary`

4. **User Updates Quantity**
   - `CartItem` component calls `cartStore.updateQuantity(productId, newQuantity)`
   - Store updates `items.find(i => i.productId === productId).quantity = newQuantity`
   - Computed getters `get totalAmount()` and `get totalItems()` recalculate automatically
   - UI updates reactively via `useSnapshot`

5. **User Removes Item**
   - `CartItem` component calls `cartStore.removeItem(productId)`
   - Store filters `items.filter(i => i.productId !== productId)`
   - UI updates reactively

6. **User Navigates Away/Back**
   - Valtio store retains state across components and navigation
   - If using `sessionStorage` for persistence: save on every change, load on mount

## 9. Security & Error Handling

**Existing Patterns Used:**
- Automatic error handling with toaster notifications from `@/src/utils/api`
- State-based error display: `error: string | null` in store
- Loading states to disable buttons during API calls

**Validation:**
- Product availability check before adding to cart
- Quantity must be >= 1 (enforced by UI and store logic)
- User session/auth handled by existing API client authentication

**Error Scenarios:**
1. **Product Unavailable**: Show toast: "Product is not available"
2. **API Failure**: Show toast with error message
3. **Empty Cart**: Display empty state message: "Your cart is empty"
4. **Network Error**: Show generic error toast

**Security Considerations:**
- Use existing API client authentication (token-based)
- No sensitive payment data in frontend (out of scope)
- Input sanitization for quantity fields

## 10. Testing

**Unit Tests:**
1. `cartStore.ts` - Test all store methods in isolation
   - `addItem()` - adds new item, increments existing
   - `updateQuantity()` - updates quantity, removes when 0
   - `removeItem()` - filters out item
   - `clearCart()` - clears all items
   - Computed getters: `totalAmount`, `totalItems`
2. Component unit tests
   - `CartItem.test.tsx` - Renders correctly, calls store methods on button clicks
   - `CartSummary.test.tsx` - Displays correct totals

**Integration Tests:**
1. `ShoppingCartPage.integration.test.tsx` - Using `mockAPI`, `renderPage`
   - Renders page with cart items
   - Adds item to cart
   - Updates quantity
   - Removes item
   - Displays empty state
   - Displays loading state
   - Displays error state
   - Persists cart across navigation

**Manual Testing Scenarios:**
1. Add available product to cart
2. Attempt to add unavailable product
3. Increase/increase quantity
4. Remove item from cart
5. View empty cart
6. Navigate away and return to cart => state persists
7. Verify totals recalculate correctly

## 11. Dependencies & Assumptions

**Dependencies:**
1. Backend API endpoints must be implemented and accessible
2. Product data structure must include `availability` field
3. Authentication/session management already in place

**Assumptions:**
1. **Session Storage:** Cart state persists across session via backend API OR sessionStorage
2. **Single Currency:** All prices are in the same currency (no conversion)
3. **No Quantity Limit:** No upper limit on quantity per product (can be added later)
4. **No Price Changes:** Product prices do not change while in cart
5. **No Checkout Flow:** This implementation covers only cart management, not checkout/payment
6. **One Cart Per User:** Each user has one active cart
7. **Real-time Availability:** Availability is validated at add-time, not continuously re-validated

## 12. Implementation Sequence

This sequence ensures dependencies are satisfied at each step.

1. **Create Types** - `src/types/cart.ts`
   - Define `CartItem`, `Cart`, `CartStore` interfaces

2. **Create Valtio Store** - `src/store/cart.ts`
   - Implement `cartStore` with all methods and computed getters
   - Add error handling and loading states
   - Write unit tests: `cartStore.test.ts`

3. **Create Cart Components**
   a. `CartSummary` - Displays totals
   b. `CartItem` - Individual item with quantity controls
   c. `CartItemList` - List of items
   d. Write unit tests for each component

4. **Create Cart Page** - `ShoppingCartPage.tsx`
   - Integrate `CartItemList` and `CartSummary`
   - Add empty, loading, and error states
   - Write integration tests

5. **Update Product List (Optional)**
   - Add "Add to Cart" buttons to existing or new `ProductListPage`
   - Integrate availability validation

6. **Add Routes**
   - Add `/cart` route to `src/router.ts` (if using centralized routing)
   - Add navigation link to cart in main navigation

7. **Integration Testing**
   - End-to-end testing of all user flows
   - Verify state persistence across navigation

8. **UI Polish and Accessibility**
   - Add aria-labels to buttons
   - Ensure keyboard navigation works
   - Test with screen readers

---

## Notes

- **No Backend Code**: This plan covers only frontend implementation. Backend API endpoints are assumed to exist or will be created separately.
- **Scope Limitations:** This implementation does not include:
  - Checkout flow
  - Payment processing
  - Order history
  - Product search/filtering (except as part of existing product list)
  - Wishlist or saved carts
  - Inventory management
  - Promotional codes/discounts
- **Design Note**** This plan follows the codebase's existing patterns for Valtio stores, React components, and Tailwind styling.
- **Session Persistence Strategy:** If the backend API does not provide cart persistence, an alternative approach is to use `sessionStorage` or `localStorage` to save/load cart state on the client side.