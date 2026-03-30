#!/bin/bash
# Start the Audio Transcription Flask App

cd "$(dirname "$0")"

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg is not installed. Please install ffmpeg first."
    echo "  Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "  macOS: brew install ffmpeg"
    exit 1
fi

# Install dependencies if needed
pip install -q -r requirements.txt

# Set environment variables (optional)
export FLASK_ENV=development
export FLASK_APP=app.py

# Run the app
echo "Starting Audio Transcription App..."
echo "Open http://localhost:5000 in your browser"
python3 app.py
