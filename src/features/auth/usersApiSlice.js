// src/features/auth/usersApiSlice.js
import { apiSlice } from "../../app/apiSlice";

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: ({ email, password }) => ({
        url: "/users/auth",
        method: "POST",
        body: { email, password },
      }),
      invalidatesTags: ["User"],
    }),

    register: builder.mutation({
      query: ({ name, phoneNumber, email, password }) => ({
        url: "/users",
        method: "POST",
        body: { name, phoneNumber, email, password },
      }),
      invalidatesTags: ["User"],
    }),

    logout: builder.mutation({
      query: () => ({
        url: "/users/logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),

    // Profile (auto + lazy hooks are both generated from this single query)
    getMyProfile: builder.query({
      query: () => "/users/account/profile",
      providesTags: ["User"],
    }),

    updateMyProfile: builder.mutation({
      query: (body) => ({
        url: "/users/account/profile",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),

    // Forgot password (email)
    forgotPassword: builder.mutation({
      query: ({ email }) => ({
        url: "/users/forgot-password",
        method: "POST",
        body: { email },
      }),
    }),

    // Reset password (token from URL)
    resetPassword: builder.mutation({
      query: ({ token, password }) => ({
        url: `/users/reset-password/${token}`,
        method: "POST",
        body: { password },
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,

  useGetMyProfileQuery,
  useLazyGetMyProfileQuery, // ✅ correct lazy hook

  useUpdateMyProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = usersApiSlice;
