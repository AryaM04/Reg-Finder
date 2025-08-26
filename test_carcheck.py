#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup

def test_carcheck_structure(reg):
    """Test function to see what carcheck.co.uk returns"""
    try:
        print(f"Testing registration: {reg}")
        page = requests.get(f'https://www.carcheck.co.uk/reg?i={reg}', timeout=10)
        soup = BeautifulSoup(page.text, 'html.parser')
        
        # Find all td elements
        tds = soup.find_all('td')
        print(f"Found {len(tds)} <td> elements:")
        
        for i, td in enumerate(tds):
            text = td.get_text(strip=True)
            print(f"  [{i}]: {text}")
            
        # Try to find the actual vehicle information table
        tables = soup.find_all('table')
        print(f"\nFound {len(tables)} tables")
        
        # Look for specific patterns that might indicate vehicle data
        for i, table in enumerate(tables):
            rows = table.find_all('tr')
            print(f"\nTable {i} has {len(rows)} rows:")
            for j, row in enumerate(rows):
                cells = row.find_all(['td', 'th'])
                row_text = " | ".join([cell.get_text(strip=True) for cell in cells])
                if row_text:
                    print(f"  Row {j}: {row_text}")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Test with a known registration (you can change this)
    test_carcheck_structure("AB12ABC")  # Example registration
