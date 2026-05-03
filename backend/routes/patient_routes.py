from flask import Blueprint, request, jsonify, g, current_app
from database.db import get_connection, log_audit
from middleware.auth_middleware import require_auth
import os
import logging

logger = logging.getLogger(__name__)
patient_bp = Blueprint('patients', __name__)

def serialize_patient(row):
    """Single source of truth for patient field names sent to frontend.
    
    HIPAA/PII NOTICE: Fields marked [PII] contain Protected Health Information.
    Any access, modification, or export of these fields MUST be audit-logged.
    """
    keys = row.keys() if hasattr(row, 'keys') else []
    
    d = {
        "id":               row["id"],
        "patient_id":       row["patient_id"],          # [PII] Clinical identifier
        "report_id":        row["report_id"] if "report_id" in keys else None,
        "full_name":        row["patient_name"],         # [PII] Patient full name
        "age":              row["age"],                   # [PII] Patient age
        "gender":           row["gender"],                # [PII] Patient gender
        "smoking_history":  row["smoking_history"],       # [PII] Medical history
        "specimen_type":    row["specimen_type"] if "specimen_type" in keys else None,
        "hospital":         row["hospital_name"],
        "attending_pathologist": row["pathologist_name"], # [PII] Doctor name
        "diagnosis_date":   row["diagnosis_date"],        # [PII] Date of diagnosis
        "ai_diagnosis":     row["prediction_result"],     # [PII] Diagnosis result
        "probability":      row["probability"] if "probability" in keys else 0,
        
        # New ML Result Fields mapping
        "subtype":              row["subtype"] if "subtype" in keys and row["subtype"] is not None else (row["subtype_result"] if "subtype_result" in keys else None),
        "subtype_confidence":   row["subtype_confidence"] if "subtype_confidence" in keys and row["subtype_confidence"] is not None else 0,
        "survival_probability": row["survival_probability"] if "survival_probability" in keys and row["survival_probability"] is not None else 0,
        "survival_months":      row["survival_months"] if "survival_months" in keys and row["survival_months"] is not None else 0,
        "risk_category":        row["risk_category"] if "risk_category" in keys and row["risk_category"] is not None else None,
        
        # Legacy/old table maps
        "subtype_result":   row["subtype_result"] if "subtype_result" in keys else None,
        "survival_rate":    row["survival_rate"] if "survival_rate" in keys else None,
        
        "status":           row["status_stage"],
        "notes":            row["notes"],                 # [PII] Clinical notes
        "clinical_history": row["clinical_history"] if "clinical_history" in keys else "",      # [PII] Medical history
        "uploaded_image":   row["image_path"],            # [PII] Pathology slide
        "created_at":       row["created_at"],
        "doctor_id":        row["doctor_id"]
    }
    
    # Optional fields from admin joins
    if "doctor_name" in keys:
        d["doctor_name"] = row["doctor_name"]
    if "doctor_hospital" in keys:
        d["doctor_hospital"] = row["doctor_hospital"]
    if "priority" in keys:
        d["priority"] = row["priority"]
    if "telemetry" in keys:
        d["telemetry"] = row["telemetry"]
    if "status" in keys and row["status"] is not None:
        # Override if 'status' alias exists (e.g. from admin query)
        d["status"] = row["status"]
        
    return d

