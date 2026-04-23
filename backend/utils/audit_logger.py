from database.db import get_connection, log_audit

def log_action(doctor_id, action, detail=None, ip_address=None, status='Success'):
    """
    Persist clinical and administrative actions to the audit registry.
    """
    conn = None
    try:
        conn = get_connection()
        # Map legacy call to the centralized log_audit function
        log_audit(
            conn,
            event_type='GENERAL',
            category='LEGACY_APP',
            actor_id=str(doctor_id),
            actor_name='Legacy User',
            action=action,
            detail=f"{detail} (Status: {status})",
            ip_address=ip_address or 'localhost'
        )
        conn.commit()
        print(f"[AUDIT] {action} by ID:{doctor_id} logged.")
        return True
    except Exception as e:
        print(f"[AUDIT_ERROR] Failed to log action: {e}")
        return False
    finally:
        if conn:
            conn.close()
