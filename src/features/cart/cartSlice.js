// src/features/cart/cartSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  items: [], // [{ productId, product, quantity }]
}

const findItemIndex = (items, productId) =>
  items.findIndex((i) => i.productId === productId)

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const product = action.payload
      const quantity = product.quantity ?? 1

      const productId = product.id || product._id || product.sku
      const idx = findItemIndex(state.items, productId)

      if (idx === -1) {
        state.items.push({
          productId,
          product,
          quantity,
        })
      } else {
        state.items[idx].quantity += quantity
      }
    },

    removeFromCart: (state, action) => {
      const productId = action.payload
      state.items = state.items.filter((i) => i.productId !== productId)
    },

    clearCart: (state) => {
      state.items = []
    },

    setCartItemQuantity: (state, action) => {
      const { productId, quantity } = action.payload
      const idx = findItemIndex(state.items, productId)
      if (idx === -1) return

      const q = Number(quantity)

      // if invalid/empty -> do nothing
      if (!Number.isFinite(q)) return

      // qty <= 0 removes the item
      if (q <= 0) {
        state.items.splice(idx, 1)
        return
      }

      state.items[idx].quantity = q
    },
  },
})

export const { addToCart, removeFromCart, clearCart, setCartItemQuantity } =
  cartSlice.actions
export default cartSlice.reducer
