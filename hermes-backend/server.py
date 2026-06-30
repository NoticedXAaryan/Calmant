from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib
import os
import subprocess

app = FastAPI(title="Hermes Agent Wrapper API")


class ChatRequest(BaseModel):
    user_id: str
    message: str


PROFILE_PREFIX = "calmant"
MAX_MESSAGE_CHARS = 16000
HERMES_TIMEOUT_SECONDS = int(os.environ.get("HERMES_TIMEOUT_SECONDS", "90"))


def profile_name_for_user(user_id: str) -> str:
    """Return a safe, stable Hermes profile name without exposing raw user IDs."""
    digest = hashlib.sha256(user_id.encode("utf-8")).hexdigest()[:32]
    return f"{PROFILE_PREFIX}-{digest}"


def ensure_profile(profile_name: str):
    """Ensures a Hermes profile exists for the given user profile."""
    try:
        subprocess.run(
            ["hermes", "profile", "create", profile_name],
            capture_output=True,
            check=False,
            shell=False,
            env=os.environ.copy(),
            timeout=30,
        )
    except Exception as e:
        print(f"Error ensuring profile {profile_name}: {e}")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    if not req.user_id or not req.message:
        raise HTTPException(status_code=400, detail="Missing user_id or message")

    if len(req.message) > MAX_MESSAGE_CHARS:
        raise HTTPException(status_code=413, detail="Message is too large")

    profile_name = profile_name_for_user(req.user_id)
    ensure_profile(profile_name)

    try:
        env = os.environ.copy()
        env["HERMES_PROFILE"] = profile_name
        env["CALMANT_USER_ID"] = req.user_id

        result = subprocess.run(
            ["hermes", "-z", req.message],
            capture_output=True,
            text=True,
            check=True,
            shell=False,
            env=env,
            timeout=HERMES_TIMEOUT_SECONDS,
        )
        return {"reply": result.stdout.strip()}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Hermes timed out")
    except subprocess.CalledProcessError as e:
        print(f"Hermes execution failed: {e.stderr}")
        return {
            "reply": (
                "Agent Error: "
                + (e.stderr.strip() or "Unknown execution failure. Code: " + str(e.returncode))
            )
        }
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
