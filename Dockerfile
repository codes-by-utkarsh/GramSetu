FROM python:3.11-slim-bullseye

# Keep python from buffering stdout/stderr
ENV PYTHONUNBUFFERED=1

# Install system dependencies (OpenCV, Tesseract OCR, Audio processing, Node.js)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    tesseract-ocr \
    tesseract-ocr-hin \
    libgl1-mesa-glx \
    libsndfile1 \
    ffmpeg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install serve for the built frontend
RUN npm install -g serve

WORKDIR /app

# Copy Requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser and its OS dependencies
RUN playwright install chromium --with-deps

# Copy the entire codebase
COPY . .

# Fix Windows CRLF line endings for bash scripts
RUN apt-get install -y dos2unix && dos2unix start.sh

# Build the Web Frontend
WORKDIR /app/mobile-app
RUN npm install
RUN npx expo export -p web

# Return to root directory and construct startup script
WORKDIR /app
RUN chmod +x start.sh

# Expose all used ports
# 8000: Orchestrator
# 8001: Voice Service
# 8002: Agent Service
# 8003: Document Service
# 3000: Web App
EXPOSE 8000 8001 8002 8003 3000

CMD ["./start.sh"]
