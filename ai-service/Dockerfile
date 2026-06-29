FROM python:3.10-slim

# ── 1. System Dependencies (بدون أدوات البناء الثقيلة) ──────────────────────────
# تذكر: شيلنا cmake و build-essential عشان الـ RAM متضربش
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── 2. Environment Variables ──────────────────────────────────────────────────
ENV HF_HOME=/app/.cache/huggingface
ENV PORT=9000
ENV TESSERACT_CMD=/usr/bin/tesseract
ENV LOCAL_MODEL_DIR=/app/models
ENV LOCAL_MODEL_REPO=Qwen/Qwen2.5-1.5B-Instruct-GGUF
ENV LOCAL_MODEL_FILE=qwen2.5-1.5b-instruct-q4_k_m.gguf
ENV LOCAL_MODEL_CTX=2048
ENV LOCAL_MODEL_THREADS=4
ENV LOCAL_MODEL_GPU_LAYERS=0
# جوة قسم الـ Environment Variables في الـ Dockerfile بتاعك
ENV INTERNAL_API_KEY="your_secret_key_here"
# ── 3. Install Python Dependencies ───────────────────────────────────────────
COPY requirements.txt ./

# أولاً: تثبيت نسخة llama-cpp-python الجاهزة والمبنية مسبقاً للـ CPU بدون أي كومبيلر
RUN pip install --no-cache-dir llama-cpp-python \
    --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu

# ثانياً: تثبيت باقي المكتبات الموجودة في الـ requirements ما عدا llama-cpp-python
RUN pip install --no-cache-dir $(grep -v -E '^#|^$' requirements.txt | grep -v 'llama-cpp-python' | tr '\n' ' ')

# ── 4. Copy Application Code ──────────────────────────────────────────────────
COPY . .

EXPOSE 9000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]