# 09. Authentication & Security Guide

CancerScan handles highly sensitive medical data. Therefore, it implements enterprise-grade security measures on the backend to protect data.

## 1. Password Hashing (bcrypt)
We never store plain-text passwords in the database. If a hacker steals the Neon database, they cannot see the users' passwords.

* When a doctor registers, the backend uses the `bcrypt` Python library.
* It generates a random "salt" and hashes the password 12 times.
* The result looks like this in the database: `$2b$12$xKzk/Oq5jJv...`

**Code Reference:** `backend/routes/auth_routes.py` (Line 120)
```python
hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
```

## 2. JSON Web Tokens (JWT)
The application is "stateless." It does not use session cookies. Instead, it uses JWTs.

* When a doctor logs in with the correct password, the server generates a JWT.
* The JWT contains the doctor's `id` and `role` hidden inside it.
* The JWT is cryptographically signed using a secret key.
* The token expires automatically after **8 hours**.

**Code Reference:** `backend/routes/auth_routes.py` (Line 290)
```python
token = jwt.encode({
    'user_id': user['id'],
    'role': user['role'],
    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)
}, settings.JWT_SECRET_KEY, algorithm="HS256")
```

## 3. Role-Based Access Control (RBAC)
There are two roles in the system: `admin` and `doctor`.

If a regular doctor tries to access an admin-only API (like viewing all pending doctor registrations), the server blocks them. This is done using a Python decorator in the middleware.

**Code Reference:** `backend/middleware/auth_middleware.py` (Line 60)
```python
def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Decode the token...
        if data['role'] != 'admin':
            return jsonify({'success': False, 'error': 'Admin privileges required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated
```

## 4. The Approval System
To prevent random people on the internet from creating accounts and using the AI, new registrations are set to `is_approved = 0` by default. They cannot log in. An administrator must manually verify their identity and click "Approve" on the admin dashboard, which changes their status to `1`.

## 5. Brute Force Protection
The login endpoint uses rate limiting. If someone tries to guess a password incorrectly 5 times in 1 minute from the same IP address, their IP is temporarily blocked to prevent automated hacking attempts.
