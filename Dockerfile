FROM python:3.11-slim

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY templates/ templates/

# Create upload directory
RUN mkdir -p /tmp/transcription_uploads

# Set environment variables
ENV FLASK_ENV=production
ENV SECRET_KEY=change-this-in-production

# Expose port
EXPOSE 5000

# Run the application
CMD ["python3", "app.py"]
