from flask import Blueprint, request, jsonify
from data import sb_anon, sb_admin, MANAGERS, INTERNS

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    try:
        res = sb_anon.auth.sign_in_with_password({"email": email, "password": password})
        user_id = res.user.id
        
        profile = sb_admin.table("profiles").select("*").eq("id", user_id).single().execute().data
        if not profile:
            return jsonify({"success": False, "message": "Profile not found"}), 404
        
        # Check first login
        first_login = profile.get("first_login", False)
        
        # Map to local ID for mock data consistency
        local_id = user_id
        
        # Determine assigned manager if intern
        assigned_manager = ""
        mgr_id = ""
        if profile["role"] == "intern":
            # Check if synced in local INTERNS
            local_intern = next((i for i in INTERNS if i["email"] == email), None)
            if local_intern:
                mgr_id = local_intern.get("manager_id", "")
                assigned_manager = local_intern.get("assigned_manager", "")

        return jsonify({
            "success": True,
            "user": {
                "id": user_id,
                "local_id": local_id,
                "email": email,
                "role": profile["role"],
                "name": profile["name"],
                "first_login": first_login,
                "assigned_manager": assigned_manager,
                "manager_id": mgr_id
            }
        })
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

@auth_bp.route('/update-password', methods=['POST'])
def update_password_route():
    data = request.json
    user_id = data.get('user_id')
    new_password = data.get('new_password')
    try:
        sb_admin.auth.admin.update_user_by_id(user_id, {"password": new_password})
        sb_admin.table("profiles").update({"first_login": False}).eq("id", user_id).execute()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

@auth_bp.route('/change-password', methods=['POST'])
def change_password_route():
    data = request.json
    user_id = data.get('user_id')
    new_password = data.get('new_password')
    try:
        sb_admin.auth.admin.update_user_by_id(user_id, {"password": new_password})
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400
