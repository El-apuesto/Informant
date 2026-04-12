"""
n4mint Backend - FastAPI AI Transcription Service
"""

import os
import json
import asyncio
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, BackgroundTasks, Request, Header
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
import jwt
from jwt.exceptions import InvalidTokenError
from groq import Groq
from supabase import create_client, Client
import stripe

# Environment Variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

GROQ_API_KEY_1 = os.getenv("GROQ_API_KEY_1", "")
GROQ_API_KEY_2 = os.getenv("GROQ_API_KEY_2", "")
GROQ_API_KEY_3 = os.getenv("GROQ_API_KEY_3", "")

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PLUS_MONTHLY_PRICE_ID = os.getenv("STRIPE_PLUS_MONTHLY_PRICE_ID", "")
STRIPE_PLUS_ANNUAL_PRICE_ID = os.getenv("STRIPE_PLUS_ANNUAL_PRICE_ID", "")
STRIPE_PRO_MONTHLY_PRICE_ID = os.getenv("STRIPE_PRO_MONTHLY_PRICE_ID", "")
STRIPE_PRO_ANNUAL_PRICE_ID = os.getenv("STRIPE_PRO_ANNUAL_PRICE_ID", "")

APP_URL = os.getenv("APP_URL", "")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
stripe.api_key = STRIPE_SECRET_KEY

# Groq key rotation
GROQ_KEYS = [k for k in [GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3] if k]

# Valid MIME types
VALID_MIME_TYPES = {
    "video/mp4", "video/quicktime", "video/x-msvideo", 
    "video/x-matroska", "video/webm", "audio/mpeg", 
    "audio/wav", "audio/x-m4a", "audio/aac", "audio/flac", "audio/ogg"
}

# Video MIME types that need audio extraction
VIDEO_MIME_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"}

app = FastAPI(title="n4mint API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[APP_URL] if APP_URL else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Auth dependency
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated", options={"verify_aud": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user profile
        profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        if not profile.data:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {"id": user_id, "profile": profile.data, "token": token}
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Groq client with key rotation
def get_groq_client() -> Groq:
    for key in GROQ_KEYS:
        try:
            client = Groq(api_key=key)
            # Test the key with a minimal request
            return client
        except Exception:
            continue
    raise HTTPException(status_code=503, detail="All operatives are unavailable. Stand by and retry in a few minutes.")


async def groq_call_with_rotation(func, *args, **kwargs):
    """Call Groq API with key rotation on rate limit."""
    for i, key in enumerate(GROQ_KEYS):
        try:
            client = Groq(api_key=key)
            return await asyncio.to_thread(lambda: func(client, *args, **kwargs))
        except Exception as e:
            error_str = str(e).lower()
            if "rate limit" in error_str or "429" in error_str:
                if i < len(GROQ_KEYS) - 1:
                    continue
                raise HTTPException(status_code=503, detail="All operatives are unavailable. Stand by and retry in a few minutes.")
            elif "402" in error_str or "quota" in error_str or "billing" in error_str:
                if i < len(GROQ_KEYS) - 1:
                    continue
                raise HTTPException(status_code=503, detail="All operatives are unavailable. Stand by and retry in a few minutes.")
            raise
    raise HTTPException(status_code=503, detail="All operatives are unavailable. Stand by and retry in a few minutes.")


def transcribe_with_groq(client: Groq, audio_path: str):
    """Synchronous Groq transcription call."""
    with open(audio_path, "rb") as audio_file:
        return client.audio.transcriptions.create(
            model="whisper-large-v3-turbo",
            file=audio_file,
            response_format="verbose_json"
        )


def llm_call_with_groq(client: Groq, system_prompt: str, user_text: str):
    """Synchronous Groq LLM call."""
    return client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text}
        ],
        temperature=0.3
    )


# Health check
@app.get("/")
async def health_check():
    return {"version": "1.0.0", "status": "operational"}


# Get current user profile
@app.get("/me")
async def get_me(user: Dict = Depends(get_current_user)):
    return user["profile"]


# Get pricing plans
@app.get("/plans")
async def get_plans():
    return {
        "free": {"monthly": 0, "annual": 0},
        "plus": {
            "monthly": 12,
            "annual": 100,
            "price_ids": {
                "monthly": STRIPE_PLUS_MONTHLY_PRICE_ID,
                "annual": STRIPE_PLUS_ANNUAL_PRICE_ID
            }
        },
        "pro": {
            "monthly": 24,
            "annual": 200,
            "price_ids": {
                "monthly": STRIPE_PRO_MONTHLY_PRICE_ID,
                "annual": STRIPE_PRO_ANNUAL_PRICE_ID
            }
        }
    }


