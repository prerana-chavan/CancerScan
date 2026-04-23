import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { NotificationProvider } from './context/NotificationContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { HashRouter } from 'react-router-dom'

// Clear auth on every page load
// Forces login page always
localStorage.removeItem('cancerscan_token')
localStorage.removeItem('cancerscan_user')
console.log('[APP] Fresh start — login required')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </HashRouter>
  </StrictMode>,
)
