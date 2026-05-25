import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
    createPatient as apiCreatePatient,
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

    // Removed deletePatient and deleteAllPatients

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

    // Removed mergePatients

    return (
        <PatientContext.Provider value={{
            patients,
            setPatients,
            isLoading,
            addPatient,
            updateReviewStatus,
            updateNotes,
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
