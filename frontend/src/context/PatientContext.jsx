import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
    createPatient as apiCreatePatient,
    deleteAllPatients as apiDeleteAllPatients,
    updatePatientStatus as apiUpdateStatus,
    updatePatientNotes as apiUpdateNotes
} from '../services/api';
import api from '../services/api';

const PatientContext = createContext();

export const PatientProvider = ({ children }) => {
    const [patients, setPatients] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { token } = useAuth();

    // FETCH all patients from backend
    const fetchPatients = async () => {
        try {
            // Get token
            const token = localStorage.getItem('cancerscan_token');
            if (!token || token === 'null' || token === 'undefined') {
                console.log('[PATIENTS] No token, skip fetch');
                return;
            }

            // Decode role from token to skip fetch for admin
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.role === 'admin') {
                    console.log('[PATIENTS] Admin user — skip patient fetch');
                    setPatients([]);
                    return;
                }
            } catch (decodeErr) {
                console.log('[PATIENTS] Token decode:', decodeErr);
            }

            setIsLoading(true);
            console.log('[PATIENTS] Fetching records...');

            const res  = await api.get('/patients/');
            const data = res.data || res;

            if (data.success) {
                setPatients(data.patients || []);
                console.log('[PATIENTS] Loaded:', (data.patients || []).length);
            }
        } catch (err) {
            console.error('[PATIENTS] Fetch error:', err);
            // Do NOT crash — just set empty
            setPatients([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial load when token is available
    useEffect(() => {
        if (!token) {
            setPatients([]);
            return;
        }

        // Decode token to check role
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // Admin never fetches patient list
            if (payload.role === 'admin') {
                setPatients([]);
                return;
            }
        } catch(e) {}

        fetchPatients();
    }, [token]);

    // ADD new patient
    const addPatient = useCallback(async (newRecord) => {
        try {
            const result = await apiCreatePatient(newRecord);
            if (result.success) {
                setPatients(prev => [{ ...newRecord, dbId: result.id }, ...prev]);
                return { success: true };
            }
            return { success: false, error: result.error };
        } catch (err) {
            console.error('Add patient failed:', err);
            return { success: false, error: 'Connection error' };
        }
    }, []);

    // DELETE patient
    const deletePatient = async (patientId) => {
        try {
            console.log('[DELETE] Removing:', patientId);

            // Call backend DELETE API
            const res = await api.delete(`/patients/${patientId}`);
            const data = res.data || res;

            if (data.success) {
                // Remove from state immediately
                // WITHOUT refetching from server
                setPatients(prev =>
                    prev.filter(p => p.id !== patientId && p.patient_id !== patientId)
                );
                console.log('[DELETE] Removed from state:', patientId);
                return { success: true };
            } else {
                console.error('[DELETE] Failed:', data.error);
                return { success: false, error: data.error };
            }

        } catch (err) {
            console.error('[DELETE] Error:', err);
            return { success: false, error: err.message };
        }
    };

    // DELETE ALL patients
    const deleteAllPatients = useCallback(async () => {
        try {
            const result = await apiDeleteAllPatients();
            if (result.success) {
                setPatients([]);
                return { success: true };
            }
            return { success: false, error: result.error };
        } catch (err) {
            console.error('Delete all patients failed:', err);
            return { success: false, error: 'Connection error' };
        }
    }, []);

    // UPDATE review status
    const updateReviewStatus = useCallback(async (patientId, newStatus) => {
        const prevPatients = [...patients];
        // Optimistic update
        setPatients(prev =>
            prev.map(p => p.patient_id === patientId ? { ...p, status: newStatus } : p)
        );

        try {
            const result = await apiUpdateStatus(patientId, newStatus);
            if (!result.success) {
                setPatients(prevPatients);
                console.error('Failed to update status on server');
            }
        } catch (err) {
            console.error('Update status failed:', err);
            setPatients(prevPatients);
        }
    }, [patients]);

    // UPDATE clinical notes
    const updateNotes = useCallback(async (patientId, notes) => {
        const prevPatients = [...patients];
        // Optimistic update
        setPatients(prev =>
            prev.map(p => p.patient_id === patientId ? { ...p, notes: notes } : p)
        );

        try {
            const result = await apiUpdateNotes(patientId, notes);
            if (!result.success) {
                setPatients(prevPatients);
                console.error('Failed to update notes on server');
            }
        } catch (err) {
            console.error('Update notes failed:', err);
            setPatients(prevPatients);
        }
    }, [patients]);

    const mergePatients = useCallback((keepId, deleteIds) => {
        setPatients(prev =>
            prev.filter(p => !deleteIds.includes(p.patient_id))
        );
    }, []);

    return (
        <PatientContext.Provider value={{
            patients,
            setPatients,
            isLoading,
            addPatient,
            deletePatient,
            deleteAllPatients,
            updateReviewStatus,
            updateNotes,
            mergePatients,
            fetchPatients
        }}>
            {children}
        </PatientContext.Provider>
    );
};

export const usePatients = () => {
    const context = useContext(PatientContext);
    if (!context) {
        throw new Error('usePatients must be used within a PatientProvider');
    }
    return context;
};
