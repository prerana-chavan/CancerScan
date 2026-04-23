import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#0a0f1a'
            }}>
                <div className="animate-spin rounded-full 
                        h-10 w-10 border-b-2 
                        border-teal-400" />
            </div>
        )
    }

    return isAuthenticated
        ? children
        : <Navigate to="/welcome" replace />
}
