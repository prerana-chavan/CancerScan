import os
from flask import Flask, jsonify
from flask_cors import CORS

from database.db import init_db
from routes.auth_routes import auth_bp
from routes.patient_routes import patient_bp
from routes.analysis_routes import analysis_bp
from routes.admin_routes import admin_bp

app = Flask(__name__)
CORS(app) # Allow cross-origin requests

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(patient_bp, url_prefix='/api/patients')
app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
app.register_blueprint(admin_bp, url_prefix='/api/admin')

# Unauthenticated health check fallback (used by frontend to redirect if backend down)
@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def old_health():
    return jsonify({'success': False, 'error': 'Admin health endpoint is at /api/admin/health'}), 404

from flask import send_from_directory

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Endpoint Not found'}), 404

# Serve slide images for UI and PDF generation
@app.route('/api/images/slides/<path:filename>')
def serve_slide_image(filename):
    slides_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'slides')
    return send_from_directory(slides_dir, filename)

# Init DB
with app.app_context():
    init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5099))
    app.run(host='0.0.0.0', port=port, debug=True)
