import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'                      // Tailwind entry
import 'react-toastify/dist/ReactToastify.css'   // Toastify styles
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
