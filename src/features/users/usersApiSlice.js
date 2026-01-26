import { apiSlice } from "../../app/apiSlice";

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsersAdmin: builder.query({
      query: ({
        page = 1,
        limit,
        search = "",
        role = "all",
        sort = "name",
        approvalStatus = "all",
      } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (Number.isFinite(limit)) params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (role && role !== "all") params.set("role", role);
        if (sort) params.set("sort", sort);
        if (approvalStatus && approvalStatus !== "all") {
          params.set("approvalStatus", approvalStatus);
        }
        return `/users?${params.toString()}`;
      },
      providesTags: (result) => {
        const listTag = { type: "User", id: "LIST" };
        const rows = result?.data || result?.items || [];
        return [listTag, ...rows.map((u) => ({ type: "User", id: u._id }))];
      },
    }),

    getUserById: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: "User", id }],
    }),

    updateUser: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "User", id: "LIST" },
        { type: "User", id: arg?.id },
      ],
    }),
    updateUserApprovalStatus: builder.mutation({
      query: ({ id, approvalStatus }) => ({
        url: `/users/${id}/approval`,
        method: "PUT",
        body: { approvalStatus },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "User", id: "LIST" },
        { type: "User", id: arg?.id },
      ],
    }),

    updateUserPasswordByAdmin: builder.mutation({
      query: ({ id, password }) => ({
        url: `/users/${id}/password`,
        method: "PUT",
        body: { password },
      }),
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id: "LIST" },
        { type: "User", id },
      ],
    }),
  }),
});

export const {
  useGetUsersAdminQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useUpdateUserApprovalStatusMutation,
  useUpdateUserPasswordByAdminMutation,
  useDeleteUserMutation,
} = usersApiSlice;
