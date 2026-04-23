import axios from 'axios';

import { BASE_URL } from '../config/api';

const API_BASE = `${BASE_URL}/api`;

const api = axios.create({
    baseURL: API_BASE,
    timeout: 120000, // 2 min for model predictions
});

// Add a request interceptor to inject the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('cancerscan_token');
        console.log('[INTERCEPTOR] running, token:', token ? `FOUND (len: ${token.length}, start: ${token.substring(0, 10)}...)` : 'MISSING');
        
        // Prevent sending "undefined" or "null" strings
        if (token && token !== 'undefined' && token !== 'null') {
            config.headers['Authorization'] = `Bearer ${token}`;
            console.log('[INTERCEPTOR] Authorization header set');
        } else {
            console.log('[INTERCEPTOR] Token invalid or missing, skipping header');
        }
        
        console.log('[INTERCEPTOR] Requesting URL:', config.url);
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to automatically logout on 401 Unauthorized
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || '';
        const status = error.response?.status;

        // NEVER clear session on login/register route
        // Login 401 just means wrong password — not an expired session
        if (status === 401 &&
            !url.includes('/auth/login') &&
            !url.includes('/auth/register') &&
            !url.includes('/auth/forgot') &&
            !url.includes('/auth/reset')) {
            console.log(
                '[INTERCEPTOR] 401 on protected route, clearing session'
            );
            localStorage.removeItem('cancerscan_token');
            window.location.href = '/';
        }

        return Promise.reject(error);
    }
);

// ── Auth ──────────────────────────────────────────────
export const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
};

export const register = async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data;
};

// ── Analysis ──────────────────────────────────────────
export const predict = async (formData) => {
    const res = await api.post('/analysis/predict', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return res.data;
};

// ── Patients ─────────────────────────────────────────
export const getPatients = async () => {
    const res = await api.get('/patients/');
    return res.data;
};

export const createPatient = async (patientData) => {
    const res = await api.post('/patients/', patientData);
    return res.data;
};

export const deletePatient = async (patientId) => {
    const res = await api.delete(`/patients/${patientId}`);
    return res.data;
};

export const deleteAllPatients = async () => {
    const res = await api.delete('/patients');
    return res.data;
};

export const updatePatientStatus = async (patientId, status) => {
    const res = await api.patch(`/patients/${patientId}/status`, { reviewStatus: status });
    return res.data;
};

export const updatePatientNotes = async (patientId, notes) => {
    const res = await api.patch(`/patients/${patientId}/notes`, { clinicalNotes: notes });
    return res.data;
};


// ── Admin ─────────────────────────────────
export const adminGetStats = async () => {
    const res = await api.get('/admin/stats')
    return res.data
}

export const adminGetDoctors = async () => {
    const res = await api.get('/admin/doctors')
    return res.data
}

export const adminApproveDoctor = async (id) => {
    const res = await api.post(
        `/admin/doctors/${id}/approve`
    )
    return res.data
}

export const adminDeleteDoctor = async (id) => {
    const res = await api.delete(
        `/admin/doctors/${id}`
    )
    return res.data
}

export const adminResetPassword = async (id, pw) => {
    const res = await api.post(
        `/admin/doctors/${id}/reset-password`,
        { newPassword: pw }
    )
    return res.data
}

export const adminGetPatients = async () => {
    const res = await api.get('/admin/patients')
    return res.data
}

export const searchPatients = async (query) => {
    // For admin, we use the specific admin search if available, 
    // but the frontend expects 'searchPatients' for the monitoring page.
    const res = await api.get(`/admin/patients/search?q=${encodeURIComponent(query)}`)
    return res.data
}

export const adminGetAuditLogs = async () => {
    // Stub for now, can be expanded for real audit log backend
    const res = await api.get('/admin/audit-logs')
    return res.data
}

export const adminGetSystemHealth = async () => {
    // Hits the ML server health or a dedicated admin health endpoint
    const res = await api.get('/admin/health')
    return res.data
}

export default api;
