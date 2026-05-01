import sqlite3
import bcrypt
import os

# Connect to the cancerscan.db in the same folder
db_path = os.path.join(os.path.dirname(__file__), 'cancerscan.db')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = 'admin@cancerscan.app'
password = 'Admin@123'
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

try:
    cursor.execute('''
        INSERT INTO doctors (full_name, email, password_hash, medical_license_id, hospital, specialization, role, is_approved, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', ('System Admin', email, hashed, 'ADM-0000-0000', 'CancerScan HQ', 'Administration', 'admin', 1, 1))
    conn.commit()
    print("✅ Admin account created successfully!")
    print(f"Email: {email}")
    print(f"Password: {password}")
except sqlite3.IntegrityError:
    print("⚠️ Admin account already exists (or email/license is taken).")
except Exception as e:
    print(f"Error: {e}")

conn.close()
