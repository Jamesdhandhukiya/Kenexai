from flask import Blueprint, request, jsonify
from data import INTERNS, TASKS, LOGS, sb_admin
from datetime import datetime
import random

intern_bp = Blueprint('intern', __name__)

@intern_bp.route('/intern/tasks/<id>', methods=['GET'])
def intern_tasks(id):
    # Fetch profile to get email
    profile_res = sb_admin.table("profiles").select("email").eq("id", id).execute()
    if not profile_res.data:
        return jsonify([])
    
    email = profile_res.data[0]["email"]
    tasks_res = sb_admin.table("silver_tasks").select("*").eq("email", email).execute()
    
    mapped_tasks = []
    for row in tasks_res.data:
        hw = row.get("hours_actual") or 0
        he = row.get("hours_estimated") or 1
        he = he if he > 0 else 1
        progress = int((hw / he) * 100) if row.get("task_status") != "Completed" else 100
        
        mapped_tasks.append({
            "id": row.get("task_id"),
            "title": row.get("task_name"),
            "status": row.get("task_status", "Pending"),
            "priority": row.get("priority", "Medium"),
            "progress": min(100, max(0, progress)),
            "deadline": row.get("deadline", "")
        })
    return jsonify(mapped_tasks)

@intern_bp.route('/intern/tasks/<task_id>/progress', methods=['PUT'])
def update_task_progress(task_id):
    data = request.json
    prog = data.get("progress", 0)
    status = data.get("status")
    
    # Fetch task to get hours_estimated
    task_res = sb_admin.table("silver_tasks").select("*").eq("task_id", task_id).execute()
    if not task_res.data:
        return jsonify({"error": "Task not found"}), 404
        
    row = task_res.data[0]
    he = row.get("hours_estimated") or 10
    
    update_data = {}
    
    if status:
        update_data["task_status"] = status
        # Update hours based on status if needed
        if status in ["Completed", "Approved"]:
            update_data["hours_actual"] = he
        elif status == "Pending":
            update_data["hours_actual"] = 0
            
    if prog == 100 and "task_status" not in update_data:
        update_data["task_status"] = "Completed"
        update_data["hours_actual"] = he
    elif prog > 0 and "hours_actual" not in update_data:
        update_data["hours_actual"] = int(he * (prog / 100))
        if "task_status" not in update_data:
            update_data["task_status"] = "In Progress"
            
    up_res = sb_admin.table("silver_tasks").update(update_data).eq("task_id", task_id).execute()
    if up_res.data:
        updated_row = up_res.data[0]
        hw = updated_row.get("hours_actual") or 0
        current_status = updated_row.get("task_status", "Pending")
        # Final progress calc
        progress = int((hw / he) * 100) if current_status not in ["Completed", "Approved"] else 100
        
        return jsonify({
            "id": updated_row.get("task_id"),
            "title": updated_row.get("task_name"),
            "status": current_status,
            "priority": updated_row.get("priority", "Medium"),
            "progress": min(100, max(0, progress)),
            "deadline": updated_row.get("deadline", "")
        })
    return jsonify({"error": "Failed to update"}), 500

@intern_bp.route('/intern/activity/<id>', methods=['GET'])
def intern_activity_get(id):
    return jsonify([l for l in LOGS if str(l.get("intern_id")) == str(id)])

@intern_bp.route('/intern/activity', methods=['POST'])
def intern_activity_post():
    data = request.json
    new_log = {
        "id": len(LOGS) + 1,
        "intern_id": data.get("intern_id"),
        "hours": data.get("hours"),
        "task_worked": data.get("task_worked"),
        "description": data.get("description"),
        "blockers": data.get("blockers"),
        "date": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    LOGS.append(new_log)
    return jsonify(new_log)

@intern_bp.route('/intern/productivity/<id>', methods=['GET'])
def intern_productivity(id):
    return jsonify({
        "overall": 87,
        "rank": 4,
        "totalInterns": len(INTERNS),
        "totalTasks": 8,
        "completedTasks": 5,
        "inProgressTasks": 2,
        "avgProgress": 65,
        "onTimeRate": 92,
        "qualityScore": 88,
        "consistency": 85,
        "weekly": [{"day": d, "score": random.randint(80, 95)} for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]]
    })

@intern_bp.route('/intern/growth/<id>', methods=['GET'])
def intern_growth(id):
    return jsonify({
        "totalHoursLearned": 124,
        "coursesCompleted": 6,
        "certificationsEarned": 2,
        "currentSkills": {"Python": 85, "SQL": 92, "Machine Learning": 74, "Data Viz": 68},
        "growthChart": [{"week": f"W{i}", "Python": 60+i*5, "SQL": 70+i*4, "ML": 40+i*6} for i in range(1, 6)],
        "milestones": [
            {"title": "Advanced SQL Cert", "status": "completed", "date": "2026-03-01"},
            {"title": "PySpark Masterclass", "status": "in-progress", "progress": 65},
            {"title": "MLOps Fundamentals", "status": "upcoming", "date": "2026-04-01"}
        ]
    })

@intern_bp.route('/intern/recommendations/<id>', methods=['GET'])
def intern_recs(id):
    return jsonify({
        "weeklyGoal": "Improve SQL query performance by 20% using window functions.",
        "skillRecommendations": [
            {"skill": "Machine Learning", "currentLevel": 74, "targetLevel": 85, "priority": "High", "suggestion": "Take the 'Scalable ML with Spark' course."},
            {"skill": "Data Visualization", "currentLevel": 68, "targetLevel": 80, "priority": "Medium", "suggestion": "Try building a Tableau dashboard for the sales dataset."}
        ],
        "taskRecommendations": [
            {"title": "Optimize ETL Pipeline", "impact": "High", "reason": "Will improve data processing speed for the whole team."},
            {"title": "Unit Test Coverage", "impact": "Medium", "reason": "Ensure stability of the new API integration."}
        ],
        "courseRecommendations": [
            {"name": "Complete Python for Data Science", "provider": "Coursera", "duration": "12h", "relevance": 95},
            {"name": "Advanced PostgreSQL", "provider": "Udemy", "duration": "8h", "relevance": 88}
        ],
        "strengths": [
            {"skill": "Python Coding", "score": 92},
            {"skill": "Team Collaboration", "score": 88}
        ]
    })
