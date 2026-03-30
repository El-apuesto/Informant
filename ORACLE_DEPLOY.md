# Oracle Cloud Deployment Guide

## Setup Oracle Cloud Compute Instance

1. **Create VM Instance:**
   - Go to Oracle Cloud Console → Compute → Instances
   - Create instance: Ubuntu 22.04, VM.Standard2.1 (Free Tier)
   - Add SSH key for access

2. **Install Docker:**
   ```bash
   ssh ubuntu@your-instance-ip
   sudo apt update
   sudo apt install -y docker.io docker-compose
   sudo usermod -aG docker ubuntu
   # Log out and back in
   ```

3. **Deploy App:**
   ```bash
   git clone https://github.com/yourusername/Informant.git
   cd Informant
   cp .env.example .env
   # Edit .env with your variables
   docker-compose up -d
   ```

4. **Setup Domain (Optional):**
   - Use Oracle's free DNS service
   - Point A record to your VM IP

## Environment Variables (.env file):
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GROQ_API_KEYS=key1,key2,key3
SECRET_KEY=your_secret_key_here
```

## Access Your App:
- http://your-instance-ip:5000
- Health check: http://your-instance-ip:5000/api/health
