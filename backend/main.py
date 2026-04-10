"""
n4mint - AI Transcription Platform with Spy Chase Gamification
FastAPI Backend
"""
import os
import json
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from pathlib import Path
import subprocess

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, status, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from jose import JWTError, jwt
import aiofiles
import openai
import httpx
import stripe

# Environment Variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")  # Only for Whisper transcription

# Stripe Configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Groq API Keys for rotation
GROQ_API_KEYS = [
    os.getenv("GROQ_API_KEY_1", ""),
    os.getenv("GROQ_API_KEY_2", ""),
    os.getenv("GROQ_API_KEY_3", ""),
    os.getenv("GROQ_API_KEY_4", "")
]
GROQ_API_KEYS = [key for key in GROQ_API_KEYS if key and key.strip() and key != '""']

# FFmpeg Configuration
FFMPEG_PATH = os.getenv("FFMPEG_PATH", "ffmpeg")

# Initialize clients
openai.api_key = OPENAI_API_KEY
stripe.api_key = STRIPE_SECRET_KEY

# Supabase HTTP client only
supabase_http: Optional[httpx.Client] = None

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    supabase_http = httpx.Client(
        base_url=SUPABASE_URL,
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json"
        }
    )
    print("Using Supabase HTTP client")

# Groq clients with rotation
groq_clients = []
if GROQ_API_KEYS:
    try:
        from groq import Groq
        for api_key in GROQ_API_KEYS:
            groq_clients.append(Groq(api_key=api_key))
        print(f"Initialized {len(groq_clients)} Groq clients")
    except ImportError:
        print("Groq package not installed")
        groq_clients = []

# API key rotation counter
groq_client_index = 0

def get_next_groq_client():
    """Get next Groq client with rotation"""
    global groq_client_index
    if not groq_clients:
        return None
    
    client = groq_clients[groq_client_index]
    groq_client_index = (groq_client_index + 1) % len(groq_clients)
    return client

# JWT Configuration
ALGORITHM = "HS256"

# Create directories
UPLOAD_DIR = Path("/tmp/n4mint_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR = Path("/tmp/n4mint_outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="n4mint API", version="3.0.0")
security = HTTPBearer()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== AUTH ====================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        print(f"JWT Secret configured: {bool(SUPABASE_JWT_SECRET)}")
        print(f"JWT Secret length: {len(SUPABASE_JWT_SECRET) if SUPABASE_JWT_SECRET else 0}")
        # Decode without algorithm restriction first to see what's being used
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, options={"verify_signature": True})
        print(f"JWT decoded successfully")
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if supabase:
            try:
                user_response = supabase.table("users").select("*").eq("id", user_id).single().execute()
                if user_response.data:
                    return user_response.data
            except:
                # User doesn't exist in database yet, create them
                try:
                    supabase.table("users").insert({
                        "id": user_id,
                        "email": payload.get("email", ""),
                        "created_at": datetime.utcnow().isoformat()
                    }).execute()
                    print(f"Created user record for {user_id}")
                    return {"id": user_id, "email": payload.get("email", "")}
                except Exception as e:
                    print(f"Error creating user record: {e}")
                    # Return minimal user data even if database insert fails
                    return {"id": user_id, "email": payload.get("email", "")}
        
        return {"id": user_id, "email": payload.get("email", "")}
    except JWTError as e:
        print(f"JWT decode error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== TRANSCRIPTION ====================

def get_audio_duration(file_path: str) -> float:
    """Get audio/video duration in seconds"""
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', file_path
        ], capture_output=True, text=True)
        return float(result.stdout.strip())
    except:
        return 0


def transcribe_with_whisper(audio_path: str) -> dict:
    """Transcribe using OpenAI Whisper with speaker diarization"""
    try:
        with open(audio_path, "rb") as audio_file:
            transcript = openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
                language="en"  # Can be made configurable
            )
        return transcript
    except Exception as e:
        print(f"OpenAI Whisper failed: {e}")
        # Fallback to basic transcription
        try:
            with open(audio_path, "rb") as audio_file:
                transcript = openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="json"
                )
            return transcript
        except Exception as fallback_error:
            print(f"Whisper fallback failed: {fallback_error}")
            raise Exception("Transcription failed completely")


