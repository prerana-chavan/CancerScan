import sqlite3
import bcrypt
import os
import sys

# Ensure we can import from the backend directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database.db import init_db, DB_PATH

print("Auto-seed: Initializing Database...")
init_db()

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    email = 'admin@cancerscan.app'
    password = 'Admin@123'
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Check if admin exists
    admin = cursor.execute('SELECT id FROM doctors WHERE email=?', (email,)).fetchone()
    if not admin:
        cursor.execute('''
            INSERT INTO doctors (full_name, email, password_hash, medical_license_id, hospital, specialization, role, is_approved, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('System Admin', email, hashed, 'ADM-0000-0000', 'CancerScan HQ', 'Administration', 'admin', 1, 1))
        conn.commit()
        print("✅ Auto-seed: Admin account created successfully!")
    else:
        print("✅ Auto-seed: Admin account already exists.")
except Exception as e:
    print(f"Auto-seed error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
