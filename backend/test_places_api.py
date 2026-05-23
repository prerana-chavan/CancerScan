import os
from dotenv import load_dotenv
import requests

# Load the .env file
load_dotenv('c:\\Users\\ASUS\\OneDrive\\Desktop\\Lung_Cancer\\LungCancer (4)dect+subtype+ui\\backend\\.env')

api_key = os.environ.get('GOOGLE_PLACES_API_KEY')
print(f"API Key loaded: {'Yes' if api_key and api_key != 'YOUR_API_KEY_HERE' else 'No/Invalid'}")

if api_key and api_key != 'YOUR_API_KEY_HERE':
    url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json'
    params = {
        'input': 'apollo',
        'types': 'hospital',
        'components': 'country:in',
        'location': '19.9975,73.7898',
        'radius': 200000,
        'key': api_key
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if data.get('status') == 'OK':
        print("\nSUCCESS! Found hospitals:")
        for pred in data.get('predictions', [])[:3]:
            print(f"- {pred.get('description')}")
    else:
        print(f"\nAPI Error: {data.get('status')} - {data.get('error_message', '')}")
