import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json

DB_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    if not DB_URL:
        raise Exception("DATABASE_URL environment variable is required")
    return psycopg2.connect(DB_URL)

def get_user_tasks(user_id: str) -> dict:
    """Retrieve pending tasks for a specific user."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, title, status, deadline, \"entropyScore\" FROM \"Task\" WHERE \"userId\" = %s AND status IN ('PENDING', 'IN_PROGRESS')", (user_id,))
        tasks = cur.fetchall()
        cur.close()
        conn.close()
        
        # Convert datetime objects to string for JSON serialization
        for task in tasks:
            if task.get('deadline'):
                task['deadline'] = task['deadline'].isoformat()
                
        return {"tasks": tasks, "status": "success"}
    except Exception as e:
        return {"error": str(e)}

def create_user_task(user_id: str, title: str, estimated_mins: int = 30) -> dict:
    """Create a new task for a user."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        from datetime import datetime
        now = datetime.utcnow()
        
        cur.execute(
            'INSERT INTO "Task" (id, "userId", title, status, "estimatedMins", "entropyScore", "createdAt", "updatedAt", deadline) '
            'VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id',
            (user_id, title, 'PENDING', estimated_mins, 0.0, now, now, now)
        )
        task_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return {"taskId": task_id, "status": "created"}
    except Exception as e:
        return {"error": str(e)}
