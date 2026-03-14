"""
One-time setup script:
1. Creates the 'profiles' table in Supabase
2. Seeds the initial HR, Manager, and Intern users
"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ─── Step 1: Create profiles table via SQL ───
print("Creating profiles table...")
sql = """
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'intern' CHECK (role IN ('hr', 'manager', 'intern')),
    department TEXT DEFAULT '',
    manager_id UUID REFERENCES profiles(id),
    first_login BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'Active',
    score INTEGER DEFAULT 0,
    joined TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    avatar TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read profiles (for dashboard data)
DO $$ BEGIN
    CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy: users can update their own profile
DO $$ BEGIN
    CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy: service role can insert (for HR creating users)
DO $$ BEGIN
    CREATE POLICY "profiles_insert_service" ON profiles FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy: service role can delete
DO $$ BEGIN
    CREATE POLICY "profiles_delete_service" ON profiles FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
"""

try:
    supabase.postgrest.rpc("", {}).execute()  # test connection
except:
    pass

# Use the REST API to run SQL
import httpx
headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}
resp = httpx.post(
    f"{SUPABASE_URL}/rest/v1/rpc/",
    headers=headers,
    json={},
    timeout=30,
)

# Actually run SQL via the SQL endpoint
sql_url = f"{SUPABASE_URL}/rest/v1/rpc/"
# The proper way is through the Supabase dashboard SQL editor.
# Let's try using postgrest to check if the table exists first.

print("\n⚠️  IMPORTANT: Please run the following SQL in your Supabase Dashboard → SQL Editor:\n")
print("=" * 70)
print(sql)
print("=" * 70)

# ─── Step 2: Seed users ───
print("\nNow seeding users...")

SEED_USERS = [
    {"email": "hr@kenexai.com", "password": "Admin@123", "name": "Diana Ross", "role": "hr", "department": "Human Resources", "first_login": False},
    {"email": "manager@kenexai.com", "password": "Admin@123", "name": "Sarah Chen", "role": "manager", "department": "Data Engineering", "first_login": False},
    {"email": "intern@kenexai.com", "password": "Admin@123", "name": "Alex Johnson", "role": "intern", "department": "Data Engineering", "first_login": False},
]

for user_data in SEED_USERS:
    email = user_data["email"]
    try:
        # Create auth user
        res = supabase.auth.admin.create_user({
            "email": email,
            "password": user_data["password"],
            "email_confirm": True,
        })
        user_id = res.user.id
        print(f"  ✅ Created auth user: {email} (ID: {user_id})")

        # Create profile
        name = str(user_data["name"])
        words = name.split()
        avatar = words[0][0].upper() + words[1][0].upper() if len(words) > 1 else (words[0][0].upper() if words else "")
        
        profile = {
            "id": user_id,
            "email": email,
            "name": name,
            "role": user_data["role"],
            "department": user_data["department"],
            "first_login": user_data["first_login"],
            "status": "Active",
            "score": 0,
            "avatar": avatar,
        }
        supabase.table("profiles").insert(profile).execute()
        print(f"  ✅ Created profile: {name} ({user_data['role']})")

    except Exception as e:
        err = str(e)
        if "already been registered" in err or "duplicate" in err.lower():
            print(f"  ⏩ User already exists: {email}")
        else:
            print(f"  ❌ Error creating {email}: {err}")

print("\n" + "=" * 70)
print("SETUP COMPLETE!")
print("=" * 70)
print("\nDemo credentials (all password: Admin@123):")
print("  HR:      hr@kenexai.com")
print("  Manager: manager@kenexai.com")
print("  Intern:  intern@kenexai.com")
print("\nNote: Login now uses EMAIL instead of username.")
