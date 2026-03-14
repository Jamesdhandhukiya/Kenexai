from flask import Flask, jsonify
from flask_cors import CORS
import os
from data import MANAGERS, INTERNS, sb_admin

# Import Blueprints
from auth import auth_bp
from hr_dashboard import hr_bp
from manager_dashboard import manager_bp
from intern_dashboard import intern_bp

app = Flask(__name__)
CORS(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(hr_bp, url_prefix='/api')
app.register_blueprint(manager_bp, url_prefix='/api')
app.register_blueprint(intern_bp, url_prefix='/api')

# ================================================
# INITIAL SYNC
# ================================================

def sync_supabase():
    try:
        print("Syncing Supabase users to local lists...")
        db_profiles = sb_admin.table("profiles").select("*").execute().data
        for p in db_profiles:
            email = p["email"]
            if p["role"] == "manager" and not any(m.get("email") == email for m in MANAGERS):
                MANAGERS.append({
                    "id": str(p["id"]),
                    "name": p["name"],
                    "email": email,
                    "department": p.get("department", "Data Engineering"),
                    "status": p.get("status", "Active"),
                    "joined": p.get("created_at", "2026-03-14")[:10],
                    "internsManaged": 0,
                    "avatar": p.get("avatar", ""),
                })
            elif p["role"] == "intern" and not any(i.get("email") == email for i in INTERNS):
                # Try to find if this intern belongs to a manager in local data
                INTERNS.append({
                    "id": str(p["id"]),
                    "name": p["name"],
                    "email": email,
                    "department": p.get("department", "Data Engineering"),
                    "score": 0,
                    "status": p.get("status", "Active"),
                    "joined": p.get("created_at", "2026-03-14")[:10],
                    "avatar": p.get("avatar", ""),
                    "manager_id": "",
                    "assigned_manager": ""
                })
        
        # After sync, update internsManaged counts
        for m in MANAGERS:
            count = len([i for i in INTERNS if str(i.get("manager_id")) == str(m["id"])])
            m["internsManaged"] = count
            
        print(f"Sync complete: {len(MANAGERS)} managers, {len(INTERNS)} interns.")
    except Exception as e:
        print(f"Sync failed: {str(e)}")

# Perform sync on startup
with app.app_context():
    sync_supabase()

@app.route('/')
def index():
    return jsonify({"status": "KenexAI Backend Running", "version": "2.0 (Modular)"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
