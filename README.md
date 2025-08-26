# UK Vehicle Registration Finder - Web Interface

A simplified web interface for the UK Vehicle Registration Finder that allows you to search for vehicles using partial registration plates with wildcards.

## Features

✅ **Modern Web Interface**: Clean, responsive design with real-time progress tracking  
✅ **Wildcard Search**: Use `?` for unknown characters in registration plates  
✅ **Real-time Progress**: Live progress bar showing search status  
✅ **DVLA API Integration**: Official DVLA vehicle data  
✅ **Multiple Plate Formats**: Supports all UK registration plate formats  
✅ **Vehicle Filtering**: Filter by make, model, and colour  

## Quick Start

1. **Setup**: Make sure your `API_KEY` file contains your DVLA API key
2. **Start**: Run `./start_web.sh` 
3. **Access**: Open your browser to `http://localhost:5000`

## Usage

### Input Fields

- **Registration Pattern**: Enter the partial plate with `?` for unknown characters
  - Example: `AB12???` will search for all plates starting with AB12
  - Example: `??12ABC` will search for all plates ending with 12ABC
  
- **Vehicle Make**: Enter specific make (e.g., "BMW", "Ford") or `?` for any make
- **Vehicle Model**: Enter specific model (e.g., "Focus", "3 Series") or `?` for any model  
- **Vehicle Colour**: Enter specific colour (e.g., "Blue", "Red") or `?` for any colour

### Example Searches

🔍 **Find all BMW vehicles with plates starting AB12**:
- Registration: `AB12???`
- Make: `BMW`
- Model: `?`
- Colour: `?`

🔍 **Find all blue Ford Focus vehicles**:
- Registration: `??????` (or leave more specific if known)
- Make: `FORD`
- Model: `FOCUS`
- Colour: `BLUE`

## File Structure

```
Reg-Finder/
├── app.py              # Main Flask web application
├── main.py             # Original command-line script
├── templates/
│   └── index.html      # Web interface template
├── requirements.txt    # Python dependencies
├── start_web.sh       # Startup script
├── API_KEY            # Your DVLA API key (required)
└── venv/              # Python virtual environment
```

## Requirements

- **Python 3.8+** with virtual environment support
- **DVLA API Key** (placed in `API_KEY` file)
- **Internet Connection** for API calls

## Installation

The web interface has been automatically set up with:

1. **Virtual Environment**: Created in `venv/` directory
2. **Dependencies**: All required packages installed
3. **Startup Script**: `start_web.sh` ready to use

## API Rate Limits

⚠️ **Important**: The DVLA API has rate limits. The application includes:
- Built-in delays between requests (0.1 seconds)
- Progress tracking to monitor search status
- Error handling for API failures

## Search Tips

💡 **Optimize Your Searches**:
- Use as many known characters as possible to reduce search space
- Filter by make/model/colour to narrow results
- Wildcard searches can generate thousands of combinations

💡 **Performance**:
- Fewer wildcards = faster searches
- More specific filters = more relevant results
- Large searches may take several minutes

## Technical Details

- **Framework**: Flask with SocketIO for real-time updates
- **Frontend**: Modern HTML5/CSS3/JavaScript with WebSocket communication
- **Backend**: Python with requests, BeautifulSoup, and DVLA API integration
- **Progress Tracking**: Real-time updates via WebSocket connections

## Troubleshooting

❌ **"API_KEY file not found"**: Create the file and add your DVLA API key  
❌ **"No results found"**: Try broader search criteria or check API key validity  
❌ **Slow searches**: Large wildcard patterns take time - this is normal  
❌ **Connection errors**: Check internet connection and API key permissions  

## Original Command Line Version

The original `main.py` script is still available for command-line usage if preferred.

---

**Happy Vehicle Hunting! 🚗🔍**
