import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

try:
    res = sb.table("silver_tasks").select("*").limit(1).execute()
    with open("task_schema.json", "w", encoding="utf-8") as f:
        json.dump(res.data, f, indent=2)
except Exception as e:
    with open("task_schema.json", "w", encoding="utf-8") as f:
        f.write(str(e))
