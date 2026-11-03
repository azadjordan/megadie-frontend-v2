import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { store } from "./app/store";
import AppRoutes from "./routes/AppRoutes";
import AdminSessionGuard from "./components/auth/AdminSessionGuard";
import AuthBootstrap from "./components/auth/AuthBootstrap";
import ScrollToTopButton from "./components/common/ScrollToTopButton";
import AppErrorBoundary from "./components/common/AppErrorBoundary";

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthBootstrap>
          <AdminSessionGuard />
          <AppErrorBoundary>
            <AppRoutes />
            <ScrollToTopButton />
          </AppErrorBoundary>
          <ToastContainer position="top-right" autoClose={2500} />
        </AuthBootstrap>
      </BrowserRouter>
    </Provider>
  );
}
