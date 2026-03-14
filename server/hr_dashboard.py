from flask import Blueprint, request, jsonify
from data import MANAGERS, INTERNS, TASKS, sb_admin, gen_temp_password

hr_bp = Blueprint('hr', __name__)

@hr_bp.route('/hr/overview', methods=['GET'])
def hr_overview():
    deps = ["Data Engineering", "Machine Learning", "Data Analytics"]
    dept_stats = []
    for d in deps:
        d_interns = [i for i in INTERNS if i["department"] == d]
        d_managers = [m for m in MANAGERS if m["department"] == d]
        avg = sum(i["score"] for i in d_interns) / len(d_interns) if d_interns else 0
        dept_stats.append({"name": d, "interns": len(d_interns), "managers": len(d_managers), "avgScore": int(avg)})
    
    return jsonify({
        "totalUsers": len(INTERNS) + len(MANAGERS) + 1,
        "totalInterns": len(INTERNS),
        "totalManagers": len(MANAGERS),
        "activeInterns": len([i for i in INTERNS if i["status"] == "Active"]),
        "warningInterns": len([i for i in INTERNS if i["status"] == "Warning"]),
        "avgScore": int(sum(i["score"] for i in INTERNS) / len(INTERNS)) if INTERNS else 0,
        "totalTasks": len(TASKS),
        "completedTasks": len([t for t in TASKS if t["status"] == "Completed"]),
        "pendingTasks": len([t for t in TASKS if t["status"] == "Pending"]),
        "departments": dept_stats,
        "roleDistribution": [
            {"name": "Interns", "value": len(INTERNS)},
            {"name": "Managers", "value": len(MANAGERS)},
            {"name": "HR", "value": 1}
        ]
    })

@hr_bp.route('/hr/interns', methods=['GET', 'POST'])
def hr_interns():
    if request.method == 'POST':
        data = request.json
        name = data.get('name')
        email = data.get('email')
        dept = data.get('department')
        manager_id = data.get('manager_id')
        
        # Check if email exists
        res = sb_admin.table("profiles").select("id").eq("email", email).execute()
        if res.data:
            return jsonify({"success": False, "message": "Email already exists"}), 400

        temp_pass = "intern@123"
        try:
            # Create Supabase Auth user
            auth_res = sb_admin.auth.admin.create_user({
                "email": email,
                "password": temp_pass,
                "email_confirm": True
            })
            user_id = auth_res.user.id
            
            # Create profile
            words = name.split()
            avatar = words[0][0].upper() + words[1][0].upper() if len(words) > 1 else (words[0][0].upper() if words else "")
            
            sb_admin.table("profiles").insert({
                "id": user_id,
                "name": name,
                "email": email,
                "role": "intern",
                "department": dept,
                "avatar": avatar,
                "first_login": False,
                "manager_id": str(manager_id) if manager_id else None
            }).execute()
            
            # Find manager name
            mgr_name = ""
            if manager_id:
                mgr = next((m for m in MANAGERS if str(m["id"]) == str(manager_id)), None)
                if mgr:
                    mgr_name = mgr["name"]
                    mgr["internsManaged"] = int(mgr.get("internsManaged", 0)) + 1

            new_intern = {
                "id": user_id,
                "name": name,
                "email": email,
                "department": dept,
                "score": 0,
                "status": "Active",
                "joined": "2026-03-14",
                "avatar": avatar,
                "manager_id": str(manager_id) if manager_id else "",
                "assigned_manager": mgr_name
            }
            INTERNS.append(new_intern)
            return jsonify({"success": True, "intern": new_intern, "temp_password": temp_pass, "email": email})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500
            
    return jsonify(INTERNS)

@hr_bp.route('/hr/interns/<id>', methods=['DELETE'])
def delete_intern(id):
    global INTERNS
    # Unassign from manager
    intern = next((i for i in INTERNS if str(i["id"]) == str(id)), None)
    if intern and intern.get("manager_id"):
        mgr = next((m for m in MANAGERS if str(m["id"]) == str(intern["manager_id"])), None)
        if mgr:
            mgr["internsManaged"] = max(0, int(mgr.get("internsManaged", 0)) - 1)
            
    # Remove from Supabase
    try:
        sb_admin.table("profiles").delete().eq("id", id).execute()
        sb_admin.auth.admin.delete_user(id)
    except:
        pass
    # Note: mutating a global list imported from data.py requires accessing the list itself
    # But since we imported the object, modification (pop/remove) works. 
    # To reassign, we need a helper or just remove by identity.
    idx = -1
    for i, item in enumerate(INTERNS):
        if str(item["id"]) == str(id):
            idx = i
            break
    if idx != -1: INTERNS.pop(idx)
    
    return jsonify({"success": True})

