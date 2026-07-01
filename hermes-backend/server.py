from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib
import os
import asyncio
from fastapi.responses import JSONResponse

app = FastAPI(title="Hermes Agent Wrapper API")

class ChatRequest(BaseModel):
    user_id: str
    message: str

PROFILE_PREFIX = "calmant"
MAX_MESSAGE_CHARS = 16000
HERMES_TIMEOUT_SECONDS = int(os.environ.get("HERMES_TIMEOUT_SECONDS", "90"))
# Use an asyncio Semaphore to limit concurrent Hermes CLI executions
CONCURRENCY_LIMIT = int(os.environ.get("HERMES_CONCURRENCY_LIMIT", "5"))
semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

def profile_name_for_user(user_id: str) -> str:
    """Return a safe, stable Hermes profile name without exposing raw user IDs."""
    digest = hashlib.sha256(user_id.encode("utf-8")).hexdigest()[:32]
    return f"{PROFILE_PREFIX}-{digest}"

async def ensure_profile(profile_name: str):
    """Ensures a Hermes profile exists for the given user profile."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "hermes", "profile", "create", profile_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=os.environ.copy()
        )
        try:
            await asyncio.wait_for(proc.communicate(), timeout=30)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            print(f"Timeout while creating profile {profile_name}")
    except Exception as e:
        print(f"Error ensuring profile {profile_name}: {e}")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/health/detailed")
async def health_detailed():
    """Detailed health check that verifies the Hermes CLI binary is available."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "hermes", "--version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=5)
        if proc.returncode == 0:
            return {
                "status": "ok",
                "hermes_version": stdout.decode().strip(),
                "db_connected": "assumed"  # Replace with actual DB check if applicable
            }
        else:
            return JSONResponse(
                status_code=503,
                content={"status": "error", "detail": "hermes binary returned non-zero"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "detail": str(e)}
        )

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    if not req.user_id or not req.message:
        raise HTTPException(status_code=400, detail="Missing user_id or message")

    if len(req.message) > MAX_MESSAGE_CHARS:
        raise HTTPException(status_code=413, detail="Message is too large")

    profile_name = profile_name_for_user(req.user_id)
    await ensure_profile(profile_name)

    env = os.environ.copy()
    # Still passing this for plugin context, but using -p explicitly for the command
    env["CALMANT_USER_ID"] = req.user_id
    env["HERMES_PROFILE"] = profile_name

    async with semaphore:
        try:
            proc = await asyncio.create_subprocess_exec(
                "hermes", "-z", req.message,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=HERMES_TIMEOUT_SECONDS)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                raise HTTPException(status_code=504, detail="Hermes execution timed out")

            if proc.returncode != 0:
                error_output = stderr.decode().strip() or stdout.decode().strip() or f"Unknown execution failure. Code: {proc.returncode}"
                print(f"Hermes execution failed: {error_output}")
                raise HTTPException(status_code=500, detail=f"Agent Error: {error_output}")

            return {"reply": stdout.decode().strip()}

        except HTTPException:
            raise
        except Exception as e:
            print(f"Unexpected error: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
