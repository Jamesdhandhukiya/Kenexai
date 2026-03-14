from flask import Blueprint, request, jsonify
from data import MANAGERS, INTERNS, TASKS, ALERTS, LOGS, sb_admin
import random
import uuid
import datetime

def get_manager_interns():
    manager_id = request.args.get('manager_id')
    if not manager_id or manager_id == 'undefined':
        return []
    return [i for i in INTERNS if str(i.get("manager_id")) == str(manager_id)]

manager_bp = Blueprint('manager', __name__)

@manager_bp.route('/manager/overview', methods=['GET'])
def manager_overview():
    my_interns = get_manager_interns()
    my_interns_emails = [i["email"] for i in my_interns]
    
    # Fetch tasks from Supabase
    my_tasks = sb_admin.table("silver_tasks").select("*").in_("email", my_interns_emails).execute().data if my_interns_emails else []
    
    total_tasks = len(my_tasks)
    completed = len([t for t in my_tasks if t["task_status"] == "Completed"])
    in_progress = len([t for t in my_tasks if t["task_status"] == "In Progress"])
    pending = len([t for t in my_tasks if t["task_status"] == "Pending"])
    
    trend = [{"day": d, "score": random.randint(70, 95)} for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]]
    
    # Dynamic department breakdown
    dept_counts = {}
    dept_scores = {}
    for i in my_interns:
        d = i.get("department", "Other")
        dept_counts[d] = dept_counts.get(d, 0) + 1
        if d not in dept_scores: dept_scores[d] = []
        dept_scores[d].append(i.get("score", 0))
    
    deps = []
    for d in dept_counts:
        scores = dept_scores.get(d, [])
        avg = int(sum(scores) / len(scores)) if scores else 0
        deps.append({
            "name": d,
            "interns": dept_counts[d],
            "avgScore": avg
        })

    my_intern_names = [i["name"] for i in my_interns]
    unread_alerts = len([a for a in ALERTS if (not a.get("intern") or a.get("intern") in my_intern_names) and not a.get("read")])
    
    overall_avg = 0
    if my_interns:
        all_scores = [i.get("score", 0) for i in my_interns]
        overall_avg = int(sum(all_scores) / len(all_scores))

    return jsonify({
        "totalInterns": len(my_interns),
        "activeInterns": len([i for i in my_interns if i["status"] == "Active"]),
        "avgScore": overall_avg,
        "completionRate": int((completed / total_tasks * 100)) if total_tasks > 0 else 0,
        "totalTasks": total_tasks,
        "completedTasks": completed,
        "inProgressTasks": in_progress,
        "pendingTasks": pending,
        "unreadAlerts": unread_alerts,
        "perfTrend": trend,
        "departments": deps
    })

@manager_bp.route('/manager/interns', methods=['GET'])
def manager_interns():
    return jsonify(get_manager_interns())

@manager_bp.route('/manager/tasks', methods=['GET', 'POST'])
def manager_tasks():
    my_interns = get_manager_interns()
    my_interns_map = {i["email"]: i["name"] for i in my_interns} # Map email -> name
    my_interns_emails = list(my_interns_map.keys())
    
    if request.method == 'POST':
        data = request.json
        assignee_name = data.get("assignee")
        assignee_email = next((e for e, n in my_interns_map.items() if n == assignee_name), "")
        
        # Insert into silver_tasks
        new_row = {
            "task_id": "T" + str(uuid.uuid4())[:8],
            "email": assignee_email,
            "task_name": data.get("title", ""),
            "priority": data.get("priority", "Medium"),
            "assigned_date": datetime.datetime.now().strftime("%Y-%m-%d"),
            "deadline": data.get("deadline", ""),
            "hours_estimated": 10,  # Default val
            "hours_actual": 0,
            "task_status": "Pending",
            "task_flag": "Assigned"
        }
        sb_admin.table("silver_tasks").insert(new_row).execute()
        
        new_task = {
            "id": new_row["task_id"],
            "title": new_row["task_name"],
            "assignee": assignee_name,
            "status": new_row["task_status"],
            "priority": new_row["priority"],
            "progress": 0,
            "deadline": new_row["deadline"]
        }
        return jsonify(new_task)
        
    # GET method
    tasks_res = sb_admin.table("silver_tasks").select("*").in_("email", my_interns_emails).execute().data if my_interns_emails else []
    
    mapped_tasks = []
    for row in tasks_res:
        hw = row.get("hours_actual") or 0
        he = row.get("hours_estimated") or 1
        he = he if he > 0 else 1
        progress = int((hw / he) * 100) if row.get("task_status") != "Completed" else 100
        
        mapped_tasks.append({
            "id": row.get("task_id"),
            "title": row.get("task_name"),
            "assignee": my_interns_map.get(row.get("email"), ""),
            "status": row.get("task_status", "Pending"),
            "priority": row.get("priority", "Medium"),
            "progress": min(100, max(0, progress)),
            "deadline": row.get("deadline", "")
        })
        
    return jsonify(mapped_tasks)

