import os
import math
import random
import logging
import mimetypes
import tempfile
import requests
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app
from database.db import get_connection, log_audit
from middleware.auth_middleware import require_auth
from config.settings import settings

logger = logging.getLogger(__name__)
analysis_bp = Blueprint('analysis', __name__)

# Slide images must persist in uploads/slides/ for patient record viewing.
# app.py serves them from this path via /api/images/slides/<filename>.
UPLOAD_FOLDER = os.path.join(
    os.path.dirname(__file__), '..', 'uploads', 'slides'
)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
ALLOWED_MIMETYPES = {'image/jpeg', 'image/png'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_ids(date_str=None):
    ts    = int(datetime.utcnow().timestamp() * 1000)
    rand4 = random.randint(1000, 9999)
    year  = datetime.utcnow().year
    ds    = datetime.utcnow().strftime('%Y%m%d')

    return {
        'clinical_id':   f'P-{str(ts)[-9:]}',
        'report_id':     f'REP-{year}-{rand4}',
        'slide_ref_id':  f'WSI-{ds}-{rand4}'
    }

# POST /api/analysis/predict
@analysis_bp.route('/predict', methods=['POST'])
@require_auth
def predict():
    try:
        # ── Validate slide image ──────────────────
        if 'slideImage' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No slide image provided'
            }), 400
            
        file = request.files['slideImage']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Empty filename'
            }), 400

        # Validate mandatory field: patientName (referenced as patient_id in prompt request)
        # Assuming patient_id refers to the provided name for lookup or record tagging
        patient_name_req = request.form.get('patientName') or request.form.get('patient_id')
        if not patient_name_req:
            return jsonify({
                'success': False,
                'error': 'patient_id or patientName is required'
            }), 400

        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': 'Only JPG and PNG files are allowed'
            }), 400

        # MIME type validation (defense-in-depth)
        mime_type = file.content_type or mimetypes.guess_type(file.filename)[0]
        if mime_type not in ALLOWED_MIMETYPES:
            return jsonify({
                'success': False,
                'error': f'Invalid MIME type: {mime_type}. Only image/jpeg and image/png are accepted.'
            }), 400

        # ── Save file temporarily ──────────────────
        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename)
        timestamp = int(datetime.utcnow().timestamp())
        unique_name = f'{timestamp}_{filename}'
        file_path   = os.path.join(UPLOAD_FOLDER, unique_name)
        file.save(file_path)

        # ── Extract patient form data ──────────────
        form = request.form
        patient_name     = form.get('patientName', '').strip()
        age_raw          = form.get('age', '0')
        date             = form.get('date', '')
        gender           = form.get('gender', '')
        smoking_history  = form.get('smokingHistory', '')
        specimen_type    = form.get('specimenType', '')
        referral_source  = form.get('referralSource', '')
        clinical_history = form.get('clinicalHistory', '')
        hospital_network = form.get('hospitalNetwork', '')

        # Safe age conversion
        try:
            age = int(age_raw)
        except (ValueError, TypeError):
            age = 0

        # ── Forward to ML Engine (api_server.py) ──
        # DO NOT change anything about how models work
        # Just proxy the image to existing ML server
        try:
            with open(file_path, 'rb') as img:
                ml_response = requests.post(
                    f'{settings.ML_SERVER_URL}/predict',
                    files={'image': (unique_name, img, file.content_type)},
                    data={'age': str(age), 'gender': gender},
                    timeout=120
                )

            logger.info(f"ML status code: {ml_response.status_code}")
            logger.debug(f"ML response length: {len(ml_response.text)}")

            # Guard against empty or non-JSON response
            if not ml_response.text or not ml_response.text.strip():
                if os.path.exists(file_path):
                    os.remove(file_path)
                return jsonify({
                    'success': False,
                    'error': 'ML server returned empty response. '
                             'Check that api_server.py is running '
                             'and has no crashes.'
                }), 500

            try:
                ml_result = ml_response.json()
            except Exception as json_err:
                logger.error(f"JSON parse failed: {json_err}")
                logger.debug(f"Raw ML response: {ml_response.text[:500]}")
                if os.path.exists(file_path):
                    os.remove(file_path)
                return jsonify({
                    'success': False,
                    'error': f'ML server response was not valid JSON: '
                             f'{ml_response.text[:200]}'
                }), 500

            if not ml_result.get('success'):
                error_msg = ml_result.get('error', 'ML prediction failed')
                logger.warning(f"ML returned error: {error_msg}")
                if os.path.exists(file_path):
                    os.remove(file_path)
                # Return 422 for invalid slide, 500 for other errors
                status_code = 422 if 'histopathology' in error_msg.lower() else 500
                return jsonify({
                    'success': False,
                    'error': error_msg
                }), status_code

        except requests.exceptions.ConnectionError:
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({
                'success': False,
                'error': 'ML engine is not running. '
                         'Please start api_server.py first.'
            }), 503

        except requests.exceptions.Timeout:
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({
                'success': False,
                'error': 'ML inference timed out. '
                         'Please try again.'
            }), 504

        # ── Generate IDs ───────────────────────────
        ids = generate_ids()

        # ── Read ML result safely ─────────────────────
        # Fallback to checking the string prediction if is_cancer explicit boolean is missing
        is_cancer = ml_result.get('is_cancer')
        if is_cancer is None:
            pred_str = str(ml_result.get('prediction', '')).lower()
            is_cancer = 'cancer' in pred_str and 'no cancer' not in pred_str
        else:
            is_cancer = bool(is_cancer)
        
        # Use is_cancer as single source of truth NOT the string prediction field
        ai_diagnosis = 'Cancer Detected' if is_cancer else 'Benign'

        raw_conf = float(ml_result.get('confidence', 0) or 0)
        if raw_conf <= 1.0:
            probability = round(raw_conf * 100, 1)
        else:
            probability = round(raw_conf, 1)

        logger.info(f"parsed is_cancer: {is_cancer}")
        logger.info(f"parsed ai_diagnosis: {ai_diagnosis}")
        logger.info(f"parsed probability: {probability}%")

        # Subtype — only meaningful if cancer
        subtype_val = None
        subtype_abbr = None
        sub_conf    = 0.0
        
        if is_cancer:
            subtype_data = ml_result.get('subtype') or {}
            subtype_val  = str(subtype_data.get('type') or ml_result.get('subtype') or '').strip()
            subtype_abbr = str(subtype_data.get('abbreviation') or '')
            
            raw_sc = float(subtype_data.get('confidence') or ml_result.get('subtype_confidence') or 0)
            if raw_sc <= 1.0:
                sub_conf = round(raw_sc * 100, 1)
            else:
                sub_conf = round(raw_sc, 1)

        # Survival — only meaningful if cancer
        surv_prob   = 0.0
        surv_months = 0
        risk_cat    = None
        
        if is_cancer:
            survival_data = ml_result.get('survival') or {}
            raw_sp = float(survival_data.get('5_year_survival_rate') or ml_result.get('survival_probability') or 0)
            if raw_sp <= 1.0:
                surv_prob = round(raw_sp * 100, 1)
            else:
                surv_prob = round(raw_sp, 1)
                
            surv_months = int(survival_data.get('predicted_months') or ml_result.get('survival_months') or 0)
            risk_cat    = str(survival_data.get('risk_category') or ml_result.get('risk_category') or '').strip()

        # ── Save to database ───────────────────────
        conn = None
        try:
            conn = get_connection()
            conn.execute('''
                INSERT INTO patients (
                    patient_id, report_id, patient_name, age, diagnosis_date, gender,
                    smoking_history, specimen_type, hospital_name, pathologist_name,
                    image_path, prediction_result, subtype,
                    subtype_confidence, survival_months, risk_category,
                    survival_probability, status_stage, probability, doctor_id,
                    clinical_history
                ) VALUES (
                    ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
                )
            ''', (
                ids['clinical_id'], ids['report_id'], patient_name, int(age), date, gender,
                smoking_history, specimen_type, hospital_network, g.user['name'],
                unique_name, ai_diagnosis, subtype_val,
                sub_conf, surv_months, risk_cat,
                surv_prob, 'Pending Review', probability, g.user['id'],
                clinical_history
            ))
            conn.commit()

            # Audit log for scan analysis
            log_audit(
                conn,
                event_type  = 'SCAN',
                category    = 'ML ENGINE',
                actor_id    = str(g.user['id']),
                actor_name  = g.user.get('name', 'Unknown'),
                action      = 'Scan Analysis',
                detail      = f"Executed diagnostic for "
                              f"{patient_name} "
                              f"(Result: {ai_diagnosis})",
                target_id   = ids['clinical_id'],
                ip_address  = request.remote_addr or 'localhost'
            )
        except Exception as e:
            current_app.logger.error(f"Internal error in run_analysis: {e}", exc_info=True)
            return jsonify({'success': False, 'error': f'Database error: {str(e)}'}), 500
        finally:
            if conn:
                conn.close()

        # ── Return result to React ─────────────────
        return jsonify({
            'success':       True,
            
            # Canonical Mapping
            'patient_id':    ids['clinical_id'],
            'report_id':     ids['report_id'],
            'full_name':     patient_name,
            'age':           int(age),
            'gender':        gender,
            'ai_diagnosis':  ai_diagnosis,
            'probability':   probability,
            'status':        'Pending Review',
            'created_at':    datetime.utcnow().isoformat(),
            
            # Legacy/Internal Mappings (to avoid breaking current UI expectations)
            'reportId':      ids['report_id'],
            'slideRefId':    ids['slide_ref_id'],
            'aiDiagnosis':   ai_diagnosis,
            'subtype':       subtype_val,
            'subtype_confidence': sub_conf,
            'subtypeAbbr':   subtype_abbr,
            'survivalMonths': surv_months,
            'survival_probability': surv_prob,
            'riskCategory':  risk_cat,
            'uploaded_image_path': unique_name,
            'mlDetails':     ml_result
        })

    except Exception as e:
        current_app.logger.error(f"Analysis prediction failed: {e}", exc_info=True)
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({
            'success': False,
            'error': 'Analysis failed. Please try again later.'
        }), 500
