#!/usr/bin/env python3
"""
iOS Audio Transcription Web App
Python Flask backend with Groq Whisper API integration
"""

import os
import uuid
import subprocess
import json
from datetime import datetime
from pathlib import Path
from functools import wraps
from itertools import cycle
from flask import g

# Load Groq API keys from environment variables
# Support both individual keys and comma-separated format
individual_keys = [
    os.environ.get("GROQ_API_KEY_1", "").strip(),
    os.environ.get("GROQ_API_KEY_2", "").strip(),
    os.environ.get("GROQ_API_KEY_3", "").strip(),
    os.environ.get("GROQ_API_KEY_4", "").strip(),
    os.environ.get("GROQ_API_KEY_5", "").strip()
]
comma_separated_keys = [key.strip() for key in os.environ.get("GROQ_API_KEYS", "").split(',') if key.strip()]

# Combine both formats and remove empty keys
GROQ_API_KEYS = [key for key in individual_keys + comma_separated_keys if key]

# Global key rotator
API_KEY_ROTATOR = cycle(GROQ_API_KEYS) if GROQ_API_KEYS else None

from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_file
from werkzeug.utils import secure_filename
from groq import Groq, RateLimitError
from supabase import create_client, Client

# Supabase setup
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key) if url and key else None

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Configuration
UPLOAD_FOLDER = Path('/tmp/transcription_uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Allowed file extensions
ALLOWED_AUDIO = {'mp3', 'wav', 'm4a', 'ogg', 'webm', 'aac', 'flac'}
ALLOWED_VIDEO = {'mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'}
ALLOWED_EXTENSIONS = ALLOWED_AUDIO | ALLOWED_VIDEO


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def is_video_file(filename):
    """Check if file is a video based on extension."""
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    return ext in ALLOWED_VIDEO


def login_required(f):
    """Decorator to require login for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_profile' not in session:
            flash('Please log in first.', 'warning')
            return redirect(url_for('login'))
        
        # Make user profile available in the request context
        g.user = session['user_profile']
        return f(*args, **kwargs)
    return decorated_function


def get_user(email: str) -> dict:
    """Fetch a user from Supabase by email, or create them if they don't exist."""
    # Check if user exists
    result = supabase.table('profiles').select('*').eq('email', email).execute()
    
    if result.data:
        user = result.data[0]
        # Check if usage needs to be reset (monthly cycle)
        last_reset = datetime.fromisoformat(user['last_reset_date'])
        if datetime.utcnow() - last_reset > timedelta(days=30):
            # Reset usage and update the reset date
            update_data = {
                'usage_seconds': 0,
                'last_reset_date': datetime.utcnow().isoformat()
            }
            updated_user = supabase.table('profiles').update(update_data).eq('email', email).execute()
            return updated_user.data[0]
        return user
    else:
        # User does not exist, create a new free-tier user
        new_user_data = {
            'email': email,
            'subscription_tier': 'free',
            'usage_seconds': 0,
            'last_reset_date': datetime.utcnow().isoformat()
        }
        insert_result = supabase.table('profiles').insert(new_user_data).execute()
        return insert_result.data[0]


def get_media_duration(file_path):
    """Get the duration of a media file in seconds using ffprobe."""
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        str(file_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    try:
        return float(result.stdout.strip())
    except (ValueError, TypeError):
        raise Exception(f"Could not determine duration of file: {file_path}")


def extract_audio_from_video(video_path, output_audio_path):
    """Extract audio from video file using FFmpeg."""
    cmd = [
        'ffmpeg',
        '-i', str(video_path),
        '-vn',  # No video
        '-acodec', 'libmp3lame',
        '-q:a', '2',
        '-ar', '16000',  # 16kHz sample rate (good for speech)
        '-ac', '1',  # Mono
        '-y',  # Overwrite output
        str(output_audio_path)
    ]
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        raise Exception(f"FFmpeg error: {result.stderr}")
    
    return output_audio_path


def get_next_api_key():
    """Get the next available API key from the server-side rotator."""
    if not API_KEY_ROTATOR:
        return None
    try:
        return next(API_KEY_ROTATOR)
    except StopIteration:
        # This happens if the list is empty, though we check for that.
        return None


def process_transcription_pro(transcription_text: str, api_key: str) -> dict:
    """Clean up transcription using a Groq LLM."""
    client = Groq(api_key=api_key)

    system_prompt = """
    You are an expert transcription cleaner and summarizer. Your task is to process a raw transcription text to improve its readability and utility. Follow all instructions precisely.

    MODEL SETTINGS:
    - temperature: 0.2
    - prioritize deterministic output

    OUTPUT REQUIREMENTS:
    - Must return valid JSON only
    - No markdown
    - No explanations
    - No extra text

    PROCESSING STEPS:
    1.  **Fix Grammar and Punctuation**: Correct any grammatical errors, add missing punctuation (commas, periods, question marks), and ensure proper sentence structure.
    2.  **Remove Filler Words**: Eliminate all filler words and disfluencies (e.g., "um", "uh", "like", "you know") unless they are essential for the meaning.
    3.  **Identify Speakers**: Analyze the text and identify different speakers. Label them as "Speaker 1", "Speaker 2", etc. If you cannot reliably determine speakers, return an empty list for `speaker_labels`.
    4.  **Generate Summary**: Create a concise, neutral summary of the conversation's key points.

    JSON OUTPUT FORMAT:
    {
        "cleaned_text": "The fully corrected and punctuated transcription, with speaker labels if identified (e.g., 'Speaker 1: ...').",
        "summary": "A 2-4 sentence summary of the conversation.",
        "speaker_labels": ["Speaker 1", "Speaker 2"]
    }
    """

    for _ in range(2): # Retry once on failure
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": f"Here is the raw transcription to process:\n\n---\n\n{transcription_text}",
                    },
                ],
                model="llama3-70b-8192",
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            
            response_content = chat_completion.choices[0].message.content
            return json.loads(response_content)

        except (json.JSONDecodeError, RateLimitError):
            continue # Retry

    # If retries fail, return a default error structure
    return {
        "cleaned_text": transcription_text, # Return original text on failure
        "summary": "Failed to process transcription.",
        "speaker_labels": []
    }


