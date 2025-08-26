#!/bin/bash

# UK Vehicle Registration Finder Web Interface
# Startup script

echo "🚗 Starting UK Vehicle Registration Finder Web Interface..."
echo "========================================================"

# Check if API_KEY file exists
if [ ! -f "API_KEY" ]; then
    echo "❌ Error: API_KEY file not found!"
    echo "Please create an API_KEY file with your DVLA API key."
    exit 1
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Start the Flask application
echo "🌐 Starting web server on http://localhost:5000"
echo "Press Ctrl+C to stop the server"
echo "========================================================"

python app.py
