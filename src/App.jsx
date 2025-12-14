import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { store } from './app/store'
import AppRoutes from './routes/AppRoutes'

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={2500} />
      </BrowserRouter>
    </Provider>
  )
}
