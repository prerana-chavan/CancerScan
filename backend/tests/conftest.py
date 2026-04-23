"""
conftest.py – Pytest fixtures for CancerScan backend tests.

Creates a fresh temporary SQLite database and a Flask test client
for every test session.  Environment variables are injected BEFORE
the app module is imported so that settings.validate() succeeds.
"""

import os
import sys
import pytest
import tempfile

# ── 1. Resolve backend dir (tests/ lives one level below backend/) ───────────
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ── 2. Set required env vars BEFORE importing anything else ──────────────────
os.environ['PORT']            = '5099'
os.environ['JWT_SECRET']      = 'a' * 64
os.environ['ALLOWED_ORIGINS'] = 'http://localhost:5173'
os.environ['ML_SERVER_URL']   = 'http://localhost:5001'
os.environ['FRONTEND_URL']    = 'http://localhost:5173'

# ── 3. Point DB_PATH to a temp file BEFORE importing db module ───────────────
_tmp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
_tmp_db.close()

import database.db as _db_module
_db_module.DB_PATH = _tmp_db.name

# ── 4. NOW import the Flask app (triggers init_db + seed_admin) ──────────────
from app import app as flask_app


@pytest.fixture(scope='session')
def app():
    """Yield the Flask application configured for testing."""
    flask_app.config['TESTING'] = True
    yield flask_app


@pytest.fixture(scope='session')
def client(app):
    """Yield a Flask test client."""
    return app.test_client()


@pytest.fixture(scope='session')
def registered_doctor(client):
    """
    Register a fresh doctor account and return the registration payload.
    This fixture is session-scoped so all tests share the same doctor.
    """
    payload = {
        'fullName':         'Dr. Test User',
        'email':            'testdoctor@cancerscan.com',
        'password':         'SecurePassword@123',
        'confirmPassword':  'SecurePassword@123',
        'hospital':         'Test Hospital',
        'specialization':   'Histopathology',
        'medicalLicenseId': 'MD-1111-2222',
    }
    res = client.post('/api/auth/register', json=payload)
    data = res.get_json()
    assert data.get('success'), f"Registration failed in fixture: {data}"

    # Auto-approve the doctor so login succeeds
    import database.db as db
    conn = db.get_connection()
    conn.execute(
        "UPDATE doctors SET is_approved = 1 WHERE email = ?",
        (payload['email'],)
    )
    conn.commit()
    conn.close()

    return payload


@pytest.fixture(scope='session')
def auth_token(client, registered_doctor):
    """Login the registered doctor and return a valid JWT token."""
    res = client.post('/api/auth/login', json={
        'email':    registered_doctor['email'],
        'password': registered_doctor['password'],
    })
    data = res.get_json()
    assert data.get('success'), f"Login failed in fixture: {data}"
    return data['token']
