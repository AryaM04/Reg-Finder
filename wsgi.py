#!/usr/bin/python3
"""
WSGI entry point for the Reg-Finder application
"""
import sys
import os

# Add the application directory to Python path
app_dir = '/var/www/html/Reg-Finder'
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

# Activate virtual environment
activate_this = os.path.join(app_dir, 'venv', 'bin', 'activate_this.py')
if os.path.exists(activate_this):
    with open(activate_this) as f:
        exec(f.read(), dict(__file__=activate_this))

# Set production environment
os.environ['MOD_WSGI_APACHE_VERSION'] = '1'

# Import the Flask application
from app import app as application

if __name__ == "__main__":
    application.run()
