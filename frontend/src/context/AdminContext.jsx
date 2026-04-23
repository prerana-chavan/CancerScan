import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
    adminGetStats, 
    adminGetDoctors, 
    adminApproveDoctor, 
    adminDeleteDoctor,
    adminResetPassword 
} from '../services/api';

const AdminContext = createContext();

export function AdminProvider({ children }) {
    const [stats, setStats] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { token } = useAuth();

    const refreshData = useCallback(async () => {
        const storedToken = localStorage.getItem('cancerscan_token');
        if (!token || !storedToken) return;

        setLoading(true);
        setError(null);
        try {
            const [s, d] = await Promise.all([
                adminGetStats(),
                adminGetDoctors()
            ]);
            setStats(s.stats);
            setDoctors(d.doctors);
        } catch (err) {
            setError(err.message || 'Failed to fetch admin data');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            refreshData();
        }
    }, [token, refreshData]);

    const approveDoctor = async (id) => {
        await adminApproveDoctor(id);
        await refreshData();
    };

    const deleteDoctor = async (id) => {
        await adminDeleteDoctor(id);
        await refreshData();
    };

    const resetPassword = async (id, newPw) => {
        await adminResetPassword(id, newPw);
        // No need to refresh all data for a password reset
    };

    return (
        <AdminContext.Provider value={{
            stats,
            doctors,
            loading,
            error,
            refreshData,
            approveDoctor,
            deleteDoctor,
            resetPassword
        }}>
            {children}
        </AdminContext.Provider>
    );
}

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
