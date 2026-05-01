import os
import sys
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

class Settings:
    def __init__(self):
        self.PORT           = os.getenv('PORT', '5099')
        self.JWT_SECRET     = os.getenv('JWT_SECRET', 'cancer_scan_super_secure_jwt_secret_key_2026_xyz_12345')
        self.JWT_EXPIRES_IN = os.getenv('JWT_EXPIRES_IN', '8h')
        self.BCRYPT_ROUNDS  = int(os.getenv('BCRYPT_ROUNDS', 12))
        self.FRONTEND_URL   = os.getenv('FRONTEND_URL',
                              'http://localhost:5173')
        self.ML_SERVER_URL  = os.getenv('ML_SERVER_URL',
                              'http://localhost:5001')
        
        # Multi-origin CORS support
        raw_origins = os.getenv('ALLOWED_ORIGINS')
        if raw_origins:
            self.ALLOWED_ORIGINS = [o.strip() for o in raw_origins.split(',')]
        else:
            # Fallback to FRONTEND_URL if ALLOWED_ORIGINS is not set
            self.ALLOWED_ORIGINS = [self.FRONTEND_URL]
            
        self.ADMIN_EMAIL    = os.getenv('ADMIN_EMAIL', 'admin@cancerscan.com')
        self.ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'Admin@2025')

    def parse_expires_in(self, value):
        # Convert "8h" / "24h" / "1h" to seconds
        value = str(value).strip().lower()
        if value.endswith('h'):
            return int(value[:-1]) * 3600
        if value.endswith('m'):
            return int(value[:-1]) * 60
        if value.endswith('d'):
            return int(value[:-1]) * 86400
        return int(value)

    def validate(self):
        errors = []

        if not self.PORT:
            errors.append('PORT is not set')

        if not self.JWT_SECRET:
            errors.append('JWT_SECRET is not set')
        elif len(self.JWT_SECRET) < 32:
            errors.append(
                'JWT_SECRET must be at least 32 characters. '
                'Generate: python -c "import secrets; '
                'print(secrets.token_hex(32))"'
            )

        if errors:
            logger.error('CancerScan startup failed.')
            logger.error('Missing or invalid .env variables:')
            for e in errors:
                logger.error(f'   → {e}')
            logger.error('Fill your .env file and restart.')
            sys.exit(1)

        logger.info('Environment variables validated')

settings = Settings()
