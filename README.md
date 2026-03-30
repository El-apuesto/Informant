# Audio Transcription Web App (Python/Flask)

A Python Flask web application for transcribing audio and video files using Groq's Whisper API. Automatically extracts audio from video files before transcription.

## Features

- **Simple Authentication**: Login with email and Groq API key
- **File Upload**: Drag & drop or click to select files
- **Video Support**: Automatically extracts audio from video files using FFmpeg
- **Audio Formats**: MP3, WAV, M4A, OGG, WebM, AAC, FLAC
- **Video Formats**: MP4, MOV, AVI, MKV, WebM, FLV, WMV
- **Transcription**: Uses Groq Whisper API (whisper-large-v3)
- **Results**: View full text or with timestamps, copy to clipboard, download as TXT
- **iOS Optimized**: Mobile-friendly responsive design

## Requirements

- Python 3.8+
- FFmpeg installed on your system
- Groq API key (free at console.groq.com)

## Installation

1. **Clone/download the app** to your server

2. **Install FFmpeg** if not already installed:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install ffmpeg
   
   # macOS
   brew install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the app**:
   ```bash
   ./run.sh
   # or
   python3 app.py
   ```

5. **Open in browser**: http://localhost:5000

## Getting a Groq API Key

1. Go to https://console.groq.com/keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `gsk_`)
5. Use it when logging into the app

## Usage

1. **Login**: Enter your email and Groq API key
2. **Upload**: Select or drag an audio/video file
3. **Transcribe**: Click the Transcribe button
4. **Download**: Copy text or download as TXT file

## Environment Variables

- `SECRET_KEY`: Flask secret key (default: 'dev-secret-key-change-in-production')
- `FLASK_ENV`: Set to 'production' for production

## Docker Deployment

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python3", "app.py"]
```

## File Structure

```
transcription_app/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── run.sh             # Startup script
├── README.md          # This file
└── templates/
    ├── login.html     # Login page
    └── transcribe.html # Main transcription page
```

## API Endpoints

- `POST /api/transcribe` - Upload and transcribe a file
- `POST /api/download` - Download transcription as TXT

## Notes

- Files are processed in memory and deleted after transcription
- Maximum file size: 500MB
- Session data is stored in cookies (API key is stored server-side in session)