@manager_bp.route('/manager/comparison', methods=['GET'])
def manager_comparison():
    my_interns = get_manager_interns()
    data = []
    for i in my_interns[:5]:
        data.append({
            "id": i["id"],
            "name": i["name"],
            "department": i["department"],
            "overallScore": i["score"],
            "tasksCompleted": random.randint(5, 15),
            "streak": random.randint(2, 10),
            "skills": {
                "Python": random.randint(60, 100),
                "SQL": random.randint(60, 100),
                "ML": random.randint(40, 90),
                "Cloud": random.randint(30, 80),
                "Comm": random.randint(70, 100)
            }
        })
    return jsonify(data)

@manager_bp.route('/manager/analytics', methods=['GET'])
def manager_analytics():
    my_interns = get_manager_interns()
    top_performers = sorted(my_interns, key=lambda x: x.get("score", 0), reverse=True)[:2]
    return jsonify({
        "monthly": [{"month": m, "avgScore": random.randint(75, 90), "tasksCompleted": random.randint(20, 40)} for m in ["Jan", "Feb", "Mar"]],
        "skills": [{"skill": "Python", "avg": 82}, {"skill": "SQL", "avg": 78}, {"skill": "ML", "avg": 65}, {"skill": "Data Viz", "avg": 88}],
        "topPerformers": [
            {"id": p.get("id"), "name": p.get("name"), "department": p.get("department"), "score": p.get("score", 0)} for p in top_performers
        ]
    })

@manager_bp.route('/manager/alerts', methods=['GET'])
def manager_alerts():
    my_interns_names = [i["name"] for i in get_manager_interns()]
    return jsonify([a for a in ALERTS if not a.get("intern") or a.get("intern") in my_interns_names])

@manager_bp.route('/manager/predictions', methods=['GET'])
def manager_predictions():
    my_interns = get_manager_interns()
    data = []
    for i in my_interns:
        score = i.get("score", 0)
        trend = "up" if random.choice([True, False]) else "down"
        risk = "High" if score < 60 else "Medium" if score < 80 else "Low"
        data.append({
            "id": i["id"],
            "name": i["name"],
            "currentScore": score,
            "predictedScore": min(100, score + random.randint(-5, 10)),
            "trend": trend,
            "riskLevel": risk,
            "recommendation": "Mentorship session recommended." if risk == "High" else "On track."
        })
    return jsonify(data)

@manager_bp.route('/manager/chat', methods=['POST'])
def manager_chat():
    my_interns = get_manager_interns()
    my_tasks = [] # We could filter TASKS but since we migrated tasks to silver_tasks, let's keep it simple
    msg = request.json.get("message", "").lower()
    reply = "I'm analyzing that for you. Based on the data, your team is performing 5% better than last month."
    
    for i in my_interns:
        if i["name"].lower().split()[0] in msg:
            reply = f"{i['name']} has a productivity score of {i.get('score', 0)}% and their status is {i.get('status', 'Active')}."
            break
            
    if "task" in msg:
        reply = "I have fetched your intern tasks successfully."
        
    return jsonify({"reply": reply})

@manager_bp.route('/manager/daily-summary', methods=['GET'])
def manager_daily():
    my_interns = get_manager_interns()
    highlights = []
    if my_interns:
        highlights.append(f"{my_interns[0]['name']} is showing great progress!")
        if len(my_interns) > 1:
            highlights.append(f"Team collaboration in {my_interns[0].get('department')} is high.")
    else:
        highlights.append("No active interns to display.")

    return jsonify({
        "date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "completedToday": random.randint(1, 5) if my_interns else 0,
        "newTasks": random.randint(0, 3) if my_interns else 0,
        "teamHoursLogged": len(my_interns) * 8,
        "overallMood": "Productive" if my_interns else "Quiet",
        "highlights": highlights,
        "concerns": ["Please review pending tasks."] if my_interns else ["No interns assigned."],
        "upcoming": []
    })

@manager_bp.route('/manager/export/<type>', methods=['GET'])
def manager_export(type):
    my_interns = get_manager_interns()
    my_interns_names = [i["name"] for i in my_interns]
    
    data_map = {
        "interns": my_interns, 
        "tasks": [], 
        "alerts": [a for a in ALERTS if not a.get("intern") or a.get("intern") in my_interns_names]
    }
    return jsonify({"filename": f"{type}_export.csv", "data": data_map.get(type, [])})
