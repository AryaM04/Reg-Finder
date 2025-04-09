
import requests
import re
from bs4 import BeautifulSoup

def getModel(reg):
    page = requests.get('https://www.carcheck.co.uk/reg?i=' + reg)
    soup = BeautifulSoup(page.text, 'html.parser')
    model = str(soup.find_all('td')[3]).replace("<td>","").replace("</td>","")
    return model
    
    

headers = {
    'x-api-key': '8AaRYbGhKbafmXYTrXPiZ5ZYP0JBRS9F8PkbCwfp',
    # Already added when you pass json= but not when you pass data=
    # 'Content-Type': 'application/json',
}

# json_data = {
#     'registrationNumber': 'ST1XHY',
# }

# response = requests.post('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', headers=headers, json=json_data)

# Note: json_data will not be serialized by requests
# exactly as it was in the original request.
#data = '{"registrationNumber": "TE57VRN"}'
#response = requests.post('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', headers=headers, data=data)

f = open("possibleRegPlates.txt", "w")


allLetters = []
for i in range(26):
    allLetters.append(chr(i+65))
print(allLetters)
allNumbers = [0,1,2,3,4,5,6,7,8,9]

counter = 1
hitCount = 0
total = 26 * 26
# (?<Current>^[A-Z]{2}[0-9]{2}[A-Z]{3}$)|(?<Prefix>^[A-Z][0-9]{1,3}[A-Z]{3}$)|(?<Suffix>^[A-Z]{3}[0-9]{1,3}[A-Z]$)|(?<DatelessLongNumberPrefix>^[0-9]{1,4}[A-Z]{1,2}$)|(?<DatelessShortNumberPrefix>^[0-9]{1,3}[A-Z]{1,3}$)|(?<DatelessLongNumberSuffix>^[A-Z]{1,2}[0-9]{1,4}$)|(?<DatelessShortNumberSufix>^[A-Z]{1,3}[0-9]{1,3}$)|(?<DatelessNorthernIreland>^[A-Z]{1,3}[0-9]{1,4}$)|(?<DiplomaticPlate>^[0-9]{3}[DX]{1}[0-9]{3}$)
targetReg = 'C5??E'
wildcards = targetReg.count('?')
# wholeRegex = '(^[A-Z|?]{2}[0-9|?]{2}[A-Z|?]{3}$)|(^[A-Z|?][0-9|?]{1,3}[A-Z|?]{3}$)|(^[A-Z|?]{3}[0-9|?]{1,3}[A-Z|?]$)|(^[0-9|?]{1,4}[A-Z|?]{1,2}$)|(^[0-9|?]{1,3}[A-Z|?]{1,3}$)|(^[A-Z|?]{1,2}[0-9|?]{1,4}$)|(^[A-Z|?]{1,3}[0-9|?]{1,3}$)|(^[A-Z|?]{1,3}[0-9|?]{1,4}$)|(^[0-9|?]{3}[DX|??|D?|?X]{1}[0-9|?]{3}$)'
regexCurrent = '(^[A-Z]{2}[0-9|?]{2}[A-Z|?]{3}$)'
regexPrefix = '(^[A-Z|?][0-9|?]{1,3}[A-Z|?]{3}$)'
regexSuffix = '(^[A-Z|?]{3}[0-9|?]{1,3}[A-Z|?]$)'
regexDatelessLongNumberPrefix = '(^[0-9|?]{1,4}[A-Z|?]{1,2}$)'
regexDatelessShortNumberPrefix = '(^[0-9|?]{1,3}[A-Z|?]{1,3}$)'
regexDatelessLongNumberSuffix = '(^[A-Z|?]{1,2}[0-9|?]{1,4}$)'
regexDatelessShortNumberSuffix = '(^[A-Z|?]{1,3}[0-9|?]{1,3}$)'
regexDatelessNorthernIreland = '(^[A-Z|?]{1,3}[0-9|?]{1,4}$)'
regexDiplomaticPlate = '(^[0-9|?]{3}[DX|??|D?|?X]{1}[0-9|?]{3}$)'

x=re.findall(regexPrefix, targetReg, (re.IGNORECASE | re.A))
print(x)


# for i in range(26):
#     letterOne = chr(i+65)
#     for j in range(26):
#         letterTwo = chr(j+65)
#         plate = "C5" + letterOne + letterTwo + "E\n"
#         json_data = {
#             'registrationNumber': plate,
#         }  
#         response = requests.post('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', headers=headers, json=json_data)
#         targetColour = 'RED'
#         targetMake = 'AUDI'
#         targetModel = 'TT'
#         print(str(counter) + "/" + str(total) + " plates checked")
#         print(hitCount,"matches")
#         counter += 1
#         if 'errors' not in str(response.content):
#             responseJson = response.json()
#             make = responseJson.get("make")
#             colour = responseJson.get("colour")
#             if (make == targetMake) and (colour == targetColour):
#                 if (targetModel) in getModel(plate):
#                     print(plate,"matches criteria")
#                     hitCount += 1
#                     f.write(plate)
