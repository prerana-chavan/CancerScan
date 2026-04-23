import os
import pytest
import io
import json
from unittest.mock import patch, MagicMock
from PIL import Image

# Modify env vars before api_server is imported
os.environ["ML_SERVER_HOST"] = "127.0.0.1"
os.environ["ML_SERVER_PORT"] = "5001"

import api_server
from api_server import app, ModelNotFoundError

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def create_test_image(size=(100, 100), color=(255, 0, 0), format='PNG'):
    """Helper to create an in-memory image for testing."""
    img = Image.new('RGB', size, color=color)
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format=format)
    img_byte_arr.seek(0)
    return img_byte_arr

def create_corrupted_image():
    """Helper to create a corrupted image file."""
    return io.BytesIO(b"This is not a valid image file and should fail verification.")

def create_text_file():
    """Helper to create a text file."""
    return io.BytesIO(b"Just some text here")

# 1. test_model_loads() — verify the PyTorch/TensorFlow model file loads without errors on startup
def test_model_loads():
    # Since api_server.load_models() ran on import, we can just check globals
    assert api_server.gatekeeper is not None, "Gatekeeper model failed to load"
    assert api_server.cancer_model is not None, "Cancer model failed to load"
    assert api_server.subtype_model is not None, "Subtype model failed to load"
    assert api_server.survival_model is not None, "Survival model failed to load"

# 2. test_model_file_missing() — when model file path is wrong, the app should raise a clear ModelNotFoundError
@patch('api_server.CANCER_MODEL', 'non_existent_model_path.h5')
def test_model_file_missing():
    with pytest.raises(ModelNotFoundError) as exc_info:
        api_server.load_models()
    assert "Cancer model missing" in str(exc_info.value) or "Failed to load" in str(exc_info.value)

# 3. test_predict_valid_image()
@patch('api_server.predict_image')
@patch('api_server.predict_subtype')
@patch('api_server.predict_survival')
def test_predict_valid_image(mock_survival, mock_subtype, mock_predict_image, client):
    # Mocking ML functions to return standard structures instead of actually running inference
    mock_predict_image.return_value = ("Cancer Detected", 0.95, None)
    mock_subtype.return_value = ("Adenocarcinoma (ACA)", 0.88)
    mock_survival.return_value = 0.65  # 65% survival (Moderate risk)

    img_bytes = create_test_image()
    
    response = client.post('/predict', data={
        'image': (img_bytes, 'test.png'),
        'age': '55',
        'gender': 'Female'
    })
    
    assert response.status_code == 200
    data = response.get_json()
    
    assert data['success'] is True
    assert 'prediction' in data
    assert 'subtype' in data
    assert 'confidence' in data
    assert 'survival' in data
    
    assert data['prediction'] in ["Cancer Detected", "No Cancer (Normal Tissue)"]
    assert 0.0 <= data['confidence'] <= 1.0

# 4. test_predict_invalid_file() — send a .txt file instead of an image
def test_predict_invalid_file(client):
    txt_bytes = create_text_file()
    
    response = client.post('/predict', data={
        'image': (txt_bytes, 'test.txt'),
        'age': '60',
        'gender': 'Male'
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert "error" in data
    assert "Invalid file type" == data['error']

# 5. test_predict_corrupted_image() — send a corrupted/empty image
def test_predict_corrupted_image(client):
    corrupted_bytes = create_corrupted_image()
    
    response = client.post('/predict', data={
        'image': (corrupted_bytes, 'corrupted.jpg'),
        'age': '60',
        'gender': 'Male'
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert "error" in data
    assert data['error'] in ["Invalid file type", "Corrupted image file"]

# 6. test_predict_large_image() — send an oversized image (>50MB) 
@patch('os.path.getsize')
def test_predict_large_image(mock_getsize, client):
    # Mock file size to be 51MB
    mock_getsize.return_value = 51 * 1024 * 1024
    
    img_bytes = create_test_image()
    
    response = client.post('/predict', data={
        'image': (img_bytes, 'large.png')
    })
    
    assert response.status_code == 413
    data = response.get_json()
    assert data['success'] is False
    assert "error" in data
    assert "File exceeds 50MB limit" in data['error']

# For analysis route testing (integration):
from app import app as main_app

@pytest.fixture
def main_client():
    main_app.config['TESTING'] = True
    with main_app.test_client() as client:
        yield client

# 7. test_inference_timeout() — mock the model to take >30s
@patch('routes.analysis_routes.requests.post')
def test_inference_timeout(mock_post, main_client):
    from unittest.mock import patch
    import requests
    
    # Simulate timeout natively
    mock_post.side_effect = requests.exceptions.Timeout("Connection timed out")
    
    img_bytes = create_test_image()
    
    # Use a mock token to bypass require_auth properly 
    # require_auth needs a valid JWT format for decoding
    import jwt
    from config.settings import settings
    token = jwt.encode({'id': 1, 'role': 'doctor'}, settings.JWT_SECRET, algorithm='HS256')
    
    response = main_client.post(
        '/api/analysis/predict', 
        data={'slideImage': (img_bytes, 'test.png'), 'patientName': 'John Doe', 'age': '50', 'gender': 'Male'},
        headers={'Authorization': f'Bearer {token}'}
    )
    
    assert response.status_code == 504
    assert response.get_json()['error'] == "ML inference timed out. Please try again."

# 8. test_model_output_schema() — run inference and validate the output JSON matches the clinical report schema exactly
@patch('api_server.predict_image')
@patch('api_server.predict_subtype')
@patch('api_server.predict_survival')
def test_model_output_schema(mock_survival, mock_subtype, mock_predict_image, client):
    mock_predict_image.return_value = ("Cancer Detected", 0.99, None)
    mock_subtype.return_value = ("Squamous Cell Carcinoma (SCC)", 0.76)
    mock_survival.return_value = 0.45  # Moderate
    
    img_bytes = create_test_image()
    
    response = client.post('/predict', data={
        'image': (img_bytes, 'test.png'),
        'age': '70',
        'gender': 'Male'
    })
    
    assert response.status_code == 200
    data = response.get_json()
    
    # Verify Schema
    assert 'success' in data
    assert 'prediction' in data
    assert 'confidence' in data
    assert 'diagnosis' in data
    
    diag = data['diagnosis']
    assert 'result' in diag
    assert 'confidence' in diag
    
    assert 'subtype' in data
    sub = data['subtype']
    assert 'type' in sub
    assert 'abbreviation' in sub
    assert 'confidence' in sub
    
    assert 'survival' in data
    surv = data['survival']
    assert 'predicted_months' in surv
    assert 'risk_category' in surv
    assert '5_year_survival_rate' in surv
