// src/pages/Auth/ResetPasswordPage.jsx
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import {
  useResetPasswordMutation,
  useLazyGetMyProfileQuery,
} from "../../features/auth/usersApiSlice";

import { setCredentials } from "../../features/auth/authSlice";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [resetPassword, { isLoading: isResetting, error: resetError }] =
    useResetPasswordMutation();

  const [fetchProfile, { isLoading: isFetchingProfile, error: profileError }] =
    useLazyGetMyProfileQuery();

  const isLoading = isResetting || isFetchingProfile;

  const tokenLooksValid = useMemo(() => {
    // crypto.randomBytes(32).toString("hex") => 64 hex chars
    return typeof token === "string" && token.length >= 32;
  }, [token]);

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!tokenLooksValid) return toast.error("Invalid reset link.");
    if (!password || password.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    if (password !== confirm) return toast.error("Passwords do not match.");

    try {
      // 1) Reset password (backend sets auth cookie)
      const res = await resetPassword({ token, password }).unwrap();
      toast.success(res?.message || "Password reset successful.");

      // 2) Fetch profile (cookie now valid)
      const profileRes = await fetchProfile().unwrap();

      // 3) Store userInfo in Redux
      dispatch(setCredentials(profileRes.data));

      // 4) Redirect (user is logged in)
      navigate("/account", { replace: true });
    } catch (err) {
      toast.error(err?.data?.message || err?.error || "Reset failed");
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
      <p className="mt-1 text-sm text-slate-600">
        Choose a new password for your account.
      </p>

      {!tokenLooksValid ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm font-semibold text-red-900">
            Invalid reset link
          </div>
          <div className="mt-1 text-sm text-red-700">
            Please request a new password reset link.
          </div>
          <div className="mt-3">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-slate-900 hover:underline"
            >
              Go to Forgot password
            </Link>
          </div>
        </div>
      ) : null}

      {resetError ? <ErrorMessage error={resetError} className="mt-4" /> : null}
      {profileError ? (
        <ErrorMessage error={profileError} className="mt-4" />
      ) : null}

      <form onSubmit={submitHandler} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            New password
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!tokenLooksValid || isLoading}
          />
          <div className="mt-1 text-xs text-slate-500">
            At least 6 characters.
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            disabled={!tokenLooksValid || isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !tokenLooksValid}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isLoading ? "Working…" : "Reset password"}
        </button>

        {isLoading ? (
          <div className="pt-2">
            <Loader />
          </div>
        ) : null}

        <div className="text-sm text-slate-600">
          <Link
            to="/login"
            className="font-semibold text-slate-900 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
