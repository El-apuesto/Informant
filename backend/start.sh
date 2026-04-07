#!/bin/bash
# n4mint Backend Startup Script

echo "╔══════════════════════════════════════════╗"
echo "║       n4mint Intelligence Platform       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check required environment variables
check_env() {
    if [ -z "$1" ]; then
        echo "❌ Missing: $2"
        return 1
    else
        echo "✅ $2 is set"
        return 0
    fi
}

echo "Checking environment variables..."
echo ""

MISSING=0

check_env "$SUPABASE_URL" "SUPABASE_URL" || MISSING=1
check_env "$SUPABASE_SERVICE_KEY" "SUPABASE_SERVICE_KEY" || MISSING=1
check_env "$SUPABASE_JWT_SECRET" "SUPABASE_JWT_SECRET" || MISSING=1
check_env "$STRIPE_SECRET_KEY" "STRIPE_SECRET_KEY" || MISSING=1
check_env "$OPENAI_API_KEY" "OPENAI_API_KEY" || MISSING=1

echo ""

if [ $MISSING -eq 1 ]; then
    echo "⚠️  Some required environment variables are missing!"
    echo "   Please set them before starting the server."
    echo ""
fi

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg is not installed!"
    echo "   Audio/video processing will not work."
    echo ""
fi

echo "Starting server on port 8000..."
echo ""

# Start the server
exec python3 main.py
