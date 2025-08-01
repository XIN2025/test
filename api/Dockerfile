FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install uv for faster dependency management
RUN pip install uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen

# Copy the rest of the code
COPY . .

# Set environment variables for CORS
ENV CORS_ORIGINS=https://web.evra.opengig.work
ENV ALLOWED_HOSTS=api.evra.opengig.work,localhost,127.0.0.1

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI app
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]