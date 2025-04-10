import requests
import re
from bs4 import BeautifulSoup
from itertools import product

# Function to get vehicle model by scraping carcheck.co.uk
def getModel(reg):
    page = requests.get('https://www.carcheck.co.uk/reg?i=' + reg)
    soup = BeautifulSoup(page.text, 'html.parser')
    model = str(soup.find_all('td')[3]).replace("<td>","").replace("</td>","")
    return model

# API authentication headers for DVLA vehicle enquiry service    
headers = {
    'x-api-key': '8AaRYbGhKbafmXYTrXPiZ5ZYP0JBRS9F8PkbCwfp',
}

# Create output file for storing possible registration plates
f = open("possibleRegPlates.txt", "w")

# Generate list of all uppercase letters A-Z
allLetters = []
for i in range(26):
    allLetters.append(chr(i+65))
print(allLetters)

# List of digits 0-9
allNumbers = [0,1,2,3,4,5,6,7,8,9]

counter = 1
hitCount = 0
total = 26 * 26

# Get user input registration and convert to uppercase, remove spaces
targetReg = input("Enter the registration plate to check: ").upper()
targetReg = targetReg.replace(" ", "")
wildcards = targetReg.count('?')

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

# Generate all possible plates matching the input pattern
possiblePlates = generate_possible_plates(targetReg)
print(possiblePlates)
print(f"Generated {len(possiblePlates)} valid plates.")

# Write results to file
f.writelines([plate + '\n' for plate in possiblePlates])
f.close()

# Commented out code block for checking plates against DVLA API
# This section would iterate through plates and check against specific criteria
# ... [existing commented code] ...
