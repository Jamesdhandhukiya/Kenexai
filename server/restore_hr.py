import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

def restore_hr():
    email = "hr@kenexai.com"
    password = "Admin@123" # Must be at least 6 chars
    name = "James Thakkar"
    
    try:
        print(f"Searching for existing HR user: {email}")
        
        # 1. Get user ID from Auth list
        users = sb.auth.admin.list_users()
        user_id = None
        for user in users:
            if user.email == email:
                user_id = user.id
                break
        
        if not user_id:
            print("User not found in Auth. Creating...")
            auth_res = sb.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            user_id = auth_res.user.id
            print(f"Created Auth ID: {user_id}")
        else:
            print(f"Found existing Auth ID: {user_id}")
            # Reset password
            sb.auth.admin.update_user_by_id(user_id, {"password": password})
            print(f"Password reset to '{password}'")

        # 2. Re-create Profile
        print(f"Upserting profile for {name}...")
        sb.table("profiles").upsert({
            "id": user_id,
            "name": name,
            "email": email,
            "role": "hr",
            "department": "HR",
            "avatar": "JT",
            "first_login": False,
            "status": "Active"
        }).execute()

        print("\nSUCCESS! HR Account Restored.")
        print(f"Email: {email}")
        print(f"Password: {password}")
        
    except Exception as e:
        print(f"Restoration failed: {str(e)}")

if __name__ == "__main__":
    restore_hr()
