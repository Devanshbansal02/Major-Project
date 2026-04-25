FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

# System deps for Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy files needed for dependency resolution
COPY pyproject.toml uv.lock ./

# Install dependencies using uv into the system Python
RUN uv sync --frozen --no-dev

# Copy project files
COPY . .

# Set PYTHONPATH so `from backend.main import x` resolves from /app
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
