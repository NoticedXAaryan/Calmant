FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install uv (fast Python package installer)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Install Hermes Agent (using official installer script for linux)
RUN curl -sL https://hermes-agent.nousresearch.com/install.sh | bash

# Put hermes in PATH. The install script usually places it in ~/.hermes/hermes-agent/venv/bin/hermes
ENV PATH="/root/.hermes/hermes-agent/venv/bin:$PATH"

# Install FastAPI wrapper dependencies
RUN pip install fastapi uvicorn pydantic requests psycopg2-binary

# Copy custom skills and API wrapper
COPY sandbox_tools.py /root/.hermes/skills/
COPY db_tools.py /root/.hermes/skills/
COPY server.py /app/server.py

# Expose the API port
EXPOSE 8000

# Start the FastAPI server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
