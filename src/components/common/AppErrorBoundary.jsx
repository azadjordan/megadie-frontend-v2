import { Component } from "react";
import { useLocation } from "react-router-dom";

class AppErrorBoundaryInner extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error("App render error", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-slate-900">
            Something went wrong
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Reload the page to continue. If this keeps happening, please contact
            support.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default function AppErrorBoundary({ children }) {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}`;

  return (
    <AppErrorBoundaryInner resetKey={resetKey}>
      {children}
    </AppErrorBoundaryInner>
  );
}
