// src/features/auth/authSlice.js
import { createSlice } from '@reduxjs/toolkit'
import { getAdminSessionDeadline } from '../../utils/adminSession.js'

const initialState = {
  userInfo: null,        // { _id, name, email, isAdmin, ... }
  adminSessionDeadline: null,
  isInitialized: false,  // tells UI we’ve checked session at least once
  sessionCheckError: null,
  sessionCheckNonce: 0,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const sameSession = state.userInfo?.isAdmin && action.payload?.isAdmin
        && state.userInfo._id === action.payload._id
        && Number.isFinite(action.payload.sessionExpiresAt)
        && state.userInfo.sessionExpiresAt === action.payload.sessionExpiresAt
      // Profile updates must not move an existing login deadline.
      if (!sameSession) state.adminSessionDeadline = getAdminSessionDeadline(action.payload)
      state.userInfo = action.payload
      state.isInitialized = true
      state.sessionCheckError = null
    },
    logout: (state) => {
      state.userInfo = null
      state.adminSessionDeadline = null
      state.isInitialized = true
      state.sessionCheckError = null
    },
    setInitialized: (state) => {
      state.isInitialized = true
      state.sessionCheckError = null
    },
    setSessionCheckFailed: (state, action) => {
      state.userInfo = null
      state.adminSessionDeadline = null
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