@hr_bp.route('/hr/interns/<id>', methods=['PUT'])
def update_intern(id):
    data = request.json
    name = data.get('name')
    dept = data.get('department')
    manager_id = data.get('manager_id')
    
    intern = next((i for i in INTERNS if str(i["id"]) == str(id)), None)
    if not intern:
        return jsonify({"success": False, "message": "Intern not found"}), 404
    
    sb_admin.table("profiles").update({
        "name": name, 
        "department": dept, 
        "manager_id": str(manager_id) if manager_id else None
    }).eq("id", id).execute()
    
    old_mgr_id = intern.get("manager_id")
    if str(old_mgr_id) != str(manager_id):
        if old_mgr_id:
            old_mgr = next((m for m in MANAGERS if str(m["id"]) == str(old_mgr_id)), None)
            if old_mgr: old_mgr["internsManaged"] = max(0, int(old_mgr.get("internsManaged", 0)) - 1)
        
        mgr_name = ""
        if manager_id:
            new_mgr = next((m for m in MANAGERS if str(m["id"]) == str(manager_id)), None)
            if new_mgr:
                new_mgr["internsManaged"] = int(new_mgr.get("internsManaged", 0)) + 1
                mgr_name = new_mgr["name"]
        intern["manager_id"] = str(manager_id) if manager_id else ""
        intern["assigned_manager"] = mgr_name

    intern["name"] = name
    intern["department"] = dept
    return jsonify({"success": True, "intern": intern})

@hr_bp.route('/hr/managers', methods=['GET', 'POST'])
def hr_managers():
    if request.method == 'POST':
        data = request.json
        name = data.get('name')
        email = data.get('email')
        dept = data.get('department')
        
        # Check if email exists
        res = sb_admin.table("profiles").select("id").eq("email", email).execute()
        if res.data:
            return jsonify({"success": False, "message": "Email already exists"}), 400

        temp_pass = "intern@123"
        try:
            auth_res = sb_admin.auth.admin.create_user({
                "email": email,
                "password": temp_pass,
                "email_confirm": True
            })
            user_id = auth_res.user.id
            
            words = name.split()
            avatar = words[0][0].upper() + words[1][0].upper() if len(words) > 1 else (words[0][0].upper() if words else "")
            
            sb_admin.table("profiles").insert({
                "id": user_id,
                "name": name,
                "email": email,
                "role": "manager",
                "department": dept,
                "avatar": avatar,
                "first_login": False
            }).execute()
            
            new_mgr = {
                "id": user_id,
                "name": name,
                "email": email,
                "department": dept,
                "status": "Active",
                "joined": "2026-03-14",
                "internsManaged": 0,
                "avatar": avatar
            }
            MANAGERS.append(new_mgr)
            return jsonify({"success": True, "manager": new_mgr, "temp_password": temp_pass, "email": email})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500
            
    return jsonify(MANAGERS)

@hr_bp.route('/hr/managers/<id>', methods=['DELETE'])
def delete_manager(id):
    # Unassign interns
    for intern in INTERNS:
        if str(intern.get("manager_id")) == str(id):
            intern["manager_id"] = ""
            intern["assigned_manager"] = ""
            
    # Remove from Supabase
    try:
        sb_admin.table("profiles").delete().eq("id", id).execute()
        sb_admin.auth.admin.delete_user(id)
    except:
        pass
        
    idx = -1
    for i, item in enumerate(MANAGERS):
        if str(item["id"]) == str(id):
            idx = i
            break
    if idx != -1: MANAGERS.pop(idx)
    
    return jsonify({"success": True})

@hr_bp.route('/hr/managers/<id>', methods=['PUT'])
def update_manager(id):
    data = request.json
    name = data.get('name')
    dept = data.get('department')
    
    manager = next((m for m in MANAGERS if str(m["id"]) == str(id)), None)
    if not manager:
        return jsonify({"success": False, "message": "Manager not found"}), 404
    
    sb_admin.table("profiles").update({"name": name, "department": dept}).eq("id", id).execute()
    manager["name"] = name
    manager["department"] = dept
    
    for i in INTERNS:
        if str(i.get("manager_id")) == str(id):
            i["assigned_manager"] = name
            
    return jsonify({"success": True, "manager": manager})