def clean_transcript_with_groq(segments: list) -> str:
    """Clean up transcript using Groq Llama model with API key rotation"""
    full_text = " ".join([seg.get("text", "") for seg in segments])
    
    # Try each Groq API key in rotation
    for attempt in range(len(groq_clients)):
        client = get_next_groq_client()
        if not client:
            break
            
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",  # Fast Llama model for cleaning
                messages=[
                    {
                        "role": "system",
                        "content": "Clean up this transcript. Remove filler words (um, uh, like, you know), fix grammar, and make it readable. Keep the meaning intact. Preserve speaker labels if present."
                    },
                    {"role": "user", "content": full_text}
                ],
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Groq cleaning failed (attempt {attempt + 1}): {e}")
            continue
    
    print("All Groq API keys failed for transcript cleaning")
    return full_text  # Return original text as last resort


def clean_transcript(segments: list) -> str:
    """Wrapper for transcript cleaning"""
    return clean_transcript_with_groq(segments)


def generate_summary_with_groq(text: str) -> str:
    """Generate summary using Groq with API key rotation"""
    
    # Try each Groq API key in rotation
    for attempt in range(len(groq_clients)):
        client = get_next_groq_client()
        if not client:
            break
            
        try:
            response = client.chat.completions.create(
                model="llama-3.1-70b-versatile",  # Best model for summarization
                messages=[
                    {
                        "role": "system",
                        "content": "Create a concise summary with key points and main ideas. Focus on actionable insights and important takeaways. Make it engaging and easy to read."
                    },
                    {"role": "user", "content": f"Summarize:\n\n{text}"}
                ],
                max_tokens=500
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Groq summarization failed (attempt {attempt + 1}): {e}")
            continue
    
    print("All Groq API keys failed for summarization")
    return "Summary generation failed"


def generate_summary(text: str) -> str:
    """Wrapper for summary generation"""
    return generate_summary_with_groq(text)


def generate_clips_with_groq(segments: list) -> list:
    """Generate viral clip suggestions using Groq with API key rotation"""
    segments_info = [{"start": s.get("start"), "end": s.get("end"), "text": s.get("text")} 
                     for s in segments[:50]]
    
    # Try each Groq API key in rotation
    for attempt in range(len(groq_clients)):
        client = get_next_groq_client()
        if not client:
            break
            
        try:
            response = client.chat.completions.create(
                model="llama-3.1-70b-versatile",  # Best model for content analysis
                messages=[
                    {
                        "role": "system",
                        "content": """Find 3-5 viral short-form clips (15-60 sec). Look for:
1. Strong hooks/attention grabbers
2. Emotional moments
3. Key insights/takeaways
4. Funny or surprising moments
5. Actionable advice
6. Controversial or bold statements

Return JSON:
{"clips": [{"hook": "engaging title", "start_time": 0, "end_time": 15, "text": "...", "reason": "why viral", "viral_potential": "high/medium/low"}]}"""
                    },
                    {"role": "user", "content": json.dumps(segments_info)}
                ],
                max_tokens=1500
            )
            
            result = response.choices[0].message.content
            import re
            json_match = re.search(r'\{.*\}', result, re.DOTALL)
            if json_match:
                return json.loads(json_match.group()).get("clips", [])
        except Exception as e:
            print(f"Groq clip generation failed (attempt {attempt + 1}): {e}")
            continue
    
    print("All Groq API keys failed for clip generation")
    return []


def generate_clips(segments: list) -> list:
    """Wrapper for clip generation"""
    return generate_clips_with_groq(segments)


def create_video_clip(input_path: str, output_path: str, start_time: float, end_time: float) -> bool:
    """Create video clip using FFmpeg"""
    try:
        duration = end_time - start_time
        cmd = [
            FFMPEG_PATH,
            '-i', input_path,
            '-ss', str(start_time),
            '-t', str(duration),
            '-c', 'copy',  # Fast copy without re-encoding
            '-avoid_negative_ts', '1',
            '-y',  # Overwrite output
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"FFmpeg clip creation failed: {e}")
        return False


def create_audio_clips(input_path: str, clips: list, job_id: str) -> list:
    """Create audio clips for selected segments"""
    clip_files = []
    
    for i, clip in enumerate(clips[:5]):  # Limit to 5 clips
        start_time = clip.get("start_time", 0)
        end_time = clip.get("end_time", 30)
        output_path = OUTPUT_DIR / f"{job_id}_clip_{i+1}.mp3"
        
        if create_video_clip(str(input_path), str(output_path), start_time, end_time):
            clip_files.append({
                "clip_id": i + 1,
                "file_path": str(output_path),
                "start_time": start_time,
                "end_time": end_time,
                "hook": clip.get("hook", "Untitled Clip"),
                "text": clip.get("text", ""),
                "reason": clip.get("reason", "")
            })
    
    return clip_files


# ==================== PROCESSING ====================

async def process_file_task(job_id: str, input_path: Path, audio_path: Path, 
                            modes: list, user_id: str):
    """Background task to process file"""
    try:
        # Update status to processing
        if supabase:
            supabase.table("jobs").update({
                "status": "processing",
                "progress": 10
            }).eq("id", job_id).execute()
        
        # Transcribe
        transcript = transcribe_with_whisper(str(audio_path))
        segments = transcript.segments if hasattr(transcript, "segments") else []
        full_text = transcript.text if hasattr(transcript, "text") else ""
        
        if supabase:
            supabase.table("jobs").update({"progress": 40}).eq("id", job_id).execute()
        
        # Process based on modes
        output_files = {}
        
        if "transcript" in modes:
            raw_transcript = json.dumps({
                "text": full_text,
                "segments": [{"start": s.start, "end": s.end, "text": s.text} for s in segments]
            }, indent=2)
            raw_path = OUTPUT_DIR / f"{job_id}_transcript.json"
            async with aiofiles.open(raw_path, 'w') as f:
                await f.write(raw_transcript)
            output_files["transcript"] = str(raw_path)
        
        if "clean" in modes:
            cleaned = clean_transcript(segments)
            clean_path = OUTPUT_DIR / f"{job_id}_cleaned.txt"
            async with aiofiles.open(clean_path, 'w') as f:
                await f.write(cleaned)
            output_files["cleaned"] = str(clean_path)
        
        if supabase:
            supabase.table("jobs").update({"progress": 70}).eq("id", job_id).execute()
        
        if "summary" in modes:
            summary = generate_summary(full_text)
            summary_path = OUTPUT_DIR / f"{job_id}_summary.txt"
            async with aiofiles.open(summary_path, 'w') as f:
                await f.write(summary)
            output_files["summary"] = str(summary_path)
        
        if "clips" in modes:
            clips = generate_clips(segments)
            clips_path = OUTPUT_DIR / f"{job_id}_clips.json"
            async with aiofiles.open(clips_path, 'w') as f:
                await f.write(json.dumps({"clips": clips}, indent=2))
            output_files["clips"] = str(clips_path)
            
            # Create actual video/audio clips if original file was video
            if clips and input_path.suffix.lower() in ['.mp4', '.avi', '.mov', '.mkv']:
                clip_files = create_audio_clips(str(input_path), clips, job_id)
                if clip_files:
                    clips_data_path = OUTPUT_DIR / f"{job_id}_clip_files.json"
                    async with aiofiles.open(clips_data_path, 'w') as f:
                        await f.write(json.dumps({"clip_files": clip_files}, indent=2))
                    output_files["clip_files"] = str(clips_data_path)
        
        # Complete
        if supabase:
            supabase.table("jobs").update({
                "status": "completed",
                "progress": 100,
                "output_files": output_files,
                "completed_at": datetime.utcnow().isoformat()
            }).eq("id", job_id).execute()
        
        # Cleanup input
        if input_path.exists():
            input_path.unlink()
        if audio_path.exists() and audio_path != input_path:
            audio_path.unlink()
            
    except Exception as e:
        if supabase:
            supabase.table("jobs").update({
                "status": "failed",
                "error": str(e)
            }).eq("id", job_id).execute()


# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    return {"message": "n4mint API - Intelligence Processing", "version": "3.0.0"}


@app.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


@app.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    modes: str = Form("transcript,clean"),
    current_user: dict = Depends(get_current_user)
):
    """Upload file and start processing"""
    
    # Validate
    if not file.content_type.startswith(('video/', 'audio/')):
        raise HTTPException(400, "Only video/audio files")
    
    # Create job
    job_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix or ".mp4"
    input_path = UPLOAD_DIR / f"{job_id}{file_ext}"
    audio_path = UPLOAD_DIR / f"{job_id}.mp3"
    
    # Save file
    async with aiofiles.open(input_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Extract audio if video
    if file.content_type.startswith('video/'):
        subprocess.run([
            'ffmpeg', '-i', str(input_path), '-vn', '-acodec', 'libmp3lame',
            '-q:a', '2', '-y', str(audio_path)
        ], capture_output=True)
    else:
        audio_path = input_path
    
    # Get duration
    duration = get_audio_duration(str(audio_path))
    
    # Create job record
    if supabase:
        supabase.table("jobs").insert({
            "id": job_id,
            "user_id": current_user["id"],
            "filename": file.filename,
            "duration": duration,
            "modes": modes.split(","),
            "status": "queued",
            "progress": 0,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    
    # Start background processing
    mode_list = modes.split(",")
    background_tasks.add_task(process_file_task, job_id, input_path, audio_path, mode_list, current_user["id"])
    
    return {"job_id": job_id, "status": "queued", "estimated_minutes": max(1, int(duration / 60))}


@app.get("/job/{job_id}")
async def get_job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    """Get job status and progress"""
    if not supabase:
        return {"job_id": job_id, "status": "processing", "progress": 50}
    
    job = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job.data:
        raise HTTPException(404, "Job not found")
    
    return job.data


@app.get("/download/{job_id}/{file_type}")
async def download_file(job_id: str, file_type: str, current_user: dict = Depends(get_current_user)):
    """Download processed file"""
    if not supabase:
        raise HTTPException(500, "Database not configured")
    
    job = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job.data:
        raise HTTPException(404, "Job not found")
    
    output_files = job.data.get("output_files", {})
    file_path = output_files.get(file_type)
    
    if not file_path or not Path(file_path).exists():
        raise HTTPException(404, "File not found")
    
    # Determine file extension and content type
    if file_type == "transcript" or file_type == "clips" or file_type == "clip_files":
        filename = f"{job_id}_{file_type}.json"
    else:
        filename = f"{job_id}_{file_type}.txt"
    
    return FileResponse(file_path, filename=filename)


@app.get("/download-clip/{job_id}/{clip_id}")
async def download_clip(job_id: str, clip_id: int, current_user: dict = Depends(get_current_user)):
    """Download specific video/audio clip"""
    if not supabase:
        raise HTTPException(500, "Database not configured")
    
    job = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job.data:
        raise HTTPException(404, "Job not found")
    
    output_files = job.data.get("output_files", {})
    clips_data_path = output_files.get("clip_files")
    
    if not clips_data_path or not Path(clips_data_path).exists():
        raise HTTPException(404, "Clips not found")
    
    # Read clips data
    async with aiofiles.open(clips_data_path, 'r') as f:
        clips_data = json.loads(await f.read())
    
    # Find specific clip
    clip_files = clips_data.get("clip_files", [])
    target_clip = next((c for c in clip_files if c["clip_id"] == clip_id), None)
    
    if not target_clip or not Path(target_clip["file_path"]).exists():
        raise HTTPException(404, "Clip not found")
    
    filename = f"{job_id}_clip_{clip_id}.mp3"
    return FileResponse(target_clip["file_path"], filename=filename)


# ==================== GAME LEADERBOARD ====================

@app.post("/game/score")
async def submit_score(
    score: int,
    survival_time: float,
    current_user: dict = Depends(get_current_user)
):
    """Submit game score"""
    if supabase:
        supabase.table("scores").insert({
            "user_id": current_user["id"],
            "score": score,
            "survival_time": survival_time,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    
    return {"status": "saved"}


@app.get("/game/leaderboard")
async def get_leaderboard(limit: int = 10):
    """Get top scores"""
    if not supabase:
        return {"scores": []}
    
    scores = supabase.table("scores").select(
        "*, users(email)"
    ).order("score", desc=True).limit(limit).execute()
    
    return {"scores": scores.data}


@app.get("/game/my-scores")
async def get_my_scores(current_user: dict = Depends(get_current_user)):
    """Get user's scores"""
    if not supabase:
        return {"scores": []}
    
    scores = supabase.table("scores").select("*").eq(
        "user_id", current_user["id"]
    ).order("score", desc=True).limit(10).execute()
    
    return {"scores": scores.data}


# ==================== STRIPE WEBHOOKS ====================

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(500, "Webhook secret not configured")
    
    try:
        # Get the raw body and signature
        body = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        if not sig_header:
            raise HTTPException(400, "No signature provided")
        
        # Verify the webhook signature
        event = stripe.Webhook.construct_event(
            body, sig_header, STRIPE_WEBHOOK_SECRET
        )
        
        print(f"Stripe webhook event: {event.type}")
        
        # Handle different event types
        if event.type == "customer.subscription.created":
            await handle_subscription_created(event.data.object)
            
        elif event.type == "customer.subscription.updated":
            await handle_subscription_updated(event.data.object)
            
        elif event.type == "customer.subscription.deleted":
            await handle_subscription_deleted(event.data.object)
            
        elif event.type == "invoice.payment_succeeded":
            await handle_payment_succeeded(event.data.object)
            
        elif event.type == "invoice.payment_failed":
            await handle_payment_failed(event.data.object)
            
        elif event.type == "payment_intent.succeeded":
            await handle_payment_intent_succeeded(event.data.object)
            
        else:
            print(f"Unhandled event type: {event.type}")
        
        return {"status": "success"}
        
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(500, f"Webhook processing failed: {str(e)}")


async def handle_subscription_created(subscription):
    """Handle new subscription creation"""
    if not supabase:
        return
    
    try:
        # Extract subscription data
        user_id = subscription.metadata.get("user_id") if subscription.metadata else None
        if not user_id:
            print("No user_id in subscription metadata")
            return
        
        # Determine plan type from price ID
        plan_type = "free"
        price_id = subscription.items.data[0].price.id if subscription.items.data else None
        
        if price_id == os.getenv("STRIPE_PLUS_MONTHLY_PRICE_ID") or price_id == os.getenv("STRIPE_PLUS_ANNUAL_PRICE_ID"):
            plan_type = "plus"
        elif price_id == os.getenv("STRIPE_PRO_MONTHLY_PRICE_ID") or price_id == os.getenv("STRIPE_PRO_ANNUAL_PRICE_ID"):
            plan_type = "pro"
        
        # Create subscription record
        subscription_data = {
            "user_id": user_id,
            "status": subscription.status,
            "plan_type": plan_type,
            "stripe_customer_id": subscription.customer,
            "stripe_subscription_id": subscription.id,
            "stripe_price_id": price_id,
            "interval": subscription.items.data[0].recurring.interval if subscription.items.data else "month",
            "current_period_start": datetime.fromtimestamp(subscription.current_period_start).isoformat(),
            "current_period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }
        
        supabase.table("subscriptions").insert(subscription_data).execute()
        print(f"Created subscription for user {user_id}: {plan_type}")
        
    except Exception as e:
        print(f"Error handling subscription created: {e}")


async def handle_subscription_updated(subscription):
    """Handle subscription updates"""
    if not supabase:
        return
    
    try:
        # Find existing subscription
        existing = supabase.table("subscriptions").select("*").eq(
            "stripe_subscription_id", subscription.id
        ).single().execute()
        
        if not existing.data:
            print(f"Subscription {subscription.id} not found")
            return
        
        # Update subscription data
        update_data = {
            "status": subscription.status,
            "current_period_start": datetime.fromtimestamp(subscription.current_period_start).isoformat(),
            "current_period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if subscription.canceled_at:
            update_data["canceled_at"] = datetime.fromtimestamp(subscription.canceled_at).isoformat()
        if subscription.ended_at:
            update_data["ended_at"] = datetime.fromtimestamp(subscription.ended_at).isoformat()
        
        supabase.table("subscriptions").update(update_data).eq(
            "stripe_subscription_id", subscription.id
        ).execute()
        
        print(f"Updated subscription {subscription.id}: {subscription.status}")
        
    except Exception as e:
        print(f"Error handling subscription updated: {e}")


async def handle_subscription_deleted(subscription):
    """Handle subscription cancellation"""
    if not supabase:
        return
    
    try:
        update_data = {
            "status": "canceled",
            "ended_at": datetime.fromtimestamp(subscription.ended_at).isoformat() if subscription.ended_at else datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        supabase.table("subscriptions").update(update_data).eq(
            "stripe_subscription_id", subscription.id
        ).execute()
        
        print(f"Canceled subscription {subscription.id}")
        
    except Exception as e:
        print(f"Error handling subscription deleted: {e}")


async def handle_payment_succeeded(invoice):
    """Handle successful payment"""
    if not supabase:
        return
    
    try:
        if invoice.subscription:
            # Update subscription status to active
            update_data = {
                "status": "active",
                "updated_at": datetime.utcnow().isoformat()
            }
            
            supabase.table("subscriptions").update(update_data).eq(
                "stripe_subscription_id", invoice.subscription
            ).execute()
            
            print(f"Payment succeeded for subscription {invoice.subscription}")
        
    except Exception as e:
        print(f"Error handling payment succeeded: {e}")


async def handle_payment_failed(invoice):
    """Handle failed payment"""
    if not supabase:
        return
    
    try:
        if invoice.subscription:
            # Update subscription status to past_due
            update_data = {
                "status": "past_due",
                "updated_at": datetime.utcnow().isoformat()
            }
            
            supabase.table("subscriptions").update(update_data).eq(
                "stripe_subscription_id", invoice.subscription
            ).execute()
            
            print(f"Payment failed for subscription {invoice.subscription}")
        
    except Exception as e:
        print(f"Error handling payment failed: {e}")


async def handle_payment_intent_succeeded(payment_intent):
    """Handle successful one-time payment"""
    print(f"Payment intent succeeded: {payment_intent.id}")
    # Handle one-time payments if needed


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
