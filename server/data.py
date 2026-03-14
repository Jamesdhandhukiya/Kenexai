import os, string, random
from dotenv import load_dotenv
from supabase import create_client

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Supabase clients
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

sb_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
sb_anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def gen_temp_password(length=10):
    chars = string.ascii_letters + string.digits + "!@#$"
    return ''.join(random.choices(chars, k=length))

# ================================================
# MOCK DATA
# ================================================

USERS = {}
MANAGERS = []
INTERNS = []
TASKS = []
ALERTS = []
LOGS = []
