// src/features/auth/authSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  userInfo: null,        // { _id, name, email, isAdmin, ... }
  isInitialized: false,  // tells UI we’ve checked session at least once
  sessionCheckError: null,
  sessionCheckNonce: 0,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.userInfo = action.payload
      state.isInitialized = true
      state.sessionCheckError = null
    },
    logout: (state) => {
      state.userInfo = null
      state.isInitialized = true
      state.sessionCheckError = null
    },
    setInitialized: (state) => {
      state.isInitialized = true
      state.sessionCheckError = null
    },
    setSessionCheckFailed: (state, action) => {
      state.userInfo = null
      state.isInitialized = true
      state.sessionCheckError =
        action.payload || {
          message: "We couldn't confirm your session.",
          status: "UNKNOWN_ERROR",
        }
    },
    restartSessionCheck: (state) => {
      state.isInitialized = false
      state.sessionCheckError = null
      state.sessionCheckNonce += 1
    },
  },
})

export const {
  setCredentials,
  logout,
  setInitialized,
  setSessionCheckFailed,
  restartSessionCheck,
} = authSlice.actions
export default authSlice.reducer
