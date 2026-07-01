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

# Install Hermes Agent deterministically
ARG HERMES_COMMIT="3aebdb1d2349f1b228aa0478fce2e2fe91827278"
RUN curl -sL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --commit "$HERMES_COMMIT" --skip-setup

# Verify installation at build time
RUN which hermes
RUN hermes --help

# Install FastAPI wrapper dependencies
RUN pip install fastapi uvicorn pydantic requests

COPY calmant /root/.hermes/plugins/calmant/
COPY server.py /app/server.py

# Expose the API port
EXPOSE 8000

# Start the FastAPI server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