# Upload endpoint
@app.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    modes: str = Form(...),
    user: Dict = Depends(get_current_user)
):
    user_id = user["id"]
    profile = user["profile"]
    tier = profile.get("subscription_tier", "free")
    
    # Validate MIME type
    if file.content_type not in VALID_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}")
    
    # Check subscription limits for free tier
    if tier == "free":
        job_count = supabase.table("jobs").select("id", count="exact").eq("user_id", user_id).execute()
        if job_count.count and job_count.count >= 3:
            raise HTTPException(status_code=403, detail="Free tier limit reached. Upgrade to continue.")
    
    # Parse modes
    mode_list = modes.split(",")
    
    # Validate at least one mode
    if not mode_list or mode_list == [""]:
        raise HTTPException(status_code=400, detail="At least one processing mode must be selected")
    
    # Save file to temp
    file_ext = os.path.splitext(file.filename)[1] or ".mp4"
    temp_id = str(uuid.uuid4())
    temp_path = f"/tmp/n4mint_uploads/{temp_id}{file_ext}"
    audio_path = f"/tmp/n4mint_audio/{temp_id}.wav"
    
    os.makedirs("/tmp/n4mint_uploads", exist_ok=True)
    os.makedirs("/tmp/n4mint_audio", exist_ok=True)
    
    content = await file.read()
    with open(temp_path, "wb") as f:
        f.write(content)
    
    # Extract audio if video
    if file.content_type in VIDEO_MIME_TYPES:
        await extract_audio(temp_path, audio_path)
    else:
        audio_path = temp_path
    
    # Create job record
    job = supabase.table("jobs").insert({
        "user_id": user_id,
        "filename": file.filename,
        "modes": mode_list,
        "status": "queued",
        "progress": 0,
        "output_urls": {}
    }).execute()
    
    job_id = job.data[0]["id"]
    
    # Start background processing
    background_tasks.add_task(process_job, job_id, audio_path, mode_list, user_id)
    
    # Estimate processing time (rough estimate: 1 min per minute of audio)
    estimated_seconds = 60
    
    return {"job_id": job_id, "estimated_seconds": estimated_seconds}


async def extract_audio(video_path: str, audio_path: str):
    """Extract audio from video using ffmpeg."""
    import subprocess
    
    cmd = ["ffmpeg", "-i", video_path, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", "-y", audio_path]
    
    def run_ffmpeg():
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"FFmpeg error: {result.stderr}")
        return result
    
    await asyncio.to_thread(run_ffmpeg)


