from flask import Flask, jsonify
from flask_cors import CORS
import os
from data import MANAGERS, INTERNS, sb_admin
from routes.recommendations import recommendations_bp
from routes.tests import tests_bp

# Import Blueprints
from auth import auth_bp
from hr_dashboard import hr_bp
from manager_dashboard import manager_bp
from intern_dashboard import intern_bp

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=True
)

@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    return response
# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(hr_bp, url_prefix='/api')
app.register_blueprint(manager_bp, url_prefix='/api')
app.register_blueprint(intern_bp, url_prefix='/api')
app.register_blueprint(recommendations_bp, url_prefix='/api')
app.register_blueprint(tests_bp, url_prefix='/api')
# ================================================
# INITIAL SYNC
# ================================================

def sync_supabase():
    try:
        print("Syncing Supabase users to local lists...")
        
        # Clear existing lists to ensure we don't duplicate on manual sync
        MANAGERS.clear()
        INTERNS.clear()
        
        db_profiles = sb_admin.table("profiles").select("*").execute().data
        
        # 1. Add/Update Managers
        for p in db_profiles:
            if p["role"] == "manager":
                email = p["email"].lower().strip()
                if not any(m.get("email", "").lower().strip() == email for m in MANAGERS):
                    MANAGERS.append({
                        "id": str(p["id"]),
                        "name": p["name"],
                        "email": p["email"],
                        "department": p.get("department", "Data Engineering"),
                        "status": p.get("status", "Active"),
                        "joined": p.get("created_at", "2026-03-14")[:10],
                        "internsManaged": 0,
                        "avatar": p.get("avatar", ""),
                    })
        
        # 2. Add/Update Interns
        for p in db_profiles:
            if p["role"] == "intern":
                email = p["email"].lower().strip()
                existing = next((i for i in INTERNS if i.get("email", "").lower().strip() == email), None)
                if not existing:
                    INTERNS.append({
                        "id": str(p["id"]),
                        "name": p["name"],
                        "email": p["email"],
                        "department": p.get("department", "Data Engineering"),
                        "score": p.get("score", 0),
                        "status": p.get("status", "Active"),
                        "joined": p.get("created_at", "2026-03-14")[:10],
                        "avatar": p.get("avatar", ""),
                        "manager_id": str(p.get("manager_id", "")) if p.get("manager_id") else "",
                        "assigned_manager": ""
                    })
                else:
                    existing["manager_id"] = str(p.get("manager_id", "")) if p.get("manager_id") else existing.get("manager_id", "")
        
        # 3. Linking Pass
        for i in INTERNS:
            if i.get("manager_id"):
                mgr = next((m for m in MANAGERS if str(m["id"]) == str(i["manager_id"])), None)
                if mgr:
                    i["assigned_manager"] = mgr["name"]
        
        # 4. update internsManaged counts
        for m in MANAGERS:
            count = len([i for i in INTERNS if str(i.get("manager_id")) == str(m["id"])])
            m["internsManaged"] = count
            
        print(f"Sync complete: {len(MANAGERS)} managers, {len(INTERNS)} interns.")
    except Exception as e:
        print(f"Sync failed: {str(e)}")

# Perform sync on startup
with app.app_context():
    sync_supabase()

@app.route('/api/sync', methods=['POST'])
def manual_sync():
    sync_supabase()
    return jsonify({"success": True, "message": "Manual sync completed", "internsCount": len(INTERNS), "managersCount": len(MANAGERS)})

@app.route('/')
def index():
    return jsonify({"status": "KenexAI Backend Running", "version": "2.0 (Modular)"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
