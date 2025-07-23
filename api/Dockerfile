FROM python:3.12-slim

# Install uv and required build tools
RUN apt-get update && apt-get install -y curl build-essential && \
  curl -sSf https://astral.sh/uv/install.sh | sh

WORKDIR /app

# Copy project files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN uv pip install -r requirements.txt && uv sync --production

# Copy the rest of the application
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Run with Uvicorn in production
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8000", "--workers", "1"]