async def process_job(job_id: str, audio_path: str, modes: List[str], user_id: str):
    """Background task to process the audio file."""
    try:
        # Update status to processing
        supabase.table("jobs").update({"status": "processing", "progress": 10}).eq("id", job_id).execute()
        
        # Step 1: Transcribe with Whisper
        supabase.table("jobs").update({"progress": 20}).eq("id", job_id).execute()
        
        transcription_result = await groq_call_with_rotation(transcribe_with_groq, audio_path)
        
        supabase.table("jobs").update({"progress": 40}).eq("id", job_id).execute()
        
        # Prepare output URLs
        output_urls = {}
        
        # Save transcript
        if "transcript" in modes:
            transcript_data = {
                "text": transcription_result.text,
                "segments": [
                    {"id": s.id, "start": s.start, "end": s.end, "text": s.text}
                    for s in transcription_result.segments
                ]
            }
            transcript_path = f"{job_id}/transcript.json"
            await upload_json_to_storage(transcript_path, transcript_data)
            output_urls["transcript"] = get_public_url(transcript_path)
        
        supabase.table("jobs").update({"progress": 50}).eq("id", job_id).execute()
        
        # Clean mode
        if "clean" in modes:
            clean_text = await process_clean(transcription_result.text)
            clean_path = f"{job_id}/clean.txt"
            await upload_text_to_storage(clean_path, clean_text)
            output_urls["clean"] = get_public_url(clean_path)
        
        supabase.table("jobs").update({"progress": 65}).eq("id", job_id).execute()
        
        # Summary mode
        if "summary" in modes:
            summary_text = await process_summary(transcription_result.text)
            summary_path = f"{job_id}/summary.txt"
            await upload_text_to_storage(summary_path, summary_text)
            output_urls["summary"] = get_public_url(summary_path)
        
        supabase.table("jobs").update({"progress": 80}).eq("id", job_id).execute()
        
        # Clips mode
        if "clips" in modes:
            clips_data = await process_clips(transcription_result.segments)
            clips_path = f"{job_id}/clips.json"
            await upload_json_to_storage(clips_path, clips_data)
            output_urls["clips"] = get_public_url(clips_path)
        
        supabase.table("jobs").update({"progress": 95}).eq("id", job_id).execute()
        
        # Mark as completed
        supabase.table("jobs").update({
            "status": "completed",
            "progress": 100,
            "output_urls": output_urls,
            "completed_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()
        
    except Exception as e:
        supabase.table("jobs").update({
            "status": "failed",
            "error": str(e)
        }).eq("id", job_id).execute()
    finally:
        # Cleanup temp files
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
        except:
            pass


async def process_clean(text: str) -> str:
    """Clean up transcript using LLM."""
    system_prompt = """You are a professional transcript editor. Remove all filler words (um, uh, like, you know, so, right). Fix grammar and punctuation. Format into clean paragraphs. Return only the cleaned text, no preamble."""
    
    response = await groq_call_with_rotation(llm_call_with_groq, system_prompt, text)
    return response.choices[0].message.content


async def process_summary(text: str) -> str:
    """Summarize transcript using LLM."""
    system_prompt = """You are a professional summarizer. Return a concise summary of the key points as short paragraphs. Return only the summary, no preamble."""
    
    response = await groq_call_with_rotation(llm_call_with_groq, system_prompt, text)
    return response.choices[0].message.content


async def process_clips(segments) -> List[Dict]:
    """Extract clip segments using LLM."""
    system_prompt = """You are a short-form video editor. Identify the 3-5 best segments for TikTok/Reels/Shorts (15-90 seconds each). Return ONLY valid JSON, no markdown, no explanation: [{"hook": "title", "start_time": 12.4, "end_time": 45.2, "text": "...", "reason": "why this works"}]"""
    
    # Format segments for LLM
    segments_text = "\n".join([f"[{s.start:.1f}-{s.end:.1f}] {s.text}" for s in segments])
    
    response = await groq_call_with_rotation(llm_call_with_groq, system_prompt, segments_text)
    content = response.choices[0].message.content
    
    # Try to parse JSON
    try:
        # Clean up potential markdown
        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()
        return json.loads(content)
    except json.JSONDecodeError:
        return []


async def upload_json_to_storage(path: str, data: dict):
    """Upload JSON to Supabase Storage."""
    json_bytes = json.dumps(data, indent=2).encode("utf-8")
    await asyncio.to_thread(
        lambda: supabase.storage.from_("outputs").upload(path, json_bytes, {"content-type": "application/json"})
    )


async def upload_text_to_storage(path: str, text: str):
    """Upload text to Supabase Storage."""
    text_bytes = text.encode("utf-8")
    await asyncio.to_thread(
        lambda: supabase.storage.from_("outputs").upload(path, text_bytes, {"content-type": "text/plain"})
    )


def get_public_url(path: str) -> str:
    """Get public URL for a storage object."""
    return supabase.storage.from_("outputs").get_public_url(path)


# Get job status
@app.get("/job/{job_id}")
async def get_job(job_id: str, user: Dict = Depends(get_current_user)):
    job = supabase.table("jobs").select("*").eq("id", job_id).eq("user_id", user["id"]).single().execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.data


# Download redirect
@app.get("/download/{job_id}/{file_type}")
async def download_file(job_id: str, file_type: str, user: Dict = Depends(get_current_user)):
    job = supabase.table("jobs").select("*").eq("id", job_id).eq("user_id", user["id"]).single().execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")
    
    output_urls = job.data.get("output_urls", {})
    if file_type not in output_urls:
        raise HTTPException(status_code=404, detail="File type not found")
    
    return RedirectResponse(url=output_urls[file_type])


# Create Stripe checkout session
@app.post("/create-checkout-session")
async def create_checkout_session(data: dict, user: Dict = Depends(get_current_user)):
    price_id = data.get("price_id")
    if not price_id:
        raise HTTPException(status_code=400, detail="Price ID required")
    
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            subscription_data={"trial_period_days": 7},
            success_url=f"{APP_URL}/app?upgraded=1",
            cancel_url=f"{APP_URL}",
            customer_email=user["profile"].get("email"),
            metadata={"user_id": user["id"], "price_id": price_id}
        )
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Stripe webhook
@app.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception:
        raise HTTPException(status_code=400, detail="Webhook error")
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        price_id = session.get("metadata", {}).get("price_id")
        customer_id = session.get("customer")
        
        # Determine tier from price_id
        tier = "free"
        if price_id in [STRIPE_PLUS_MONTHLY_PRICE_ID, STRIPE_PLUS_ANNUAL_PRICE_ID]:
            tier = "plus"
        elif price_id in [STRIPE_PRO_MONTHLY_PRICE_ID, STRIPE_PRO_ANNUAL_PRICE_ID]:
            tier = "pro"
        
        # Update user profile
        supabase.table("profiles").update({
            "subscription_tier": tier,
            "stripe_customer_id": customer_id
        }).eq("id", user_id).execute()
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        
        # Reset to free tier
        supabase.table("profiles").update({
            "subscription_tier": "free"
        }).eq("stripe_customer_id", customer_id).execute()
    
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
