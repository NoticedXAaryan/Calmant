import os
import requests
import json

SANDBOX_URL = os.environ.get("SANDBOX_URL", "http://localhost:4000")
SANDBOX_TIMEOUT = 30

def create_browser_session() -> dict:
    """Create a new isolated browser session in the sandbox."""
    try:
        res = requests.post(f"{SANDBOX_URL}/session", timeout=SANDBOX_TIMEOUT)
        if res.status_code != 200:
            return {"error": f"Sandbox HTTP {res.status_code}"}
        data = res.json()
        return {"sessionId": data.get("sessionId"), "status": "ready"}
    except requests.exceptions.RequestException as e:
        return {"error": f"Browser sandbox unreachable: {str(e)}"}

def navigate(session_id: str, url: str) -> dict:
    """Navigate the browser session to a specific URL."""
    try:
        res = requests.post(
            f"{SANDBOX_URL}/session/{session_id}/navigate",
            json={"url": url},
            timeout=SANDBOX_TIMEOUT
        )
        return res.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

def extract_page_data(session_id: str) -> dict:
    """Extract structured data (forms, links, text) from the current page."""
    try:
        res = requests.get(
            f"{SANDBOX_URL}/session/{session_id}/extract",
            timeout=SANDBOX_TIMEOUT
        )
        return res.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

def close_browser_session(session_id: str) -> dict:
    """Close a browser session and free resources."""
    try:
        res = requests.delete(
            f"{SANDBOX_URL}/session/{session_id}",
            timeout=SANDBOX_TIMEOUT
        )
        return res.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}
