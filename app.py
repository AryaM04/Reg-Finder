from flask import Flask, render_template, request, jsonify, session
import requests
import re
import os
from bs4 import BeautifulSoup
from itertools import product
import math
import threading
import time
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'

# Configure for subdirectory deployment
app.config['APPLICATION_ROOT'] = '/regfinder'

# Load API key
def load_api_key():
    """Load API key from file"""
    try:
        # Use absolute path to ensure it works under Apache
        api_key_path = os.path.join(os.path.dirname(__file__), "API_KEY")
        with open(api_key_path, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        return None

API_KEY = load_api_key()

# Global variable to control search state
search_active = False
search_results = []
search_progress = {'current': 0, 'total': 0, 'progress': 0, 'plate': '', 'status': 'idle'}

# Your existing regex patterns
regexCurrent = '(^[A-Z|?]{2}[0-9|?]{2}[A-Z|?]{3}$)'
regexPrefix = '(^[A-Z|?][0-9|?]{1,3}[A-Z|?]{3}$)'
regexSuffix = '(^[A-Z|?]{3}[0-9|?]{1,3}[A-Z|?]$)'
regexDatelessLongNumberPrefix = '(^[0-9|?]{1,4}[A-Z|?]{1,2}$)'
regexDatelessShortNumberPrefix = '(^[0-9|?]{1,3}[A-Z|?]{1,3}$)'
regexDatelessLongNumberSuffix = '(^[A-Z|?]{1,2}[0-9|?]{1,4}$)'
regexDatelessShortNumberSuffix = '(^[A-Z|?]{1,3}[0-9|?]{1,3}$)'
regexDatelessNorthernIreland = '(^[A-Z|?]{1,3}[0-9|?]{1,4}$)'
regexDiplomaticPlate = '(^[0-9|?]{3}[DX|??|D?|?X]{1}[0-9|?]{3}$)'

def getModel(reg):
    """Retrieves vehicle model information from carcheck.co.uk"""
    try:
        page = requests.get('https://www.carcheck.co.uk/reg?i=' + reg, timeout=5)
        soup = BeautifulSoup(page.text, 'html.parser')
        
        # Look for the model in the table structure
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 2:
                    if 'Model' in cells[0].text:
                        model_text = cells[1].text.strip()
                        if model_text and model_text != '-':
                            return model_text
        
        # Fallback: try the original method
        td_elements = soup.find_all('td')
        if len(td_elements) > 3:
            model = str(td_elements[3]).replace("<td>","").replace("</td>","").strip()
            if model and model != '-':
                return model
                
        return "Unknown"
    except:
        return "Unknown"

def generate_possible_plates(targetReg):
    """Generate all possible valid registration plates based on input pattern"""
    result = []
    
    if re.match(regexCurrent, targetReg):
        parts = []
        for i, char in enumerate(targetReg):
            if char == '?':
                if i == 0:  # First letter
                    parts.append('ABCDEFGHJKLMNOPRSTUVWXY')
                elif i == 1:  # second letter
                    parts.append('ABCDEFGHJKLMNOPRSTUVWXY')
                elif i == 2:  # third character is a number
                    parts.append('012567')
                elif i == 3:  # fourth character is a number
                    parts.append('0123456789')
                elif i > 3:  # last three are letters
                    parts.append('ABCDEFGHJKLMNOPRSTUVWXY')
            else:
                parts.append(char)
        result.extend([''.join(p) for p in product(*parts)])

    if re.match(regexPrefix, targetReg):
        parts = []
        for i, char in enumerate(targetReg):
            if char == '?':
                if i == 0:  # First character is a letter
                    parts.append('ABCDEFGHJKLMNPQRSTVWXY')
                elif i == 1:  # Second character is a number
                    parts.append('0123456789')
                elif i == 2:  # Next 2-3 characters are numbers or letters
                    if len(targetReg) == 5:
                        parts.append('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
                    else:
                        parts.append('0123456789')
                elif i == 3:
                    if len(targetReg) <= 6:
                        parts.append('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
                    else:
                        parts.append('0123456789')
                else:  # Last three characters are letters
                    parts.append('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
            else:
                parts.append(char)
        result.extend([''.join(p) for p in product(*parts)])

    if re.match(regexSuffix, targetReg):
        parts = []
        for i, char in enumerate(targetReg):
            if char == '?':
                if i < 3:  # First three characters are letters
                    parts.append('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
                elif 3 <= i <= 5:  # Next 1-3 characters are numbers
                    parts.append('0123456789')
                else:  # Last character is a letter
                    parts.append('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
            else:
                parts.append(char)
        result.extend([''.join(p) for p in product(*parts)])

    if re.match(regexDatelessLongNumberPrefix, targetReg):
        parts = []
        for i, char in enumerate(targetReg):
            if char == '?':
                if i < 4:  # First 1-4 characters are numbers
                    parts.append('0123456789')
                else:  # Last 1-2 characters are letters
                    parts.append('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
            else:
                parts.append(char)
        result.extend([''.join(p) for p in product(*parts)])

    if re.match(regexDatelessShortNumberPrefix, targetReg):
        parts = []
        for i, char in enumerate(targetReg):
            if char == '?':
                if i < 3:  # First 1-3 characters are numbers
                    parts.append('0123456789')
                else:  # Last 1-3 characters are letters
                    parts.append('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
            else:
                parts.append(char)
        result.extend([''.join(p) for p in product(*parts)])

    if re.match(regexDatelessLongNumberSuffix, targetReg):
        parts = []
        for i, char in enumerate(targetReg):
            if char == '?':
                if i < 2:  # First 1-2 characters are letters
                    parts.append('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
                else:  # Last 1-4 characters are numbers
                    parts.append('0123456789')
            else:
                parts.append(char)
        result.extend([''.join(p) for p in product(*parts)])

    if re.match(regexDatelessShortNumberSuffix, targetReg):
        parts = []
        for i, char in enumerate(targetReg):
            if char == '?':
                if i < 3:  # First 1-3 characters are letters
                    parts.append('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
                else:  # Last 1-3 characters are numbers
                    parts.append('0123456789')
            else:
                parts.append(char)
        result.extend([''.join(p) for p in product(*parts)])

    if re.match(regexDatelessNorthernIreland, targetReg):
        parts = []
        for i, char in enumerate(targetReg):
            if char == '?':
                if i < 3:  # First 1-3 characters are letters
                    parts.append('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
                else:  # Last 1-4 characters are numbers
                    parts.append('0123456789')
            else:
                parts.append(char)
        result.extend([''.join(p) for p in product(*parts)])

    if re.match(regexDiplomaticPlate, targetReg):
        parts = []
        for i, char in enumerate(targetReg):
            if char == '?':
                if i < 3 or i > 3:  # First three and last three are numbers
                    parts.append('0123456789')
                elif i == 3:  # Middle character is 'D' or 'X'
                    parts.append('DX')
            else:
                parts.append(char)
        result.extend([''.join(p) for p in product(*parts)])

    return result

def check_dvla(registration):
    """Check vehicle details using DVLA API"""
    if not API_KEY:
        return None
        
    url = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles'
    
    headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    }
    
    data = {
        'registrationNumber': registration
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=5)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        return None
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return None
        return None
    except requests.exceptions.RequestException:
        return None

@app.route('/debug', methods=['GET'])
def debug_info():
    """Debug information"""
    return jsonify({
        'api_key_loaded': API_KEY is not None,
        'api_key_length': len(API_KEY) if API_KEY else 0,
        'working_directory': os.getcwd(),
        'app_directory': os.path.dirname(__file__)
    })

@app.route('/')
def index():
    """Main page"""
    return render_template('index_production.html')

@app.route('/search', methods=['POST'])
def search():
    """Handle search request"""
    global search_active, search_results, search_progress
    
    data = request.json
    target_reg = data.get('registration', '').upper().replace(' ', '')
    target_make = data.get('make', '').upper()
    target_model = data.get('model', '').upper()
    target_colour = data.get('colour', '').upper()
    
    # Reset search state
    search_active = True
    search_results = []
    search_progress = {'current': 0, 'total': 0, 'progress': 0, 'plate': '', 'status': 'starting'}
    
    # Start background search
    search_thread = threading.Thread(target=background_search, args=(target_reg, target_make, target_model, target_colour))
    search_thread.daemon = True
    search_thread.start()
    
    return jsonify({'status': 'started'})

@app.route('/stop', methods=['POST'])
def stop_search():
    """Handle stop search request"""
    global search_active
    search_active = False
    search_progress['status'] = 'stopped'
    return jsonify({'status': 'stopped'})

@app.route('/progress', methods=['GET'])
def get_progress():
    """Get current search progress"""
    return jsonify(search_progress)

@app.route('/results', methods=['GET'])
def get_results():
    """Get current search results"""
    return jsonify({
        'results': search_results,
        'total_found': len(search_results),
        'status': search_progress['status']
    })

def background_search(target_reg, target_make, target_model, target_colour):
    """Background task to search for vehicles"""
    global search_active, search_results, search_progress
    
    try:
        # Generate possible plates
        possible_plates = generate_possible_plates(target_reg)
        total_plates = len(possible_plates)
        
        search_progress.update({
            'total': total_plates,
            'status': 'searching',
            'current': 0,
            'progress': 0
        })
        
        for idx, plate in enumerate(possible_plates):
            # Check if search was stopped
            if not search_active:
                search_progress['status'] = 'stopped'
                return
            
            # Update progress
            search_progress.update({
                'current': idx + 1,
                'progress': int(100 * (idx + 1) / total_plates),
                'plate': plate
            })
            
            # Check with DVLA API
            vehicle_info = check_dvla(plate)
            if vehicle_info:
                make = vehicle_info.get('make', '').upper()
                colour = vehicle_info.get('colour', '').upper()
                year = vehicle_info.get('yearOfManufacture', 'Unknown')
                
                # Check make and colour filters first
                if (target_make == '?' or target_make in make) and \
                   (target_colour == '?' or target_colour in colour):
                    
                    # Get model information
                    model = getModel(plate)
                    
                    # Check model filter
                    if target_model == '?' or target_model in model.upper():
                        vehicle_data = {
                            'registration': plate,
                            'make': make,
                            'model': model,
                            'colour': colour,
                            'year': year
                        }
                        search_results.append(vehicle_data)
            
            # Small delay to prevent overwhelming the API
            time.sleep(0.1)
        
        # Mark search as complete
        search_active = False
        search_progress['status'] = 'complete'
        
    except Exception as e:
        search_active = False
        search_progress['status'] = 'error'
        search_progress['error'] = str(e)

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
