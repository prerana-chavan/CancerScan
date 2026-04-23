import {
    createContext, useContext,
    useState, useEffect
} from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null); // Always start with null token
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // On startup: always clear token and show login page
        localStorage.removeItem('cancerscan_token');
        localStorage.removeItem('cancerscan_user');
        console.log('[AUTH] App started — session cleared, login required');
        
        setIsLoading(false);
    }, []);

    const verifyToken = async () => {
        try {
            // Interceptor handles the Authorization header automatically
            const res = await api.get('/auth/me');
            
            if (res.data.success) {
                setUser(res.data.data)
            } else {
                console.log('[AUTH] Unexpected response format, keeping token')
            }
        } catch (err) {
            // Axios error handling
            if (err.response) {
                const status = err.response.status;
                // Clear auth on ANY client error (4xx)
                if (status >= 400 && status < 500) {
                    console.log(`[AUTH] Session invalid (${status}), clearing`);
                    clearAuth();
                } else {
                    // Server error (5xx)
                    console.log(`[AUTH] Server error (${status}) during verify, keeping session`);
                }
            } else {
                // Network error
                console.log('[AUTH] Network error during verify, keeping token:', err.message)
                // Fallback: try to reconstruct user from token
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]))
                    setUser({
                        id:             payload.id,
                        fullName:       payload.name || 'Clinical User',
                        email:          payload.email || '',
                        role:           payload.role || 'doctor',
                        hospital:       payload.hospital || 'Medical Center',
                    })
                } catch { 
                    clearAuth();
                }
            }
        } finally {
            setIsLoading(false)
        }
    }

    const clearAuth = () => {
        localStorage.removeItem('cancerscan_token')
        setToken(null)
        setUser(null)
    }

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            const data = res.data;

            if (data.success && data.token) {
                console.log('[AUTH] Login success, saving token')
                localStorage.setItem('cancerscan_token', data.token)
                setToken(data.token)
                setUser(data.user)
                console.log('[AUTH] Token saved to localStorage')
            }
            return data;
        } catch (err) {
            const errorData = err.response?.data || { success: false, error: 'Connection failed' };
            console.log('[AUTH] Login failed:', errorData.error);
            return errorData;
        }
    }

    const register = async (formData) => {
        try {
            const res = await api.post('/auth/register', formData);
            return res.data;
        } catch (err) {
            return err.response?.data || { success: false, error: 'Registration failed' };
        }
    }

    const logout = async () => {
        try {
            if (token) {
                await api.post('/auth/logout');
            }
        } catch { }
        clearAuth()
    }

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            login,
            register,
            logout,
            isAuthenticated: !!user,
            isPathologist: ['doctor', 'pathologist'].includes(user?.role?.toLowerCase().trim()),
            isAdmin: user?.role === 'admin',
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
