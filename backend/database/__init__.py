# database/__init__.py
# Delegate all calls to the real database module
# api_server.py no longer uses these (it's a pure ML service now),
# but they are kept as a safety net.

import uuid
from .db import get_connection, init_db


def verify_user(username, password):
    """Legacy shim — real auth is handled by auth_routes.py + JWT"""
    return None


def add_user(data):
    """Legacy shim — real registration in auth_routes.py"""
    return False


def add_patient(data):
    """Insert a patient record into the real SQLite database."""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        patient_id = data.get('patient_id', f'P-{uuid.uuid4().hex[:9]}')
        cursor.execute('''
            INSERT INTO patients (
                patient_id, patient_name, age, gender, smoking_history,
                diagnosis_date, hospital_name, pathologist_name,
                image_path, prediction_result, subtype_result,
                survival_rate, status_stage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            patient_id,
            data.get('patient_name', 'Unknown'),
            data.get('age', 0),
            data.get('gender', ''),
            data.get('smoking_history', ''),
            data.get('diagnosis_date', ''),
            data.get('hospital_name', ''),
            data.get('pathologist_name', ''),
            data.get('image_path', ''),
            data.get('prediction_result', 'Benign'),
            data.get('subtype_result', 'N/A'),
            data.get('survival_rate', 'N/A'),
            data.get('status_stage', 'Pending Review'),
        ))
        conn.commit()
        return patient_id
    except Exception as e:
        print(f'[database/__init__] add_patient error: {e}')
        return 'error-id'
    finally:
        if conn:
            conn.close()


def get_all_patients():
    """Return all patient records from SQLite."""
    conn = None
    try:
        conn = get_connection()
        rows = conn.execute(
            'SELECT * FROM patients ORDER BY created_at DESC'
        ).fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f'[database/__init__] get_all_patients error: {e}')
        return []
    finally:
        if conn:
            conn.close()


def search_patients(query):
    """Search patients by name or ID."""
    conn = None
    try:
        conn = get_connection()
        like_q = f'%{query}%'
        rows = conn.execute(
            'SELECT * FROM patients WHERE patient_name LIKE ? OR patient_id LIKE ? ORDER BY created_at DESC',
            (like_q, like_q)
        ).fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f'[database/__init__] search_patients error: {e}')
        return []
    finally:
        if conn:
            conn.close()


def delete_patient(record_id):
    """Delete a patient by row ID."""
    conn = None
    try:
        conn = get_connection()
        conn.execute('DELETE FROM patients WHERE id = ?', (record_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f'[database/__init__] delete_patient error: {e}')
        return False
    finally:
        if conn:
            conn.close()


def update_patient_field(record_id, field, value):
    """Update a single field on a patient record."""
    allowed_fields = {
        'status_stage', 'notes', 'is_flagged',
        'pathologist_name', 'hospital_name'
    }
    if field not in allowed_fields:
        print(f'[database/__init__] update_patient_field: disallowed field "{field}"')
        return False
    conn = None
    try:
        conn = get_connection()
        conn.execute(
            f'UPDATE patients SET {field} = ? WHERE id = ?',
            (value, record_id)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f'[database/__init__] update_patient_field error: {e}')
        return False
    finally:
        if conn:
            conn.close()
