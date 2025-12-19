import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { store } from "./app/store";
import AppRoutes from "./routes/AppRoutes";
import AuthBootstrap from "./components/auth/AuthBootstrap";
import ScrollToTopButton from "./components/common/ScrollToTopButton";

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthBootstrap>
          <AppRoutes />
          <ScrollToTopButton />
          <ToastContainer position="top-right" autoClose={2500} />
        </AuthBootstrap>
      </BrowserRouter>
    </Provider>
  );
}
