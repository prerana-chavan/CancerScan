import jwt
import bcrypt
import datetime
import re
import time
import logging
from collections import defaultdict
from flask import Blueprint, request, jsonify, g, current_app
from database.db import get_connection, log_audit
from middleware.auth_middleware import require_auth, parse_expires_in
from config.settings import settings

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

# ── Rate Limiting (in-memory, per-IP) ─────────────
# Tracks { ip: [timestamp, timestamp, ...] }
_login_attempts = defaultdict(list)
LOGIN_RATE_LIMIT = 5       # max attempts
LOGIN_RATE_WINDOW = 60     # per 60 seconds

def _check_rate_limit(ip):
    """Return True if IP is rate-limited."""
    now = time.time()
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < LOGIN_RATE_WINDOW]
    if len(_login_attempts[ip]) >= LOGIN_RATE_LIMIT:
        return True
    _login_attempts[ip].append(now)
    return False

def make_token(doctor):
    expires_in = parse_expires_in(
        settings.JWT_EXPIRES_IN
    )

    payload = {
        'id':       doctor['id'],
        'email':    doctor['email'],
        'role':     doctor['role'],
        'name':     doctor['full_name'],
        'hospital': doctor['hospital'],
        'exp': datetime.datetime.utcnow() +
               datetime.timedelta(seconds=expires_in)
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm='HS256'
    )

# ── REGISTER ──────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    conn = None
    try:
        data = request.get_json()

        full_name          = (data.get('fullName') or '').strip()
        email              = (data.get('email') or '').strip().lower()
        password           = data.get('password') or ''
        confirm_password   = data.get('confirmPassword') or ''
        medical_license_id = (data.get('medicalLicenseId') or '').strip()
        hospital           = (data.get('hospital') or '').strip()
        specialization     = data.get('specialization', 'Histopathology')

        # Required field check
        if not all([full_name, email, password,
                    confirm_password, medical_license_id, hospital]):
            return jsonify({
                'success': False,
                'error': 'All fields are required'
            }), 400

        # Full name length
        if len(full_name) < 3:
            return jsonify({
                'success': False,
                'error': 'Full name must be at least 3 characters'
            }), 400

        # Email format
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return jsonify({
                'success': False,
                'error': 'Invalid email address format'
            }), 400

        # Password length
        if len(password) < 8:
            return jsonify({
                'success': False,
                'error': 'Password must be at least 8 characters'
            }), 400

        # Password strength
        if not re.search(r'[A-Z]', password):
            return jsonify({
                'success': False,
                'error': 'Password must contain at least one uppercase letter'
            }), 400
        if not re.search(r'[a-z]', password):
            return jsonify({
                'success': False,
                'error': 'Password must contain at least one lowercase letter'
            }), 400
        if not re.search(r'\d', password):
            return jsonify({
                'success': False,
                'error': 'Password must contain at least one number'
            }), 400

        # Passwords match
        if password != confirm_password:
            return jsonify({
                'success': False,
                'error': 'Passwords do not match'
            }), 400

        # License format MD-XXXX-XXXX
        if not re.match(r'^MD-\d{4}-\d{4}$', medical_license_id):
            return jsonify({
                'success': False,
                'error': 'License format must be MD-XXXX-XXXX'
            }), 400

        conn = get_connection()
        cursor = conn.cursor()

        # Check duplicate email
        if cursor.execute(
            'SELECT id FROM doctors WHERE email = ?', (email,)
        ).fetchone():
            return jsonify({
                'success': False,
                'error': 'This email is already registered'
            }), 409

        # Check duplicate license
        if cursor.execute(
            'SELECT id FROM doctors WHERE medical_license_id = ?',
            (medical_license_id,)
        ).fetchone():
            return jsonify({
                'success': False,
                'error': 'This Medical License ID is already registered'
            }), 409

        # Hash password
        rounds = settings.BCRYPT_ROUNDS
        hashed = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt(rounds=rounds)
        ).decode('utf-8')

        cursor.execute('''
            INSERT INTO doctors
                (full_name, email, password_hash, medical_license_id,
                 hospital, specialization, role, is_approved)
            VALUES (?, ?, ?, ?, ?, ?, "doctor", 0)
        ''', (full_name, email, hashed,
              medical_license_id, hospital, specialization))

        conn.commit()

        # Audit: new registration
        log_audit(
            conn,
            event_type  = 'REGISTER',
            category    = 'AUTH',
            actor_name  = full_name,
            action      = 'Doctor Registration',
            detail      = f"New account pending approval: {email}",
            ip_address  = request.remote_addr or 'localhost'
        )

        return jsonify({
            'success': True,
            'message': 'Registration successful. '
                       'Your account is pending admin '
                       'approval. You will be able to '
                       'login once approved.',
            'pending': True
        }), 201
    except Exception as e:
        current_app.logger.error(f"Registration failed: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Registration failed. Please try again.'
        }), 500
    finally:
        if conn:
            conn.close()

