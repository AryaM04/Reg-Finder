import requests
import re
from bs4 import BeautifulSoup
from itertools import product
import math 

###############################################################################
# UK Vehicle Registration Plate Finder
# This script generates all possible valid UK registration plates based on a pattern
# with wildcards (?). It supports multiple UK registration formats and can scrape
# vehicle information from online sources.
###############################################################################

# Web scraping function to get vehicle model information
def getModel(reg):
    """
    Retrieves vehicle model information from carcheck.co.uk
    Args:
        reg (str): Vehicle registration number to look up
    Returns:
        str: Vehicle model description
    """
    page = requests.get('https://www.carcheck.co.uk/reg?i=' + reg)
    soup = BeautifulSoup(page.text, 'html.parser')
    model = str(soup.find_all('td')[3]).replace("<td>","").replace("</td>","")
    return model
f=open("API_KEY","r")
API_KEY=f.read().strip()
f.close()
# DVLA API configuration for vehicle lookups
headers = {
    'x-api-key': API_KEY,
}

# Initialize output file
f = open("possibleRegPlates.txt", "w")

###############################################################################
# Data Preparation
###############################################################################

# Generate reference list of valid characters
allLetters = []
for i in range(26):
    allLetters.append(chr(i+65))

allNumbers = [0,1,2,3,4,5,6,7,8,9]

# Initialize counters
counter = 1
hitCount = 0
total = 26 * 26  # Maximum possible letter combinations

# Get user input registration and convert to uppercase, remove spaces



###############################################################################
# Regular Expressions for UK Registration Plate Formats
###############################################################################

# Regular expressions for different UK registration plate formats
regexCurrent = '(^[A-Z|?]{2}[0-9|?]{2}[A-Z|?]{3}$)'  # Current format: AB12CDE
regexPrefix = '(^[A-Z|?][0-9|?]{1,3}[A-Z|?]{3}$)'    # Prefix format: A123BCD
regexSuffix = '(^[A-Z|?]{3}[0-9|?]{1,3}[A-Z|?]$)'    # Suffix format: ABC123D
regexDatelessLongNumberPrefix = '(^[0-9|?]{1,4}[A-Z|?]{1,2}$)'      # Format: 1234AB
regexDatelessShortNumberPrefix = '(^[0-9|?]{1,3}[A-Z|?]{1,3}$)'     # Format: 123ABC
regexDatelessLongNumberSuffix = '(^[A-Z|?]{1,2}[0-9|?]{1,4}$)'      # Format: AB1234
regexDatelessShortNumberSuffix = '(^[A-Z|?]{1,3}[0-9|?]{1,3}$)'     # Format: ABC123
regexDatelessNorthernIreland = '(^[A-Z|?]{1,3}[0-9|?]{1,4}$)'       # NI format: ABC1234
regexDiplomaticPlate = '(^[0-9|?]{3}[DX|??|D?|?X]{1}[0-9|?]{3}$)'  # Diplomatic: 123D123

# Collect all regex patterns in a list
allRegexes = [regexCurrent, regexPrefix, regexSuffix, regexDatelessLongNumberPrefix, 
              regexDatelessShortNumberPrefix, regexDatelessLongNumberSuffix, 
              regexDatelessShortNumberSuffix, regexDatelessNorthernIreland, 
              regexDiplomaticPlate]

###############################################################################
# Function to Generate Possible Registration Plates
###############################################################################

# Function to generate all possible valid registration plates based on input pattern
def generate_possible_plates(targetReg):
    result = []
    if re.match(regexCurrent, targetReg):
        parts = []
        for i, char in enumerate(targetReg):
            if char == '?':
                if i == 0 :  # First letter
                    parts.append('ABCDEFGHJKLMNOPRSTUVWXY')
                elif i == 1 :  # second letter
                    parts.append('ABCDEFGHJKLMNOPRSTUVWXY')
                elif i == 2 :  # third character is a number
                    parts.append('012567')
                elif i == 3 :  # fourth character is a number
                    parts.append('0123456789')
                elif i > 3 :  # last three are letters
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

# Make POST request to DVLA API
def check_dvla(registration):
    """
    Check vehicle details using DVLA API
    Args:
        registration (str): Vehicle registration number
    Returns:
        dict: Vehicle information or None if request fails
    """
    url = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles'
    
    headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    }
    
    data = {
        'registrationNumber': registration
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code != 404:  # Only print non-404 errors
            print(f"HTTP Error checking vehicle {registration}: {e}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error checking vehicle {registration}: {e}")
        return None
###############################################################################
# Main Execution
###############################################################################

# Generate all possible plates matching the input pattern
targetReg = input("Enter the registration plate to check: ").upper()
targetReg = targetReg.replace(" ", "")
wildcards = targetReg.count('?')
print("For the following enter ? if unsure:")
targetMake = input("Enter the make of the vehicle: ").upper()
targetModel = input("Enter the model of the vehicle: ").upper()
targetColour = input("Enter the colour of the vehicle: ").upper()
possiblePlates = generate_possible_plates(targetReg)
print(f"Generated {len(possiblePlates)} valid plates.")
possibleHits = []
total_plates = len(possiblePlates)

# Add progress bar setup
print("Checking plates with DVLA API:")
print("[", end="", flush=True)

for idx, plate in enumerate(possiblePlates):
    # Update progress bar with logarithmic scaling
    progress = int(50 * (math.log(idx + 1) / math.log(total_plates)))
    print("\r[" + "=" * progress + " " * (50 - progress) + f"] {idx}/{total_plates}", end="", flush=True)
    
    # Check each generated plate against the DVLA API
    vehicle_info = check_dvla(plate)
    if vehicle_info:
        make = vehicle_info.get('make', '').upper()
        colour = vehicle_info.get('colour', '').upper()
        
        # Check if the vehicle matches the user input
        if (targetMake == '?' or targetMake in make) and \
           (targetColour == '?' or targetColour in colour):
            possibleHits.append(plate)

# Complete progress bar
print("\r[" + "=" * 50 + f"] {total_plates}/{total_plates}")
hits = []
for reg in possibleHits:
    # Get vehicle info again to ensure we have correct details for this registration
    vehicle_info = check_dvla(reg)
    if vehicle_info:
        make = vehicle_info.get('make', '').upper()
        colour = vehicle_info.get('colour', '').upper()
        year = vehicle_info.get('yearOfManufacture', 'Unknown')
        model = getModel(reg)
        # Changed to check if target model is part of the actual model string
        if targetModel == '?' or targetModel in model.upper():
            hitCount += 1
            hits.append([reg, make, model, colour, year])

print(f"Total matches found: {hitCount}")
print("hits:")
for hit in hits:
    print(f"{hit[0]} - Make: {hit[1]}, Model: {hit[2]} ({hit[4]}), Colour: {hit[3]}")

# Write results to file
for hit in hits:
    f.write(f"{hit[0]} - Make: {hit[1]}, Model: {hit[2]} ({hit[4]}), Colour: {hit[3]}\n")
f.close()

