import os
import requests
from typing import Optional, Dict, Any

WEB_URL = os.environ.get("WEB_URL", "http://web:3000")
INTERNAL_API_SECRET = os.environ.get("HERMES_INTERNAL_API_SECRET")
SANDBOX_URL = os.environ.get("SANDBOX_URL", "http://localhost:4000")
SANDBOX_TIMEOUT = 30

def _get_headers() -> Dict[str, str]:
    if not INTERNAL_API_SECRET:
        raise Exception("INTERNAL_API_SECRET environment variable is required")
    return {
        "Authorization": f"Bearer {INTERNAL_API_SECRET}",
        "Content-Type": "application/json"
    }

def _get_current_user_id(requested_user_id: Optional[str] = None) -> str:
    current_user_id = os.environ.get("CALMANT_USER_ID")
    if not current_user_id:
        raise Exception("CALMANT_USER_ID environment variable is required")
    if requested_user_id and requested_user_id != current_user_id:
        raise Exception("Cross-user data access is not allowed")
    return current_user_id

# Database / Tasks
def calmant_get_tasks(user_id: Optional[str] = None) -> dict:
    """Retrieve pending tasks for the active Hermes profile user."""
    try:
        user_id = _get_current_user_id(user_id)
        url = f"{WEB_URL}/api/internal/hermes/tasks?userId={user_id}"
        
        response = requests.get(url, headers=_get_headers(), timeout=10)
        response.raise_for_status()
        
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def calmant_create_task(title: str, estimated_mins: int = 30, user_id: Optional[str] = None) -> dict:
    """Create a new task for the active Hermes profile user."""
    try:
        user_id = _get_current_user_id(user_id)
        url = f"{WEB_URL}/api/internal/hermes/tasks"
        
        payload = {
            "userId": user_id,
            "title": title,
            "estimatedMins": estimated_mins
        }
        
        response = requests.post(url, json=payload, headers=_get_headers(), timeout=10)
        response.raise_for_status()
        
        return response.json()
    except Exception as e:
        return {"error": str(e)}

# Sandbox Browser
def calmant_create_browser_session() -> dict:
    """Create a new isolated browser session in the sandbox."""
    try:
        res = requests.post(f"{SANDBOX_URL}/session", timeout=SANDBOX_TIMEOUT)
        if res.status_code != 200:
            return {"error": f"Sandbox HTTP {res.status_code}"}
        data = res.json()
        return {"sessionId": data.get("sessionId"), "status": "ready"}
    except requests.exceptions.RequestException as e:
        return {"error": f"Browser sandbox unreachable: {str(e)}"}

def calmant_browser_navigate(session_id: str, url: str) -> dict:
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

def calmant_browser_extract(session_id: str) -> dict:
    """Extract structured data (forms, links, text) from the current page."""
    try:
        res = requests.post(
            f"{SANDBOX_URL}/session/{session_id}/extract",
            timeout=SANDBOX_TIMEOUT
        )
        return res.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

def calmant_browser_act(session_id: str, action: str, target: str, value: Optional[str] = None) -> dict:
    """Perform an action on the current page (e.g., click, type)."""
    try:
        res = requests.post(
            f"{SANDBOX_URL}/session/{session_id}/act",
            json={"action": action, "target": target, "value": value},
            timeout=SANDBOX_TIMEOUT
        )
        return res.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

def calmant_browser_screenshot(session_id: str) -> dict:
    """Take a screenshot of the current page."""
    try:
        res = requests.post(
            f"{SANDBOX_URL}/session/{session_id}/screenshot",
            timeout=SANDBOX_TIMEOUT
        )
        return res.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

def calmant_close_browser_session(session_id: str) -> dict:
    """Close a browser session and free resources."""
    try:
        res = requests.delete(
            f"{SANDBOX_URL}/session/{session_id}",
            timeout=SANDBOX_TIMEOUT
        )
        return res.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}
