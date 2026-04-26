FROM python:3.11-slim

# tesseract for OCR + libs needed by pymupdf/pillow + build tools for llama-cpp-python
RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr libgl1 libglib2.0-0 \
      build-essential cmake git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=9000
ENV TESSERACT_CMD=/usr/bin/tesseract
ENV LOCAL_MODEL_DIR=/app/models
EXPOSE 9000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
