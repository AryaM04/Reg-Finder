# UK Vehicle Registration Finder - Web Interface

A simplified web interface for the UK Vehicle Registration Finder that allows you to search for vehicles using partial registration plates with wildcards.

## Usage

You can try it at http://aryamortazavi.co.uk/regfinder

### Input Fields

- **Registration Pattern**: Enter the partial plate with `?` for unknown characters
  - Example: `AB12???` will search for all plates starting with AB12
  - Example: `??12ABC` will search for all plates ending with 12ABC
  
- **Vehicle Make**: Enter specific make (e.g., "BMW", "Ford") or `?` for any make
- **Vehicle Model**: Enter specific model (e.g., "Focus", "3 Series") or `?` for any model  
- **Vehicle Colour**: Enter specific colour (e.g., "Blue", "Red") or `?` for any colour

### Example Searches
Make your searches as narrow as possible, for example:
#### A good search:
**Find all BMW vehicles with plates starting AB12X**:
- Registration: `AB12X??`
- Make: `BMW`
- Model: `?`
- Colour: `?`
#### A bad search:
**Find all blue Ford Focus vehicles**:
- Registration: `??????` (or leave more specific if known)
- Make: `FORD`
- Model: `FOCUS`
- Colour: `BLUE`

Thank you for checking out this project :)