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
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    register: builder.mutation({
      query: ({ name, phoneNumber, email, password }) => ({
        url: "/users",
        method: "POST",
        body: { name, phoneNumber, email, password },
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    logout: builder.mutation({
      query: () => ({
        url: "/users/logout",
        method: "POST",
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    // Profile (auto + lazy hooks are both generated from this single query)
    getMyProfile: builder.query({
      query: () => "/users/account/profile",
      providesTags: (result) => [
        { type: "User", id: "ME" },
        ...(result?.data?._id ? [{ type: "User", id: result.data._id }] : []),
      ],
    }),

    updateMyProfile: builder.mutation({
      query: (body) => ({
        url: "/users/account/profile",
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result) => [{ type: "User", id: "ME" }],
    }),

// ✅ Admin: list users (for assigning quote owner, etc.)
getAdminUsers: builder.query({
  query: () => "/users",
  providesTags: (result) => {
    const listTag = { type: "User", id: "LIST" };
    const rows = result?.data || [];
    return [listTag, ...rows.map((u) => ({ type: "User", id: u._id }))];
  },
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
      invalidatesTags: [{ type: "User", id: "ME" }],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,

  useGetMyProfileQuery,
  useLazyGetMyProfileQuery,

  useUpdateMyProfileMutation,

  // ✅ Admin
  useGetAdminUsersQuery,

  useForgotPasswordMutation,
  useResetPasswordMutation,
} = usersApiSlice;
