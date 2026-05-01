import sqlite3
import bcrypt
import os

db_path = os.path.join(os.path.dirname(__file__), 'cancerscan.db')
print("DB Path:", os.path.abspath(db_path))

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = 'admin@cancerscan.app'
password = 'Admin@123'

doctor = cursor.execute('SELECT id, password_hash, role, is_active, is_approved FROM doctors WHERE email = ?', (email,)).fetchone()
if doctor:
    print(f"Found doctor: ID={doctor[0]}, Role={doctor[2]}, Active={doctor[3]}, Approved={doctor[4]}")
    pw_ok = bcrypt.checkpw(password.encode('utf-8'), doctor[1].encode('utf-8'))
    print(f"Password Check: {pw_ok}")
else:
    print("Doctor not found in this DB.")

conn.close()
