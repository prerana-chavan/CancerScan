# Run this to initialize or reset the database.
# You can then use the "Sign Up" page in the app to create your doctors.

import sys
import os
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

from database.db import get_connection, init_db

def main():
    print('═══════════════════════════════════════')
    print('  CancerScan — Database Reset Tool')
    print('═══════════════════════════════════════\n')

    confirm = input(
        'This will clear ALL existing doctors and patients. Continue? (yes/no): '
    )
    if confirm.strip().lower() != 'yes':
        print('Cancelled.')
        sys.exit(0)

    # Re-initialize DB tables
    init_db()
    
    conn = None
    try:
        conn   = get_connection()
        cursor = conn.cursor()

        # Optional: Clear tables
        cursor.execute('DELETE FROM doctors')
        cursor.execute('DELETE FROM patients')
        conn.commit()
    finally:
        if conn:
            conn.close()

    print('\n✅ Database reset successfully.')
    print('You can now start the app and use the "Sign Up" page to create accounts.')
    print('═══════════════════════════════════════')

if __name__ == '__main__':
    main()
