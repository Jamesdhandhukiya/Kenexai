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

USERS = {
    "intern": {"password": "123", "role": "intern", "name": "Alex Johnson"},
    "manager": {"password": "123", "role": "manager", "name": "Sarah Chen"},
    "hr": {"password": "123", "role": "hr", "name": "James Thakkar"},
}

MANAGERS = [
    {"id": "1", "name": "Sarah Chen", "email": "sarah@kenexai.com", "department": "Data Engineering", "status": "Active", "joined": "2025-09-01", "internsManaged": 3, "avatar": "SC"},
    {"id": "2", "name": "David Kim", "email": "david@kenexai.com", "department": "Machine Learning", "status": "Active", "joined": "2025-08-15", "internsManaged": 2, "avatar": "DK"},
    {"id": "3", "name": "Lisa Wang", "email": "lisa@kenexai.com", "department": "Data Analytics", "status": "Active", "joined": "2025-10-01", "internsManaged": 1, "avatar": "LW"},
]

INTERNS = [
    {"id": "1", "name": "Alex Johnson", "email": "alex@kenexai.com", "department": "Data Engineering", "score": 87, "status": "Active", "joined": "2026-01-15", "avatar": "AJ", "manager_id": "1", "assigned_manager": "Sarah Chen"},
    {"id": "2", "name": "Priya Sharma", "email": "priya@kenexai.com", "department": "Machine Learning", "score": 92, "status": "Active", "joined": "2026-01-20", "avatar": "PS", "manager_id": "1", "assigned_manager": "Sarah Chen"},
    {"id": "3", "name": "Marcus Lee", "email": "marcus@kenexai.com", "department": "Data Analytics", "score": 74, "status": "Active", "joined": "2026-02-01", "avatar": "ML", "manager_id": "2", "assigned_manager": "David Kim"},
    {"id": "4", "name": "Emily Davis", "email": "emily@kenexai.com", "department": "Data Engineering", "score": 68, "status": "Warning", "joined": "2026-02-10", "avatar": "ED", "manager_id": "2", "assigned_manager": "David Kim"},
    {"id": "5", "name": "Raj Patel", "email": "raj@kenexai.com", "department": "Machine Learning", "score": 95, "status": "Active", "joined": "2026-01-25", "avatar": "RP", "manager_id": "1", "assigned_manager": "Sarah Chen"},
    {"id": "6", "name": "Sofia Martinez", "email": "sofia@kenexai.com", "department": "Data Analytics", "score": 81, "status": "Active", "joined": "2026-02-05", "avatar": "SM", "manager_id": "3", "assigned_manager": "Lisa Wang"},
]

TASKS = [
    {"id": 1, "title": "ETL Pipeline Development", "assignee": "Alex Johnson", "assignee_id": "1", "status": "In Progress", "priority": "High", "deadline": "2026-03-16", "progress": 65},
    {"id": 2, "title": "SQL Data Cleaning Script", "assignee": "Priya Sharma", "assignee_id": "2", "status": "Completed", "priority": "Medium", "deadline": "2026-03-12", "progress": 100},
    {"id": 3, "title": "ML Model Training - v2", "assignee": "Raj Patel", "assignee_id": "5", "status": "In Progress", "priority": "High", "deadline": "2026-03-18", "progress": 40},
    {"id": 4, "title": "Dashboard Visualization", "assignee": "Marcus Lee", "assignee_id": "3", "status": "Pending", "priority": "Low", "deadline": "2026-03-20", "progress": 0},
    {"id": 5, "title": "Data Quality Report", "assignee": "Emily Davis", "assignee_id": "4", "status": "In Progress", "priority": "Medium", "deadline": "2026-03-17", "progress": 30},
    {"id": 6, "title": "PySpark Migration", "assignee": "Sofia Martinez", "assignee_id": "6", "status": "Pending", "priority": "High", "deadline": "2026-03-22", "progress": 0},
    {"id": 7, "title": "API Integration Testing", "assignee": "Alex Johnson", "assignee_id": "1", "status": "Completed", "priority": "Medium", "deadline": "2026-03-10", "progress": 100},
    {"id": 8, "title": "Feature Engineering Pipeline", "assignee": "Priya Sharma", "assignee_id": "2", "status": "In Progress", "priority": "High", "deadline": "2026-03-19", "progress": 55},
]

ALERTS = [
    {"id": 1, "type": "warning", "message": "Emily Davis productivity dropped 15% this week", "intern": "Emily Davis", "timestamp": "2026-03-14 09:30", "read": False},
    {"id": 2, "type": "danger", "message": "Marcus Lee missed 2 consecutive deadlines", "intern": "Marcus Lee", "timestamp": "2026-03-14 08:15", "read": False},
    {"id": 3, "type": "info", "message": "Raj Patel completed ML certification", "intern": "Raj Patel", "timestamp": "2026-03-13 16:45", "read": True},
    {"id": 4, "type": "success", "message": "Priya Sharma exceeded weekly targets by 20%", "intern": "Priya Sharma", "timestamp": "2026-03-13 14:00", "read": True},
    {"id": 5, "type": "warning", "message": "3 tasks approaching deadline in next 48 hours", "intern": None, "timestamp": "2026-03-14 07:00", "read": False},
]

LOGS = []