# ── LOGIN ──────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    conn = None
    try:
        # Rate limiting: max 5 attempts per minute per IP
        client_ip = request.remote_addr or 'unknown'
        if _check_rate_limit(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return jsonify({
                'success': False,
                'error':   'Too many login attempts. Please wait 60 seconds.'
            }), 429

        data     = request.get_json()
        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({
                'success': False,
                'error':   'Email and password required'
            }), 400

        conn = get_connection()
        doctor = conn.execute(
            '''SELECT id, full_name, email,
               password_hash, role, is_approved,
               is_active, hospital, specialization,
               medical_license_id
               FROM doctors WHERE LOWER(email) = ?''',
            (email.lower(),)
        ).fetchone()

        if not doctor:
            log_audit(
                conn,
                event_type  = 'LOGIN_FAIL',
                category    = 'AUTH',
                actor_name  = email or 'Unknown',
                action      = 'Failed Login Attempt',
                detail      = f"Invalid credentials for: {email}",
                ip_address  = request.remote_addr or 'localhost'
            )
            return jsonify({
                'success': False,
                'error':   'Invalid email or password'
            }), 401

        # Check password
        pw_ok = bcrypt.checkpw(
            password.encode(),
            doctor['password_hash'].encode()
        )

        if not pw_ok:
            log_audit(
                conn,
                event_type  = 'LOGIN_FAIL',
                category    = 'AUTH',
                actor_id    = str(doctor['id']),
                actor_name  = doctor['full_name'],
                action      = 'Failed Login Attempt',
                detail      = f"Invalid credentials for: {email}",
                ip_address  = request.remote_addr or 'localhost'
            )
            return jsonify({
                'success': False,
                'error':   'Invalid email or password'
            }), 401

        # Check active
        if not doctor['is_active']:
            return jsonify({
                'success': False,
                'error':   'Account has been deactivated'
            }), 403

        # Only block unapproved DOCTORS — admin is never blocked
        if doctor['role'] != 'admin' and \
           not doctor['is_approved']:
            return jsonify({
                'success':    False,
                'error':      'pending_approval',
                'pending':    True,
                'message':    'Your account is pending '
                              'admin approval.'
            }), 403

        # Generate JWT — 8-hour expiry for HIPAA compliance
        payload = {
            'id':       doctor['id'],
            'email':    doctor['email'],
            'name':     doctor['full_name'],
            'role':     doctor['role'],
            'hospital': doctor['hospital'],
            'exp':      datetime.datetime.utcnow()
                      + datetime.timedelta(hours=8)
        }
        token = jwt.encode(
            payload,
            settings.JWT_SECRET,
            algorithm='HS256'
        )

        # Update last login
        conn.execute(
            "UPDATE doctors SET last_login=datetime('now') WHERE id=?",
            (doctor['id'],)
        )
        conn.commit()

        # Audit log for successful login
        log_audit(
            conn,
            event_type  = 'LOGIN',
            category    = 'AUTH',
            actor_id    = str(doctor['id']),
            actor_name  = doctor['full_name'],
            action      = 'User Login',
            detail      = f"Session started on "
                          f"{'Admin Portal' if doctor['role'] == 'admin' else 'Doctor Portal'}",
            ip_address  = request.remote_addr or 'localhost'
        )

        return jsonify({
            'success': True,
            'token':   token,
            'user': {
                'id':               doctor['id'],
                'fullName':         doctor['full_name'],
                'email':            doctor['email'],
                'role':             doctor['role'],
                'hospital':         doctor['hospital'],
                'specialization':   doctor['specialization'],
                'medicalLicenseId': doctor['medical_license_id'],
                'isApproved':       bool(doctor['is_approved']),
            }
        })
    except Exception as e:
        current_app.logger.error(f"Login failure: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error':   'Server error. Please try again.'
        }), 500
    finally:
        if conn:
            conn.close()

