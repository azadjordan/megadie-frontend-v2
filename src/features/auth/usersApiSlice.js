// src/features/auth/usersApiSlice.js
import { apiSlice } from '../../app/apiSlice'

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: ({ email, password }) => ({
        url: '/users/auth',
        method: 'POST',
        body: { email, password },
      }),
      invalidatesTags: ['User'],
    }),

    // ✅ NEW: register
    register: builder.mutation({
      query: ({ name, phoneNumber, email, password }) => ({
        url: '/users',
        method: 'POST',
        body: { name, phoneNumber, email, password },
      }),
      invalidatesTags: ['User'],
    }),

    logout: builder.mutation({
      query: () => ({
        url: '/users/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),

    getMyProfile: builder.query({
      query: () => '/users/account/profile',
      providesTags: ['User'],
    }),

    updateMyProfile: builder.mutation({
      query: (body) => ({
        url: '/users/account/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation, // ✅ export
  useLogoutMutation,
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} = usersApiSlice
