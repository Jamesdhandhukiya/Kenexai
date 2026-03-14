import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
res = sb.table("profiles").select("*").execute()
profiles = res.data
print(f"Profiles found: {len(profiles)}")
for p in profiles:
    print(f"  {p['name']} - {p['role']} - {p['email']} ({p['id']})")
