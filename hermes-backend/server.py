from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import os
import json

app = FastAPI(title="Hermes Agent Wrapper API")

class ChatRequest(BaseModel):
    user_id: str
    message: str

def ensure_profile(user_id: str):
    """Ensures a Hermes profile exists for the given user ID."""
    # We can just attempt to create it. If it exists, hermes warns or skips.
    try:
        subprocess.run(
            ["hermes", "profile", "create", user_id],
            capture_output=True,
            check=False,
            shell=False
        )
    except Exception as e:
        print(f"Error ensuring profile {user_id}: {e}")

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    if not req.user_id or not req.message:
        raise HTTPException(status_code=400, detail="Missing user_id or message")
    
    ensure_profile(req.user_id)
    
    # Run Hermes in oneshot mode, isolated to this user's profile via environment variable
    try:
        env = os.environ.copy()
        env["HERMES_PROFILE"] = req.user_id
        
        result = subprocess.run(
            ["hermes", "chat", "-z", req.message],
            capture_output=True,
            text=True,
            check=True,
            shell=False,
            env=env
        )
        # The oneshot mode (-z) prints ONLY the final response to stdout
        return {"reply": result.stdout.strip()}
    except subprocess.CalledProcessError as e:
        print(f"Hermes execution failed: {e.stderr}")
        return {"reply": f"Agent Error: {e.stderr.strip() or 'Unknown execution failure. Code: ' + str(e.returncode)}"}
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