def transcribe_audio(audio_path, api_key):
    """Transcribe audio file using Groq Whisper API."""
    client = Groq(api_key=api_key)
    
    with open(audio_path, 'rb') as audio_file:
        transcription = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3",
            response_format="verbose_json"
        )
    
    return transcription


# Routes
@app.route('/')
def index():
    """Home page - redirect to transcribe if logged in."""
    if 'user_email' in session:
        return redirect(url_for('transcribe'))
    return redirect(url_for('login'))


@app.route('/api/health')
def health_check():
    """Health check endpoint for Railway monitoring."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'transcription-api'
    })

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page. Fetches or creates a user profile in Supabase."""
    if not GROQ_API_KEYS or not supabase:
        return "Server is not configured. Please contact the administrator.", 503

    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        if not email:
            flash('Please enter your email address.', 'error')
            return render_template('login.html')
        
        try:
            user_profile = get_user(email)
            session['user_profile'] = user_profile
            flash('Logged in successfully!', 'success')
            return redirect(url_for('transcribe'))
        except Exception as e:
            flash(f'An error occurred during login: {e}', 'error')
            return render_template('login.html')

    return render_template('login.html')


@app.route('/logout')
def logout():
    """Logout and clear session."""
    session.clear()
    flash('Logged out successfully.', 'info')
    return redirect(url_for('login'))


@app.route('/transcribe')
@login_required
def transcribe():
    """Main transcription page."""
    return render_template('transcribe.html', user_profile=g.user)


@app.route('/api/transcribe', methods=['POST'])
@login_required
def api_transcribe():
    """API endpoint for transcription with subscription checks."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    is_pro_request = request.form.get('pro', 'false').lower() == 'true'
    user = g.user

    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file selected'}), 400

    file_id = str(uuid.uuid4())
    original_ext = file.filename.rsplit('.', 1)[1].lower()
    original_filename = f"{file_id}_original.{original_ext}"
    original_path = UPLOAD_FOLDER / original_filename

    try:
        file.save(original_path)
        media_duration = get_media_duration(original_path)

        # Subscription and usage checks
        if user['subscription_tier'] == 'free':
            if is_pro_request:
                return jsonify({'error': 'Pro features are for subscribers only.'}), 403
            
            free_tier_limit_seconds = 6 * 60
            if user['usage_seconds'] + media_duration > free_tier_limit_seconds:
                remaining_seconds = free_tier_limit_seconds - user['usage_seconds']
                return jsonify({'error': f'Transcription exceeds your monthly free limit. You have {remaining_seconds:.0f} seconds remaining.'}), 403

        # Process file
        audio_path = original_path
        if is_video_file(file.filename):
            audio_filename = f"{file_id}_audio.mp3"
            audio_path = UPLOAD_FOLDER / audio_filename
            extract_audio_from_video(original_path, audio_path)

        api_key = get_next_api_key()
        if not api_key:
            return jsonify({'error': 'Server is out of available API keys.'}), 503

        transcription_result = transcribe_audio(audio_path, api_key)

        # Update usage for free users
        if user['subscription_tier'] == 'free':
            new_usage = user['usage_seconds'] + media_duration
            supabase.table('profiles').update({'usage_seconds': new_usage}).eq('email', user['email']).execute()
            user['usage_seconds'] = new_usage # Update session user
            session['user_profile'] = user

        # Build response
        response = {
            'text': transcription_result.text,
            'segments': [],
            'pro_results': None,
            'user_profile': user # Send updated profile back to client
        }

        if hasattr(transcription_result, 'segments') and transcription_result.segments:
            response['segments'] = [
                {'start': seg.start, 'end': seg.end, 'text': seg.text}
                for seg in transcription_result.segments
            ]

        if is_pro_request and user['subscription_tier'] == 'pro':
            pro_api_key = get_next_api_key()
            if pro_api_key:
                response['pro_results'] = process_transcription_pro(transcription_result.text, pro_api_key)

        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
    finally:
        # Cleanup files
        try:
            if original_path.exists():
                original_path.unlink()
            if is_video_file(file.filename):
                audio_path = UPLOAD_FOLDER / f"{file_id}_audio.mp3"
                if audio_path.exists():
                    audio_path.unlink()
        except:
            pass


@app.route('/api/download', methods=['POST'])
@login_required
def download_transcription():
    """Download transcription as text file."""
    data = request.get_json()
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    # Create temporary file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"transcription_{timestamp}.txt"
    filepath = UPLOAD_FOLDER / filename
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    
    return send_file(filepath, as_attachment=True, download_name=filename)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
