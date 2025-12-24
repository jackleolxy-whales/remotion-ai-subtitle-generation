FROM node:20-bullseye

# Install Python and FFmpeg for transcription and media processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install OpenAI Whisper
RUN pip3 install openai-whisper setuptools-rust

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV PORT=8000
EXPOSE 8000

# Start the Express server
CMD ["npm", "run", "start"]