# ── GET CURRENT USER ───────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    conn = None
    try:
        conn = get_connection()
        doctor = conn.execute('''
            SELECT id, full_name, email, role,
                   hospital, specialization,
                   medical_license_id, last_login
            FROM doctors
            WHERE id = ? AND is_active = 1
        ''', (g.user['id'],)).fetchone()

        if not doctor:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        return jsonify({
            'success': True,
            'data': {
                'id':               doctor['id'],
                'fullName':         doctor['full_name'],
                'email':            doctor['email'],
                'role':             doctor['role'],
                'hospital':         doctor['hospital'],
                'specialization':   doctor['specialization'],
                'medicalLicenseId': doctor['medical_license_id'],
                'lastLogin':        doctor['last_login'],
            }
        })
    except Exception as e:
        current_app.logger.error(f"Profile fetch error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve profile.'
        }), 500
    finally:
        if conn:
            conn.close()

# ── LOGOUT ─────────────────────────────────────────
@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    conn = None
    try:
        conn = get_connection()
        log_audit(
            conn,
            event_type  = 'LOGOUT',
            category    = 'AUTH',
            actor_id    = str(g.user['id']),
            actor_name  = g.user.get('name', 'Unknown'),
            action      = 'User Logout',
            detail      = 'Session terminated',
            ip_address  = request.remote_addr or 'localhost'
        )
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        })
    except Exception as e:
        current_app.logger.error(f"Logout error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Logout failed'}), 500
    finally:
        if conn:
            conn.close()

# ── CHANGE PASSWORD ────────────────────────────────
@auth_bp.route('/change-password', methods=['POST'])
@require_auth
def change_password():
    conn = None
    try:
        data            = request.get_json()
        current_pw      = data.get('currentPassword', '')
        new_pw          = data.get('newPassword', '')

        if not current_pw or not new_pw:
            return jsonify({
                'success': False,
                'error': 'Both passwords required'
            }), 400

        if len(new_pw) < 8:
            return jsonify({
                'success': False,
                'error': 'Password must be at least 8 characters'
            }), 400

        conn = get_connection()
        doctor = conn.execute(
            'SELECT id, password_hash FROM doctors WHERE id = ?',
            (g.user['id'],)
        ).fetchone()

        if not bcrypt.checkpw(
            current_pw.encode(),
            doctor['password_hash'].encode()
        ):
            return jsonify({
                'success': False,
                'error': 'Current password is incorrect'
            }), 401

        new_hash = bcrypt.hashpw(
            new_pw.encode(), bcrypt.gensalt()
        ).decode()

        conn.execute(
            'UPDATE doctors SET password_hash = ? WHERE id = ?',
            (new_hash, g.user['id'])
        )
        conn.commit()

        # Audit: password changed
        log_audit(
            conn,
            event_type  = 'PASSWORD',
            category    = 'AUTH',
            actor_id    = str(g.user['id']),
            actor_name  = g.user.get('name', 'Unknown'),
            action      = 'Password Changed',
            detail      = 'Account password updated successfully',
            ip_address  = request.remote_addr or 'localhost'
        )

        return jsonify({
            'success': True,
            'message': 'Password updated successfully'
        })
    except Exception as e:
        current_app.logger.error(f"Change password error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal system error.'
        }), 500
    finally:
        if conn:
            conn.close()

# ── FORGOT PASSWORD (Request OTP) ─────────────────
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    conn = None
    try:
        data  = request.get_json()
        email = (data.get('email') or '').strip().lower()

        if not email:
            return jsonify({
                'success': False,
                'error':   'Email is required'
            }), 400

        conn = get_connection()
        doctor = conn.execute(
            'SELECT id, full_name, email, role '
            'FROM doctors '
            'WHERE LOWER(email) = ?',
            (email,)
        ).fetchone()

        if not doctor:
            # Security: don't reveal if email exists
            return jsonify({
                'success':   True,
                'message':   'If this email exists, '
                             'OTP has been generated.',
                'debug_otp': None
            })

        # Generate 6-digit OTP
        import random
        otp = str(random.randint(100000, 999999))

        # Expire in 10 minutes
        expires = (
            datetime.datetime.now() +
            datetime.timedelta(minutes=10)
        ).strftime('%Y-%m-%d %H:%M:%S')

        # Delete any existing unused OTPs for this email
        conn.execute(
            'DELETE FROM password_reset_tokens '
            'WHERE email = ?',
            (email,)
        )

        # Save new OTP
        conn.execute(
            '''INSERT INTO password_reset_tokens
               (doctor_id, email, otp, expires_at)
               VALUES (?, ?, ?, ?)''',
            (str(doctor['id']), email, otp, expires)
        )
        conn.commit()

        logger.info(f'OTP generated for {email}')

        # Since no email server: return OTP directly (academic project)
        return jsonify({
            'success':   True,
            'message':   'OTP generated successfully',
            'debug_otp': otp,
            'name':      doctor['full_name'],
        })
    except Exception as e:
        current_app.logger.error(f"Forgot password error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal system error.'
        }), 500
    finally:
        if conn:
            conn.close()

