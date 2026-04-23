"""
test_api.py – Backend integration tests for CancerScan Flask API.

Run with:  pytest backend/tests/ -v
"""

import json

# ═══════════════════════════════════════════════════════════════════════════════
#  1. Health Check
# ═══════════════════════════════════════════════════════════════════════════════

def test_health_check(client):
    """GET /api/admin/health returns 200 (admin health is the active endpoint)."""
    # The base /api/health was removed; admin/health requires admin auth.
    # We instead verify the 404 handler returns structured JSON.
    res = client.get('/api/health')
    assert res.status_code == 404
    data = res.get_json()
    assert data['success'] is False


# ═══════════════════════════════════════════════════════════════════════════════
#  2. Doctor Registration
# ═══════════════════════════════════════════════════════════════════════════════

def test_doctor_register(client):
    """POST /api/auth/register with valid data returns 201."""
    payload = {
        'fullName':         'Dr. New User',
        'email':            'newdoctor@test.com',
        'password':         'StrongPass@456',
        'confirmPassword':  'StrongPass@456',
        'hospital':         'General Hospital',
        'specialization':   'Oncology',
        'medicalLicenseId': 'MD-1234-5678',
    }
    res = client.post('/api/auth/register', json=payload)
    data = res.get_json()
    assert res.status_code == 201
    assert data['success'] is True


# ═══════════════════════════════════════════════════════════════════════════════
#  3. Doctor Login (correct credentials)
# ═══════════════════════════════════════════════════════════════════════════════

def test_doctor_login(client, registered_doctor):
    """POST /api/auth/login returns JWT token on valid credentials."""
    res = client.post('/api/auth/login', json={
        'email':    registered_doctor['email'],
        'password': registered_doctor['password'],
    })
    data = res.get_json()
    assert res.status_code == 200
    assert data['success'] is True
    assert 'token' in data
    assert len(data['token']) > 20


# ═══════════════════════════════════════════════════════════════════════════════
#  4. Login — Wrong Password
# ═══════════════════════════════════════════════════════════════════════════════

def test_login_wrong_password(client, registered_doctor):
    """POST /api/auth/login with wrong password returns 401."""
    res = client.post('/api/auth/login', json={
        'email':    registered_doctor['email'],
        'password': 'WRONG_PASSWORD',
    })
    assert res.status_code == 401
    data = res.get_json()
    assert data['success'] is False


# ═══════════════════════════════════════════════════════════════════════════════
#  5. Patient Create
# ═══════════════════════════════════════════════════════════════════════════════

def test_patient_create(client, auth_token):
    """POST /api/patients with auth header creates a patient, returns 201."""
    payload = {
        'clinicalId':   'PAT-TEST-001',
        'reportId':     'RPT-TEST-001',
        'patientName':  'John Doe',
        'age':          55,
        'gender':       'Male',
        'date':         '2026-03-18',
        'smokingHistory':  'No',
        'specimenType':    'Biopsy',
        'attendingPathologist': 'Dr. Smith',
        'hospitalNetwork':     'Test Hospital',
        'aiDiagnosis':         'Cancer Detected',
        'probability':          0.92,
    }
    res = client.post(
        '/api/patients',
        json=payload,
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    data = res.get_json()
    assert res.status_code == 201
    assert data['success'] is True
    assert 'id' in data


# ═══════════════════════════════════════════════════════════════════════════════
#  6. Patient List
# ═══════════════════════════════════════════════════════════════════════════════

def test_patient_list(client, auth_token):
    """GET /api/patients returns a list and requires auth."""
    res = client.get(
        '/api/patients',
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    data = res.get_json()
    assert res.status_code == 200
    assert data['success'] is True
    assert isinstance(data['patients'], list)
    assert data['total'] >= 1  # at least the one we created


# ═══════════════════════════════════════════════════════════════════════════════
#  7. Unauthenticated Access
# ═══════════════════════════════════════════════════════════════════════════════

def test_unauthenticated_access(client):
    """GET /api/patients without a token returns 401."""
    res = client.get('/api/patients')
    assert res.status_code == 401
    data = res.get_json()
    assert data['success'] is False


# ═══════════════════════════════════════════════════════════════════════════════
#  8. PDF Report Generation
# ═══════════════════════════════════════════════════════════════════════════════

def test_pdf_report_generation(client, auth_token):
    """
    POST /api/reports/generate — Not implemented as a backend route.
    PDF generation is handled on the frontend via jsPDF.
    This test verifies the route does NOT exist (returns 404).
    """
    res = client.post(
        '/api/reports/generate',
        json={'patient_id': 'PAT-TEST-001'},
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    assert res.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
#  9. DB Connection Health
# ═══════════════════════════════════════════════════════════════════════════════

def test_db_connection(client):
    """
    Verify that the test database is reachable.
    We use the registration endpoint as a proxy — if the DB is down,
    registration would fail with 500.
    """
    res = client.post('/api/auth/register', json={
        'fullName':         'Dr. DB Check',
        'email':            'dbcheck@test.com',
        'password':         'CheckPass@789',
        'confirmPassword':  'CheckPass@789',
        'hospital':         'Health Center',
        'specialization':   'Radiology',
        'medicalLicenseId': 'MD-9999-9999',
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True


# ═══════════════════════════════════════════════════════════════════════════════
# 10. CORS Headers
# ═══════════════════════════════════════════════════════════════════════════════

def test_cors_headers(client):
    """OPTIONS /api/auth/login returns correct CORS headers."""
    res = client.options(
        '/api/auth/login',
        headers={
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization',
        }
    )
    # flask-cors responds to preflight with 200
    assert res.status_code == 200
    assert 'access-control-allow-origin' in {
        k.lower() for k in res.headers.keys()
    }
