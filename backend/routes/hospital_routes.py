import os
import requests as http_requests
from flask import Blueprint, request, jsonify

hospital_bp = Blueprint('hospital', __name__)


@hospital_bp.route('/search', methods=['GET'])
def hospital_search():
    """
    Proxy endpoint for Google Places Autocomplete API.
    Avoids CORS issues by making the request server-side.

    Query params:
        q (str): Search query (minimum 2 characters)

    Returns:
        JSON: { hospitals: [{ name: str, address: str }] }
    """
    query = request.args.get('q', '').strip()

    if len(query) < 2:
        return jsonify({'hospitals': []})

    api_key = os.environ.get('GOOGLE_PLACES_API_KEY', '')

    if not api_key:
        return jsonify({
            'hospitals': [],
            'error': 'Google Places API key not configured'
        }), 500

    url = 'https://places.googleapis.com/v1/places:autocomplete'
    headers = {
        'X-Goog-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    payload = {
        'input': query,
        'includedRegionCodes': ['IN']
    }

    try:
        response = http_requests.post(url, headers=headers, json=payload, timeout=5)
        data = response.json()

        if response.status_code != 200:
            print(f"[Hospital Search] Google API failed (Code: {response.status_code}). Falling back to OpenStreetMap.")
            try:
                osm_url = 'https://nominatim.openstreetmap.org/search'
                osm_params = {
                    'format': 'json',
                    'q': query,
                    'countrycodes': 'in',
                    'limit': 8
                }
                osm_headers = {
                    'User-Agent': 'CancerScan-AcademicProject/1.0'
                }
                osm_resp = http_requests.get(osm_url, params=osm_params, headers=osm_headers, timeout=5)
                if osm_resp.status_code == 200:
                    osm_data = osm_resp.json()
                    suggestions = []
                    for item in osm_data:
                        # Nominatim returns places, we filter by name roughly
                        name = item.get('name', '')
                        if name:
                            suggestions.append({
                                'name': name,
                                'address': item.get('display_name', '')
                            })
                    return jsonify({'hospitals': suggestions})
            except Exception as osm_e:
                print(f"[Hospital Search] OSM fallback failed: {osm_e}")
                
            return jsonify({
                'hospitals': [],
                'error': f"Google API Error ({response.status_code}) and OpenStreetMap Fallback failed."
            }), 502

        suggestions = []
        medical_keywords = ['hospital', 'clinic', 'cancer', 'medical', 'care', 'diagnostic', 'oncology', 'pathology', 'health', 'doctor', 'institute of medical', 'nursing']
        
        for suggestion in data.get('suggestions', []):
            prediction = suggestion.get('placePrediction', {})
            structured = prediction.get('structuredFormat', {})
            
            # Get text fields
            main_text = structured.get('mainText', {}).get('text')
            secondary_text = structured.get('secondaryText', {}).get('text')
            full_text = prediction.get('text', {}).get('text', '')

            name = main_text if main_text else full_text
            address = secondary_text if secondary_text else full_text
            
            # Get Google types array
            place_types = prediction.get('types', [])
            
            if name:
                # 1. Check if Google explicitly categorizes it as medical
                is_medical_type = any(t in ['hospital', 'medical_clinic', 'health', 'doctor', 'pharmacy', 'dentist'] for t in place_types)
                
                # 2. Check if the name strongly implies it's a medical facility
                name_lower = name.lower()
                is_medical_name = any(kw in name_lower for kw in medical_keywords)
                
                # Accept if it's either categorized correctly by Google, OR has a medical name
                if is_medical_type or is_medical_name:
                    suggestions.append({
                        'name': name,
                        'address': address
                    })

        return jsonify({'hospitals': suggestions})

    except http_requests.exceptions.Timeout:
        print('[Hospital Search] Google API request timed out')
        return jsonify({'hospitals': [], 'error': 'Request timed out'}), 504

    except Exception as e:
        print(f'[Hospital Search] Error: {e}')
        return jsonify({'hospitals': [], 'error': str(e)}), 500