# ── RESET PASSWORD (Verify OTP + Update) ──────────
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    conn = None
    try:
        data     = request.get_json()
        email    = (data.get('email') or '').strip().lower()
        otp      = (data.get('otp') or '').strip()
        new_pw   = data.get('newPassword') or ''
        confirm  = data.get('confirmPassword') or ''

        # Validation
        if not all([email, otp, new_pw, confirm]):
            return jsonify({
                'success': False,
                'error':   'All fields required'
            }), 400

        if new_pw != confirm:
            return jsonify({
                'success': False,
                'error':   'Passwords do not match'
            }), 400

        if len(new_pw) < 8:
            return jsonify({
                'success': False,
                'error':   'Minimum 8 characters'
            }), 400

        if not re.search(r'[A-Z]', new_pw):
            return jsonify({
                'success': False,
                'error':   'Need uppercase letter'
            }), 400
        if not re.search(r'[0-9]', new_pw):
            return jsonify({
                'success': False,
                'error':   'Need a number'
            }), 400

        conn = get_connection()

        # Find valid OTP
        now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        token = conn.execute(
            '''SELECT * FROM password_reset_tokens
               WHERE email = ?
               AND otp = ?
               AND used = 0
               AND expires_at > ?''',
            (email, otp, now)
        ).fetchone()

        if not token:
            return jsonify({
                'success': False,
                'error':   'Invalid or expired OTP. '
                           'Please request a new one.'
            }), 400

        # Hash new password
        new_hash = bcrypt.hashpw(
            new_pw.encode(),
            bcrypt.gensalt()
        ).decode()

        # Update password
        conn.execute(
            'UPDATE doctors '
            'SET password_hash = ? '
            'WHERE id = ?',
            (new_hash, token['doctor_id'])
        )

        # Mark OTP as used
        conn.execute(
            'UPDATE password_reset_tokens '
            'SET used = 1 '
            'WHERE id = ?',
            (token['id'],)
        )

        conn.commit()

        # Log to audit
        try:
            log_audit(
                conn,
                event_type = 'PASSWORD',
                category   = 'AUTH',
                actor_id   = token['doctor_id'],
                actor_name = email,
                action     = 'Password Reset',
                detail     = 'Password reset via OTP',
                ip_address = request.remote_addr
                             or 'localhost'
            )
        except Exception:
            pass

        logger.info(f'Password reset completed for: {email}')

        return jsonify({
            'success': True,
            'message': 'Password reset successfully! '
                       'You can now login.'
        })
    except Exception as e:
        current_app.logger.error(f"Reset password error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error':   'Internal server error.'
        }), 500
    finally:
        if conn:
            conn.close()

# ── TOKEN REFRESH ─────────────────────────────────
@auth_bp.route('/refresh', methods=['POST'])
@require_auth
def refresh_token():
    """Issue a new JWT with a fresh 8-hour expiry from a valid (non-expired) token."""
    try:
        user = g.user  # already decoded by require_auth

        new_payload = {
            'id':       user['id'],
            'email':    user['email'],
            'name':     user.get('name', ''),
            'role':     user['role'],
            'hospital': user.get('hospital', ''),
            'exp':      datetime.datetime.utcnow()
                      + datetime.timedelta(hours=8)
        }
        new_token = jwt.encode(
            new_payload,
            settings.JWT_SECRET,
            algorithm='HS256'
        )

        logger.info(f"Token refreshed for user {user['id']}")

        return jsonify({
            'success': True,
            'token':   new_token
        })
    except Exception as e:
        current_app.logger.error(f"Token refresh failed: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error':   'Token refresh failed.'
        }), 500
