import jwt
import logging
import functools
from flask import request, jsonify, g, current_app
from config.settings import settings

logger = logging.getLogger(__name__)

def parse_expires_in(value):
    # Convert "8h" / "24h" / "1h" to seconds
    value = str(value).strip().lower()
    if value.endswith('h'):
        return int(value[:-1]) * 3600
    if value.endswith('m'):
        return int(value[:-1]) * 60
    if value.endswith('d'):
        return int(value[:-1]) * 86400
    return int(value)

def require_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        logger.debug(f"Auth header length: {len(auth_header)}")

        if not auth_header:
            logger.warning("Authorization header missing")
            return jsonify({
                'success': False,
                'error': 'No Authorization header found.'
            }), 401

        if not auth_header.startswith('Bearer '):
            logger.warning(f"Malformed auth header: '{auth_header[:10]}...'")
            return jsonify({
                'success': False,
                'error': 'Malformed Authorization header. Must start with Bearer.'
            }), 401

        token = auth_header.split(' ')[1]

        try:
            decoded = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=['HS256']
            )
            g.user = decoded

        except jwt.ExpiredSignatureError:
            logger.info("Token expired")
            return jsonify({
                'success': False,
                'error': 'Session expired. Please login again.'
            }), 401

        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return jsonify({
                'success': False,
                'error': 'Unauthorized: Your session has expired or is invalid. Please login again.'
            }), 401

        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': 'No token provided.'
            }), 401

        token = auth_header.split(' ')[1]

        try:
            decoded = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=['HS256']
            )

            if decoded.get('role') != 'admin':
                return jsonify({
                    'success': False,
                    'error': 'Admin access required.'
                }), 403

            g.user = decoded

        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': False,
                'error': 'Session expired.'
            }), 401

        except jwt.InvalidTokenError:
            return jsonify({
                'success': False,
                'error': 'Invalid token.'
            }), 401

        return f(*args, **kwargs)
    return decorated
