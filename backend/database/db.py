import sqlite3
import os
import uuid

DB_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'cancerscan.db'
)

def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA foreign_keys=ON')
    return conn

def init_db():
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Doctors table — login accounts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS doctors (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name           TEXT NOT NULL,
                email               TEXT UNIQUE NOT NULL,
                password_hash       TEXT NOT NULL,
                medical_license_id  TEXT UNIQUE NOT NULL,
                hospital            TEXT NOT NULL,
                specialization      TEXT DEFAULT "Histopathology",
                role                TEXT DEFAULT "doctor",
                is_approved         INTEGER DEFAULT 0,
                is_active           INTEGER DEFAULT 1,
                login_attempts      INTEGER DEFAULT 0,
                lock_until          TEXT,
                last_login          TEXT,
                created_at          TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Patients table — all records + ML results
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patients (
                id                      INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id              TEXT UNIQUE NOT NULL,
                report_id               TEXT UNIQUE,
                patient_name            TEXT NOT NULL,
                age                     INTEGER,
                gender                  TEXT,
                smoking_history         TEXT,
                specimen_type           TEXT,
                diagnosis_date          TEXT,
                hospital_name           TEXT,
                pathologist_name        TEXT,
                image_path              TEXT,
                prediction_result       TEXT,
                subtype_result          TEXT,
                survival_rate           REAL,
                created_at              TEXT DEFAULT CURRENT_TIMESTAMP,
                status_stage            TEXT DEFAULT "Pending Review",
                notes                   TEXT DEFAULT "",
                clinical_history        TEXT DEFAULT "",
                is_flagged              INTEGER DEFAULT 0,
                doctor_id               INTEGER,
                FOREIGN KEY (doctor_id) REFERENCES doctors(id)
            )
        ''')

        # Audit log — comprehensive security trail
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                evt_id      TEXT    NOT NULL,
                event_type  TEXT    NOT NULL,
                category    TEXT    NOT NULL,
                actor_id    TEXT,
                actor_name  TEXT    NOT NULL,
                action      TEXT    NOT NULL,
                detail      TEXT    NOT NULL,
                target_id   TEXT,
                ip_address  TEXT    DEFAULT 'localhost',
                created_at  TEXT    DEFAULT (datetime('now','localtime'))
            )
        ''')

        # Password reset OTP tokens
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                doctor_id   TEXT    NOT NULL,
                email       TEXT    NOT NULL,
                otp         TEXT    NOT NULL,
                expires_at  TEXT    NOT NULL,
                used        INTEGER DEFAULT 0,
                created_at  TEXT    DEFAULT (datetime('now','localtime'))
            )
        ''')

        # Migration: add probability column if not present
        try:
            cursor.execute(
                "ALTER TABLE patients ADD COLUMN probability REAL DEFAULT NULL"
            )
        except Exception:
            pass  # column already exists

        migrate_db()

        conn.commit()
        print('✅ SQLite database ready: cancerscan.db')
    finally:
        if conn:
            conn.close()

def migrate_db():
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Add password_hash column if missing (legacy rename)
        try:
            cursor.execute(
                'ALTER TABLE doctors RENAME COLUMN password TO password_hash'
            )
            print('[DB] Renamed password to password_hash')
        except Exception:
            pass  # Already renamed or doesn't exist

        # Add is_approved column if missing
        try:
            cursor.execute(
                'ALTER TABLE doctors ADD COLUMN '
                'is_approved INTEGER DEFAULT 0'
            )
            print('[DB] Added is_approved column')
        except Exception:
            pass  # Already exists

        # Add role column if missing
        try:
            cursor.execute(
                'ALTER TABLE doctors ADD COLUMN '
                'role TEXT DEFAULT "doctor"'
            )
            print('[DB] Added role column')
        except Exception:
            pass

        # Add is_active column if missing
        try:
            cursor.execute(
                'ALTER TABLE doctors ADD COLUMN '
                'is_active INTEGER DEFAULT 1'
            )
            print('[DB] Added is_active column')
        except Exception:
            pass

        # Add doctor_id to patients if missing
        try:
            cursor.execute(
                'ALTER TABLE patients ADD COLUMN doctor_id INTEGER'
            )
            print('[DB] Added doctor_id column to patients')
        except Exception:
            pass

        # Add specimen_type to patients if missing
        try:
            cursor.execute(
                'ALTER TABLE patients ADD COLUMN specimen_type TEXT'
            )
            print('[DB] Added specimen_type column to patients')
        except Exception:
            pass

        # Add report_id to patients if missing
        try:
            cursor.execute(
                'ALTER TABLE patients ADD COLUMN report_id TEXT'
            )
            print('[DB] Added report_id column to patients')
        except Exception:
            pass

        # Add clinical_history to patients if missing
        try:
            cursor.execute(
                'ALTER TABLE patients ADD COLUMN clinical_history TEXT DEFAULT ""'
            )
            print('[DB] Added clinical_history column to patients')
        except Exception:
            pass

        # Migrate old audit_logs table to new schema if needed
        try:
            cursor.execute('SELECT evt_id FROM audit_logs LIMIT 1')
        except Exception:
            # Old schema detected, drop and recreate
            try:
                cursor.execute('DROP TABLE IF EXISTS audit_logs')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS audit_logs (
                        id          INTEGER PRIMARY KEY AUTOINCREMENT,
                        evt_id      TEXT    NOT NULL,
                        event_type  TEXT    NOT NULL,
                        category    TEXT    NOT NULL,
                        actor_id    TEXT,
                        actor_name  TEXT    NOT NULL,
                        action      TEXT    NOT NULL,
                        detail      TEXT    NOT NULL,
                        target_id   TEXT,
                        ip_address  TEXT    DEFAULT 'localhost',
                        created_at  TEXT    DEFAULT (datetime('now','localtime'))
                    )
                ''')
                print('[DB] Migrated audit_logs to new schema')
            except Exception as e:
                print(f'[DB] audit_logs migration failed: {e}')

        # Standardize roles: pathologist -> doctor
        try:
            cursor.execute(
                "UPDATE doctors SET role = 'doctor' WHERE role = 'pathologist'"
            )
            if cursor.rowcount > 0:
                print(f'[DB] Migrated {cursor.rowcount} roles from pathologist to doctor')
        except Exception:
            pass

        # Approve all existing doctors
        # (they were working before this system)
        cursor.execute(
            'UPDATE doctors SET is_approved = 1 '
            'WHERE is_approved = 0 AND role = "doctor"'
        )

        conn.commit()
        print('[DB] Migration complete')
    finally:
        if conn:
            conn.close()


def log_audit(conn, event_type, category,
              actor_name, action, detail,
              actor_id=None, target_id=None,
              ip_address='localhost'):
    '''Log an audit event to the database.'''
    evt_id = f"EVT-{str(uuid.uuid4().int)[:6]}"
    try:
        conn.execute('''
            INSERT INTO audit_logs (
                evt_id, event_type, category,
                actor_id, actor_name,
                action, detail, target_id,
                ip_address
            ) VALUES (?,?,?,?,?,?,?,?,?)
        ''', (
            evt_id, event_type, category,
            actor_id, actor_name,
            action, detail, target_id,
            ip_address
        ))
        conn.commit()
    except Exception as e:
        print(f'[AUDIT] Log failed: {e}')
