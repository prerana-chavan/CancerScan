# 04. Backend API Documentation

The main backend server is built using **Python** and **Flask**. It handles all database operations, authentication, and routing. It runs on **Port 5099** locally.

## 1. Core Configuration (`app.py`)

The `app.py` file is the entry point for the backend. 
* It initializes the database connection.
* It registers CORS (Cross-Origin Resource Sharing) so the Electron frontend can talk to it.
* It registers the "Blueprints" (Route files).
* It sets a strict **10MB upload limit** to prevent the server from crashing if a user uploads a massive file (`app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024`).

## 2. API Route Blueprints

The backend is split into 5 distinct route files located in `backend/routes/`:

### A. Authentication (`auth_routes.py`)
Handles all security and identity.
* `POST /api/auth/register` - Creates a new doctor account (hashes password with bcrypt).
* `POST /api/auth/login` - Verifies password, returns a JWT token valid for 8 hours. Includes brute-force protection (5 attempts per minute).

### B. Admin Panel (`admin_routes.py`)
Secured by the `@require_admin` decorator.
* `GET /api/admin/doctors/pending` - Lists doctors waiting for approval.
* `POST /api/admin/doctors/<id>/approve` - Grants system access to a doctor.
* `GET /api/admin/stats` - Powers the charts on the admin dashboard.
* `GET /api/admin/export/patients` - Generates a downloadable CSV of all patient records.

### C. Patients (`patient_routes.py`)
Secured by the `@require_auth` decorator.
* `GET /api/patients` - Retrieves the history of scans performed by the logged-in doctor.
* `POST /api/patients/<id>/notes` - Adds clinical notes to a specific scan.

### D. Analysis (`analysis_routes.py`)
The most complex route. Bridges the frontend to the ML Engine.
* `POST /api/analysis/predict` 
  1. Receives the slide image from the frontend.
  2. Saves it temporarily to `uploads/slides/`.
  3. Sends an internal HTTP request to the ML Engine (`api_server.py` on Port 5001).
  4. Receives the prediction back from the ML Engine.
  5. Converts the image to a Base64 string.
  6. Saves the patient details, the prediction, and the Base64 image into the Neon PostgreSQL database.
  7. Returns the final result to the frontend.

### E. Hospitals (`hospital_routes.py`)
* `GET /api/hospitals/search` - Queries the OpenStreetMap Nominatim API to provide autocomplete suggestions when doctors type their hospital name during registration.

## 3. Middleware Security (`auth_middleware.py`)

Most routes are protected by a decorator:

```python
@require_auth
def my_secure_route(current_user):
    pass
```

**How it works:**
1. The frontend sends a token in the HTTP Header: `Authorization: Bearer eyJhbGci...`
2. The middleware intercepts the request.
3. It verifies the token using the secret key (`settings.JWT_SECRET_KEY`).
4. It extracts the `user_id` from the token.
5. If the token is fake or expired, it returns `401 Unauthorized`.
6. If valid, it allows the request to proceed.