# ── CREATE NEW PATIENT ─────────────────────────────
@patient_bp.route('', methods=['POST'])
@require_auth
def create_patient():
    conn = None
    try:
        data = request.get_json()
        
        # ── Input Validation ───────────────────────
        required_fields = ['patientName', 'age', 'gender']
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
            
        age_val = data.get('age')
        try:
            age = int(age_val)
            if not (0 < age < 130):
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({"error": "Age must be a valid number between 1 and 129"}), 400
        # ───────────────────────────────────────────

        # Extract fields from frontend model
        clinical_id             = data.get('clinicalId')
        report_id               = data.get('reportId')
        slide_ref_id            = data.get('slideRefId')
        patient_name            = data.get('patientName')
        # age already assigned above
        date                    = data.get('date')
        gender                  = data.get('gender')
        smoking_history         = data.get('smokingHistory')
        specimen_type           = data.get('specimenType')
        referral_source         = data.get('referralSource')
        clinical_history        = data.get('clinicalHistory', '')
        attending_pathologist   = data.get('attendingPathologist')
        hospital_network        = data.get('hospitalNetwork')
        ai_diagnosis            = data.get('aiDiagnosis')
        probability             = data.get('probability')
        uploaded_image_path     = data.get('uploadedImage') # Storing base64 for now as per frontend

        conn = get_connection()
        cursor = conn.execute('''
            INSERT INTO patients (
                patient_id, report_id, patient_name, age, diagnosis_date, gender, 
                smoking_history, specimen_type, pathologist_name, hospital_name,
                prediction_result, image_path, status_stage, doctor_id,
                clinical_history
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            clinical_id,
            report_id,
            patient_name,
            age,
            date,
            gender,
            smoking_history,
            specimen_type,
            attending_pathologist,
            hospital_network,
            ai_diagnosis,
            uploaded_image_path,
            'Pending Review',
            g.user.get('id'),
            clinical_history
        ))
        new_id = cursor.lastrowid
        conn.commit()

        return jsonify({'success': True, 'id': new_id, 'patient_id': clinical_id}), 201
    except Exception as e:
        current_app.logger.error(f"Internal error in create_patient: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'An internal server error occurred. Please try again.'}), 500
    finally:
        if conn:
            conn.close()

# ── GET ALL PATIENTS (for logged-in doctor) ────────
@patient_bp.route('/', methods=['GET'])
@patient_bp.route('', methods=['GET'])
@require_auth
def get_patients():
    conn = None
    try:
        # Admin should never call this route
        # Admin uses /api/admin/patients
        if g.user.get('role') == 'admin':
            return jsonify({
                'success':  True,
                'patients': [],
                'total':    0
            })

        conn = get_connection()

        # Get doctor_id safely
        doctor_id = g.user.get('id')
        if not doctor_id:
            return jsonify({
                'success':  True,
                'patients': [],
                'total':    0
            })

        patients = conn.execute(
            '''SELECT * FROM patients
            WHERE doctor_id = ?
            ORDER BY created_at DESC''',
            (str(doctor_id),)
        ).fetchall()

        result = [serialize_patient(p) for p in patients]

        # Audit log: record access for HIPAA compliance
        if result:
            log_audit(
                conn,
                event_type  = 'ACCESS',
                category    = 'PATIENT DB',
                actor_id    = str(doctor_id),
                actor_name  = g.user.get('name', 'Unknown'),
                action      = 'Patient Records Access',
                detail      = f"Accessed {len(result)} patient records",
                ip_address  = request.remote_addr or 'localhost'
            )

        return jsonify({
            'success':  True,
            'patients': result,
            'total':    len(result)
        })
    except Exception as e:
        current_app.logger.error(f"Failed to fetch patient list: {e}", exc_info=True)
        return jsonify({
            'success':  False,
            'patients': [],
            'total':    0,
            'error':    'Failed to load patient records. Please contact support.'
        }), 500
    finally:
        if conn:
            conn.close()

# ── UPDATE REVIEW STATUS ───────────────────────────
@patient_bp.route('/<clinical_id>/status', methods=['PATCH'])
@require_auth
def update_status(clinical_id):
    conn = None
    try:
        data   = request.get_json()
        status = data.get('reviewStatus')

        valid = [
            'Pending Review', 'Under Review',
            'Confirmed', 'Referred', 'Discharged'
        ]
        if status not in valid:
            return jsonify({
                'success': False,
                'error': 'Invalid review status'
            }), 400

        conn = get_connection()
        conn.execute('''
            UPDATE patients SET status_stage=?
            WHERE patient_id=? AND doctor_id=?
        ''', (status, clinical_id, g.user.get('id')))
        conn.commit()

        # Audit log for status update
        log_audit(
            conn,
            event_type  = 'SCAN',
            category    = 'PATIENT DB',
            actor_id    = str(g.user['id']),
            actor_name  = g.user.get('name', 'Unknown'),
            action      = 'Clinical Update',
            detail      = f"Shifted status for {clinical_id} to {status}",
            target_id   = clinical_id,
            ip_address  = request.remote_addr or 'localhost'
        )

        return jsonify({'success': True})
    except Exception as e:
        current_app.logger.error(f"Internal error in update_status: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to update status.'}), 500
    finally:
        if conn:
            conn.close()

# ── UPDATE CLINICAL NOTES ──────────────────────────
@patient_bp.route('/<clinical_id>/notes', methods=['PATCH'])
@require_auth
def update_notes(clinical_id):
    conn = None
    try:
        data  = request.get_json()
        # Frontend sends notes as 'notes' in PatientContext.jsx but 'clinicalNotes' in some parts
        notes = data.get('notes') or data.get('clinicalNotes', '')

        conn = get_connection()
        conn.execute('''
            UPDATE patients SET notes=?
            WHERE patient_id=? AND doctor_id=?
        ''', (notes, clinical_id, g.user.get('id')))
        conn.commit()

        # Audit log for notes update
        log_audit(
            conn,
            event_type  = 'SCAN',
            category    = 'PATIENT DB',
            actor_id    = str(g.user['id']),
            actor_name  = g.user.get('name', 'Unknown'),
            action      = 'Clinical Annotation',
            detail      = f"Amended clinical notes for registry {clinical_id}",
            target_id   = clinical_id,
            ip_address  = request.remote_addr or 'localhost'
        )

        return jsonify({'success': True})
    except Exception as e:
        current_app.logger.error(f"Internal error in update_notes: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to update notes.'}), 500
    finally:
        if conn:
            conn.close()

# ── HARD DELETE (No is_deleted column) ─────────────
@patient_bp.route('/<patient_id>', methods=['DELETE'])
@require_auth
def delete_patient(patient_id):
    conn = None
    try:
        conn = get_connection()

        # Handle PostgreSQL strict typing (cannot compare string 'P-...' to integer id)
        if str(patient_id).startswith('P-') or not str(patient_id).isdigit():
            where_col = 'patient_id'
            param_val = patient_id
        else:
            where_col = 'id'
            param_val = int(patient_id)

        # Verify patient belongs to this doctor before deleting
        patient = conn.execute(
            f'SELECT id, patient_id, patient_name, doctor_id '
            f'FROM patients '
            f'WHERE {where_col} = ? '
            f'AND doctor_id = ?',
            (param_val, g.user.get('id'))
        ).fetchone()

        if not patient:
            return jsonify({
                'success': False,
                'error':   'Patient not found or access denied'
            }), 404

        # Delete permanently from DB
        cursor = conn.execute(
            f'DELETE FROM patients '
            f'WHERE {where_col} = ? '
            f'AND doctor_id = ?',
            (param_val, g.user.get('id'))
        )
        deleted_rows = cursor.rowcount
        conn.commit()

        logger.info(f'Permanently removed: '
              f'{patient_id} '
              f'({deleted_rows} rows)')

        # Audit log
        try:
            from database.db import log_audit
            log_audit(
                conn,
                event_type = 'DELETE',
                category   = 'PATIENT DB',
                actor_id   = str(g.user['id']),
                actor_name = g.user.get(
                    'name', 'Unknown'),
                action     = 'Registry Deletion',
                detail     = f'Hard-purged '
                    f'clinical record for '
                    f'ID: {patient_id}',
                target_id  = patient_id,
                ip_address = request.remote_addr
                             or 'localhost'
            )
        except Exception as ae:
            logger.error(f'Audit log error: {ae}')

        return jsonify({
            'success': True,
            'message': f'Patient {patient_id} '
                       f'permanently deleted',
            'deleted_id': patient_id
        })
    except Exception as e:
        current_app.logger.error(f"Internal error in delete_patient: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error':   'An internal server error occurred.'
        }), 500
    finally:
        if conn:
            conn.close()

# ── BULK DELETE ALL PATIENTS ───────────────────────
@patient_bp.route('', methods=['DELETE'])
@require_auth
def delete_all_patients():
    conn = None
    try:
        conn = get_connection()
        conn.execute('''
            DELETE FROM patients 
            WHERE doctor_id=?
        ''', (g.user.get('id'),))
        conn.commit()

        # Audit log for bulk deletion
        log_audit(
            conn,
            event_type  = 'DELETE',
            category    = 'PATIENT DB',
            actor_id    = str(g.user['id']),
            actor_name  = g.user.get('name', 'Unknown'),
            action      = 'Clinical Purge',
            detail      = 'Bulk-deleted ALL records from diagnostic registry',
            ip_address  = request.remote_addr or 'localhost'
        )

        return jsonify({'success': True})
    except Exception as e:
        current_app.logger.error(f"Internal error in delete_all_patients: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to delete records.'}), 500
    finally:
        if conn:
            conn.close()




