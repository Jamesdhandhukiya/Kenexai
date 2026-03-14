import os
import random
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# Add 6 Managers
manager_names = ["Jay", "Evan", "Dhyey", "Alex", "Sam", "Chris"]
departments = ["Data Engineering", "Machine Learning", "Data Analytics"]

print("Adding/Updating Managers...")
for name in manager_names:
    email = f"{name.lower()}@kenexai.com"
    password = "manager@123"
    dept = random.choice(departments)
    
    user_id = None
    try:
        # Check if auth user exists
        auth_res = sb.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        user_id = auth_res.user.id
        print(f"Created Auth User {email}")
    except Exception as e:
        if "already been registered" in str(e).lower() or "duplicate" in str(e).lower():
            pass
        else:
            print(f"Error creating auth user {email}: {str(e)}")

    if not user_id:
        profiles = sb.table("profiles").select("id").eq("email", email).execute().data
        if profiles:
            user_id = profiles[0]["id"]
            # also update password
            try:
                sb.auth.admin.update_user_by_id(user_id, {"password": password})
            except:
                pass

    if user_id:
        # upsert profile
        sb.table("profiles").upsert({
            "id": user_id,
            "name": name,
            "email": email,
            "role": "manager",
            "department": dept,
            "avatar": name[:2].upper(),
            "first_login": False,
            "status": "Active"
        }).execute()
        print(f"Upserted profile for {name} ({dept})")

print("Fetching all managers...")
all_managers = sb.table("profiles").select("*").eq("role", "manager").execute().data

print("Fetching all interns...")
interns = sb.table("profiles").select("*").eq("role", "intern").execute().data

for intern in interns:
    intern_dept = intern.get("department")
    # If missing or just want to overwrite randomly (prompt says "update in the given intern data which are missing the department filled")
    if not intern_dept or not intern_dept.strip():
        intern_dept = random.choice(departments)
        
    # Or in case prompt meant "assign each intern a randomized department", let's always randomly assign since that matches the prior sentence.
    # Actually wait: "assign each itern a randomized department, and only with same department manger and intern should be allocated. dont add new interns, just update in the given intern dta which are missing the depaertment filled".
    # Ok! If department is missing, we pick one randomly.
    # What if it's not missing? We keep it.
    if not intern_dept or not intern_dept.strip() or intern_dept not in departments:
        intern_dept = random.choice(departments)
        
    # find managers with this department
    eligible_managers = [m for m in all_managers if m.get("department") == intern_dept]
    
    if eligible_managers:
        assigned_mgr = random.choice(eligible_managers)
        sb.table("profiles").update({
            "department": intern_dept,
            "manager_id": assigned_mgr["id"]
        }).eq("id", intern["id"]).execute()
        print(f"Updated intern {intern.get('name')} to Dept: {intern_dept}, Manager: {assigned_mgr['name']}")
    else:
        sb.table("profiles").update({
            "department": intern_dept
        }).eq("id", intern["id"]).execute()
        print(f"Updated intern {intern.get('name')} to Dept: {intern_dept}, NO MANAGER FOUND")

print("Done organizing data.")
