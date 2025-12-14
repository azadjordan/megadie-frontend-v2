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
    clearCart: (state) => {
      state.items = []
    },
    setCartItemQuantity: (state, action) => {
      const { productId, quantity } = action.payload
      const idx = findItemIndex(state.items, productId)
      if (idx !== -1) {
        state.items[idx].quantity = quantity
      }
    },
  },
})

export const { addToCart, clearCart, setCartItemQuantity } = cartSlice.actions
export default cartSlice.reducer
